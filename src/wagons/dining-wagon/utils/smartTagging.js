// Extracted smart tagging utilities used by both ContactDetail and ActivityCenter

// Parse Swedish weekday references into date tags like "tisdag-YYYY-MM-DD"
export const parseSwedishWeekdays = (text) => {
  if (!text || typeof text !== 'string') return [];
  const weekdaysMap = {
    'måndag': 1, 'tisdag': 2, 'onsdag': 3, 'torsdag': 4,
    'fredag': 5, 'lördag': 6, 'söndag': 0
  };

  const lowerText = text.toLowerCase();
  const today = new Date();
  const currentDay = today.getDay();
  const dateTags = [];

  // Special case: "nästa vecka" defaults to next Tuesday
  if (lowerText.includes('nästa vecka') || lowerText.includes('nästa veck')) {
    const nextTuesday = new Date(today);
    const currentDayAdjusted = currentDay === 0 ? 7 : currentDay;
    const daysUntilNextTuesday = (7 - currentDayAdjusted) + 2; // 2 = Tuesday
    nextTuesday.setDate(today.getDate() + daysUntilNextTuesday);
    const dateStr = nextTuesday.toISOString().split('T')[0];
    const tagName = `tisdag-${dateStr}`;
    if (!dateTags.includes(tagName)) dateTags.push(tagName);
  }

  Object.entries(weekdaysMap).forEach(([weekdayName, weekdayNumOrig]) => {
    const patterns = [
      `på ${weekdayName}`,
      `i ${weekdayName}`,
      `${weekdayName}`,
      `nästa ${weekdayName}`,
      `kommande ${weekdayName}`
    ];

    patterns.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        let weekdayNum = weekdayNumOrig;
        const target = new Date(today);
        let daysUntilTarget;
        if (weekdayNum === 0) weekdayNum = 7; // Treat Sunday as 7
        const currentDayAdjusted = currentDay === 0 ? 7 : currentDay;

        if (pattern.includes('nästa') || pattern.includes('kommande')) {
          daysUntilTarget = (7 - currentDayAdjusted) + weekdayNum;
        } else {
          daysUntilTarget = weekdayNum - currentDayAdjusted;
          if (daysUntilTarget <= 0) daysUntilTarget += 7;
        }

        target.setDate(today.getDate() + daysUntilTarget);
        const dateStr = target.toISOString().split('T')[0];
        const tagName = `${weekdayName}-${dateStr}`;
        if (!dateTags.includes(tagName)) dateTags.push(tagName);
      }
    });
  });

  return dateTags;
};

// Analyze Swedish business keywords and return suggested tags
export const analyzeTextForTags = (text) => {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase();
  const keywordMap = {
    'hett': ['intresserad', 'vill köpa', 'bestämma', 'offert', 'pris', 'priser', 'köpa', 'beställa', 'hot', 'het', 'möjlighet', 'affär'],
    'ringabak': ['ring tillbaka', 'ringa tillbaka', 'höra av sig', 'kontakta', 'återkomma', 'återkoppla', 'ring', 'ringa', 'hör av', 'kontakt'],
    'problem': ['problem', 'fungerar inte', 'missnöjd', 'fel', 'klagar', 'trasig', 'dålig', 'issue', 'trouble', 'svårt', 'hjälp'],
    'nöjd': ['nöjd', 'bra', 'funkar', 'rekommenderar', 'tack', 'fantastisk', 'perfekt', 'glad', 'bäst', 'toppen', 'excellent'],
    'akut': ['akut', 'bråttom', 'snabbt', 'idag', 'direkt', 'asap', 'nu', 'omgående', 'urgent', 'rush']
  };

  const results = new Set();
  Object.entries(keywordMap).forEach(([tag, words]) => {
    if (words.some(w => lower.includes(w))) results.add(tag);
  });
  return Array.from(results);
};

