// 🎯 THE AMBASSADOR WAGON™ - Smart Tagging Intelligence System
// Revolutionary hashtag processing and Swedish date intelligence for influence partnerships

/**
 * Smart hashtag processing system adapted from Dining Wagon for Ambassador Wagon
 * Provides intelligent tag suggestions, Swedish date parsing, and urgency detection
 * for influencer partnership management
 */

// 🎯 AMBASSADOR-SPECIFIC KEYWORD MAPPING
// Adapted from Dining Wagon's business context to influencer context
const ambassadorKeywordMap = {
  // 🔥 HOT PROSPECTS - High conversion potential
  'hett': [
    'intresserad', 'vill samarbeta', 'partnership', 'collaboration', 'deal', 
    'förhandla', 'pris', 'priser', 'betalt', 'sponsring', 'ambassador', 
    'affär', 'kontrakt', 'avtal', 'hot prospect', 'möjlighet'
  ],
  
  // 📞 FOLLOW-UP REQUIRED - Callback promises
  'ringabak': [
    'ring-3 tillbaka', 'ringa tillbaka', 'höra av sig', 'kontakta', 
    'återkomma', 'återkoppla', 'ring-3', 'ringa', 'hör av', 'kontakt',
    'call back', 'get back', 'follow up', 'uppföljning'
  ],
  
  // ⚠️ PROBLEMS - Issues to resolve
  'problem': [
    'problem', 'fungerar inte', 'missnöjd', 'fel', 'klagar', 'issue', 
    'trouble', 'svårt', 'hjälp', 'support', 'not working', 'broken',
    'disappointed', 'unhappy', 'complaint'
  ],
  
  // ✅ SATISFIED - Happy ambassadors
  'nöjd': [
    'nöjd', 'bra', 'funkar', 'rekommenderar', 'tack', 'fantastisk', 
    'perfekt', 'glad', 'bäst', 'toppen', 'excellent', 'amazing',
    'love it', 'happy', 'satisfied', 'great work'
  ],
  
  // 🚨 URGENT - Immediate attention needed
  'akut': [
    'akut', 'bråttom', 'snabbt', 'idag', 'direkt', 'asap', 'nu', 
    'omgående', 'urgent', 'rush', 'emergency', 'immediately',
    'critical', 'important'
  ],
  
  // 💰 BUDGET DISCUSSIONS
  'budget': [
    'budget', 'kostnad', 'pris', 'betala', 'gratis', 'fee', 'cost',
    'payment', 'money', 'expensive', 'cheap', 'rate', 'commission'
  ],
  
  // 📈 CONTENT PLANNING
  'content': [
    'content', 'post', 'video', 'photo', 'story', 'reel', 'innehåll',
    'material', 'creative', 'campaign', 'shoot', 'filming'
  ],
  
  // 🎯 CAMPAIGN TYPES
  'campaign': [
    'campaign', 'kampanj', 'promotion', 'launch', 'event', 'release',
    'announcement', 'collaboration', 'partnership'
  ],
  
  // 📊 PERFORMANCE TRACKING
  'results': [
    'results', 'metrics', 'analytics', 'performance', 'engagement',
    'reach', 'clicks', 'conversions', 'roi', 'resultat', 'statistik'
  ]
};

// 🎯 AMBASSADOR-SPECIFIC COMMON TAGS
// Extended list for autocomplete and manual input
export const ambassadorCommonTags = [
  // Core business tags
  'hett', 'ringabak', 'problem', 'nöjd', 'akut', 'budget',
  
  // Content & Campaign tags
  'content', 'video', 'photo', 'story', 'reel', 'kampanj', 'launch',
  
  // Platform-specific tags
  'instagram', 'youtube', 'tiktok', 'facebook', 'linkedin', 'twitter',
  
  // Collaboration types
  'sponsring', 'partnership', 'ambassador', 'affiliate', 'pr-paket',
  
  // Status & Progress tags
  'förhandlar', 'kontrakt', 'aktivt', 'pausad', 'avslutad',
  
  // Performance tags
  'resultat', 'engagement', 'reach', 'conversions', 'analytics',
  
  // Relationship tags
  'vip', 'ny-kontakt', 'återkommande', 'rekommenderad', 'referral',
  
  // Content types
  'unboxing', 'review', 'tutorial', 'lifestyle', 'fishing', 'outdoor',
  
  // Business process tags
  'presentation', 'uppföljning', 'möte', 'demo', 'förhandling', 
  'leverans', 'support', 'expansion'
];

// 🇸🇪 SWEDISH WEEKDAY MAPPING
const swedishWeekdays = {
  'måndag': 1, 'tisdag': 2, 'onsdag': 3, 'torsdag': 4, 
  'fredag': 5, 'lördag': 6, 'söndag': 0
};

/**
 * 🧠 CORE SMART TAG ANALYSIS FUNCTION
 * Analyzes text content and suggests relevant tags based on Swedish business keywords
 * and context-aware patterns for ambassador relationships
 */
export const analyzeTextForAmbassadorTags = (text) => {
  if (!text.trim()) return [];
  
  const lowerText = text.toLowerCase();
  const detected = [];
  
  // 1️⃣ STANDARD KEYWORD DETECTION
  Object.entries(ambassadorKeywordMap).forEach(([tag, keywords]) => {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      detected.push(tag);
    }
  });
  
  // 2️⃣ ADVANCED SWEDISH DATE PARSING
  const dateTags = parseSwedishWeekdaysForAmbassadors(text);
  detected.push(...dateTags);
  
  // 3️⃣ PLATFORM DETECTION
  const platformTags = detectSocialMediaPlatforms(text);
  detected.push(...platformTags);
  
  // 4️⃣ AMBASSADOR-SPECIFIC PATTERNS
  const contextTags = detectAmbassadorContext(text);
  detected.push(...contextTags);
  
  // Max 5 suggested tags for optimal UX
  return [...new Set(detected)].slice(0, 5);
};

/**
 * 🇸🇪 ADVANCED SWEDISH WEEKDAY AND DATE PARSING
 * Intelligent Swedish date parsing with business context awareness
 * Converts natural language like "på måndag" to structured date tags
 */
export const parseSwedishWeekdaysForAmbassadors = (text) => {
  const lowerText = text.toLowerCase();
  const today = new Date();
  const currentDay = today.getDay();
  const dateTags = [];
  
  // 🎯 SPECIAL CASE: "nästa vecka" defaults to next Tuesday (Swedish business logic)
  if (lowerText.includes('nästa vecka') || lowerText.includes('nästa veck')) {
    const nextTuesday = new Date(today);
    const currentDayAdjusted = currentDay === 0 ? 7 : currentDay;
    const daysUntilNextTuesday = (7 - currentDayAdjusted) + 2; // 2 = Tuesday
    
    nextTuesday.setDate(today.getDate() + daysUntilNextTuesday);
    const dateStr = nextTuesday.toISOString().split('T')[0];
    const tagName = `tisdag-${dateStr}`;
    
    if (!dateTags.includes(tagName)) {
      dateTags.push(tagName);
    }
  }
  
  // 🎯 WEEKDAY DETECTION WITH CONTEXT PATTERNS
  Object.entries(swedishWeekdays).forEach(([weekdayName, weekdayNum]) => {
    const patterns = [
      `på ${weekdayName}`,
      `i ${weekdayName}`,
      `${weekdayName}`,
      `nästa ${weekdayName}`,
      `kommande ${weekdayName}`,
      `denna ${weekdayName}`,
      `imorgon` // Special handling for tomorrow
    ];
    
    patterns.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        let targetDate = new Date(today);
        let daysUntilTarget;
        
        // Calculate days until target weekday
        if (weekdayNum === 0) weekdayNum = 7; // Convert Sunday to 7 for easier calculation
        const currentDayAdjusted = currentDay === 0 ? 7 : currentDay;
        
        if (pattern.includes('nästa') || pattern.includes('kommande')) {
          // Explicitly next week
          daysUntilTarget = (7 - currentDayAdjusted) + weekdayNum;
        } else if (pattern === 'imorgon') {
          // Tomorrow logic
          daysUntilTarget = 1;
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const tomorrowWeekday = Object.keys(swedishWeekdays)[tomorrow.getDay() === 0 ? 6 : tomorrow.getDay() - 1];
          weekdayName = tomorrowWeekday;
        } else {
          // This week or next week logic
          daysUntilTarget = weekdayNum - currentDayAdjusted;
          if (daysUntilTarget <= 0) {
            daysUntilTarget += 7; // Move to next week if day has passed
          }
        }
        
        targetDate.setDate(today.getDate() + daysUntilTarget);
        
        // Format as Swedish date tag
        const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const tagName = `${weekdayName}-${dateStr}`;
        
        if (!dateTags.includes(tagName)) {
          dateTags.push(tagName);
        }
      }
    });
  });
  
  return dateTags;
};

/**
 * 📱 SOCIAL MEDIA PLATFORM DETECTION
 * Automatically detects mentions of social media platforms in text
 */
export const detectSocialMediaPlatforms = (text) => {
  const lowerText = text.toLowerCase();
  const platforms = [];
  
  const platformKeywords = {
    'instagram': ['instagram', 'ig', 'insta', '@'],
    'youtube': ['youtube', 'yt', 'video', 'kanal', 'prenumeranter'],
    'tiktok': ['tiktok', 'tik tok', 'short video', 'shorts'],
    'facebook': ['facebook', 'fb', 'meta'],
    'linkedin': ['linkedin', 'professionell', 'business network'],
    'twitter': ['twitter', 'tweet', 'x.com', 'social media']
  };
  
  Object.entries(platformKeywords).forEach(([platform, keywords]) => {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      platforms.push(platform);
    }
  });
  
  return platforms;
};

/**
 * 🎯 AMBASSADOR CONTEXT DETECTION
 * Detects ambassador-specific contexts and suggests relevant tags
 */
export const detectAmbassadorContext = (text) => {
  const lowerText = text.toLowerCase();
  const contextTags = [];
  
  // Content creation context
  if (lowerText.includes('unboxing') || lowerText.includes('packa upp')) {
    contextTags.push('unboxing');
  }
  
  if (lowerText.includes('review') || lowerText.includes('recension') || lowerText.includes('test')) {
    contextTags.push('review');
  }
  
  if (lowerText.includes('tutorial') || lowerText.includes('guide') || lowerText.includes('hur man')) {
    contextTags.push('tutorial');
  }
  
  // Collaboration types
  if (lowerText.includes('gratis produkt') || lowerText.includes('pr-paket') || lowerText.includes('sample')) {
    contextTags.push('pr-paket');
  }
  
  if (lowerText.includes('betalt') || lowerText.includes('sponsrad') || lowerText.includes('paid')) {
    contextTags.push('sponsring');
  }
  
  // Performance indicators
  if (lowerText.includes('viral') || lowerText.includes('trending') || lowerText.includes('populär')) {
    contextTags.push('viral');
  }
  
  return contextTags;
};

/**
 * 🎯 TAG-BASED URGENCY DETECTION
 * Determines urgency level based on tags for Ambassador dashboard triggers
 */
export const getAmbassadorUrgencyLevel = (tags) => {
  if (!tags || tags.length === 0) return 'normal';
  
  // Critical urgency
  if (tags.includes('akut')) return 'critical';
  
  // High urgency
  if (tags.includes('problem') || tags.includes('ringabak')) return 'high';
  
  // Medium urgency
  if (tags.includes('hett') || tags.includes('budget') || tags.includes('förhandlar')) return 'medium';
  
  return 'normal';
};

/**
 * 🎯 AMBASSADOR TAG SCORING SYSTEM
 * Calculates priority score based on tags for smart dashboard triggers
 * Adapted from Dining Wagon's sophisticated scoring system
 */
export const calculateAmbassadorTagScore = (tags, daysSinceLastContact = 0) => {
  let score = 0;
  let reason = '';
  let urgency = 'low';
  
  if (!tags || tags.length === 0) return { score: 0, reason: 'Ingen aktivitet', urgency: 'none' };
  
  // 🚨 CRITICAL TAGS - Immediate attention required
  if (tags.includes('akut')) {
    return { score: 100, reason: 'AKUT - Kontakta omedelbart!', urgency: 'critical' };
  }
  
  // ⚠️ HIGH PRIORITY TAGS
  if (tags.includes('problem')) {
    const problemScore = 40 + (daysSinceLastContact * 5); // Escalates over time
    if (problemScore >= 60) {
      return { score: problemScore, reason: 'Problem eskalerar - agera nu!', urgency: 'high' };
    }
    score += problemScore;
    reason = 'Problem med ambassadör';
    urgency = 'high';
  }
  
  if (tags.includes('ringabak')) {
    const hasDateTag = tags.some(tag => tag.includes('-') && tag.split('-').length === 3);
    
    if (hasDateTag) {
      score += 35;
      reason = 'Lovade ringa tillbaka - datum satt';
      urgency = 'medium';
    } else {
      // No date tag - escalate after 2 days
      if (daysSinceLastContact >= 2) {
        return { score: 50, reason: 'Ringabak - Nu är det dags!', urgency: 'high' };
      } else {
        score += 35;
        reason = 'Lovade återkomma';
        urgency = 'medium';
      }
    }
  }
  
  // 🔥 OPPORTUNITY TAGS - Hot prospects
  if (tags.includes('hett')) {
    const heatScore = Math.max(40 - (daysSinceLastContact * 3), 20); // Cools over time
    score += heatScore;
    if (heatScore > 30) {
      reason = 'Het ambassadör - slå till!';
      urgency = 'medium';
    } else {
      reason = 'Prospect svalnar av';
      urgency = 'low';
    }
  }
  
  // 💰 BUSINESS TAGS
  if (tags.includes('budget') || tags.includes('förhandlar')) {
    score += 25;
    reason = reason || 'Budgetdiskussion pågår';
    urgency = urgency === 'low' ? 'medium' : urgency;
  }
  
  if (tags.includes('kontrakt') || tags.includes('avtal')) {
    score += 30;
    reason = reason || 'Kontraktsförhandling';
    urgency = urgency === 'low' ? 'medium' : urgency;
  }
  
  // 📈 PERFORMANCE TAGS
  if (tags.includes('viral') || tags.includes('resultat')) {
    score += 20;
    reason = reason || 'Stark prestanda - uppföljning';
    urgency = urgency === 'low' ? 'medium' : urgency;
  }
  
  // ✅ POSITIVE TAGS - Lower priority but still important
  if (tags.includes('nöjd')) {
    score += 10;
    reason = reason || 'Nöjd ambassadör - underhåll relation';
  }
  
  return { 
    score: Math.max(score, 0), 
    reason: reason || 'Allmän uppföljning', 
    urgency 
  };
};

/**
 * 🎯 PROCESS MANUAL TAG INPUT
 * Processes manual tag input with cleaning and validation
 */
export const processManualAmbassadorTags = (input, existingTags = []) => {
  if (!input.trim()) return [];
  
  // Split by comma, space, or newline, clean and filter
  const newTags = input
    .split(/[,\s\n]+/)
    .map(tag => tag.replace('#', '').trim().toLowerCase())
    .filter(tag => tag.length > 0 && !existingTags.includes(tag));
  
  return newTags;
};

/**
 * 🎯 GET AUTOCOMPLETE SUGGESTIONS
 * Provides smart autocomplete suggestions based on input
 */
export const getAmbassadorTagAutocomplete = (input, existingTags = []) => {
  if (!input.trim()) return [];
  
  const inputText = input.replace('#', '').toLowerCase();
  const matches = ambassadorCommonTags.filter(tag => 
    tag.includes(inputText) && !existingTags.includes(tag)
  );
  
  return matches.slice(0, 5); // Max 5 suggestions
};

/**
 * 🎯 CHECK IF ACTIVITY IS URGENT
 * Determines if an activity requires immediate attention based on tags
 */
export const isUrgentAmbassadorActivity = (activity) => {
  const tags = activity.tags || [];
  return tags.includes('akut') || tags.includes('problem');
};

/**
 * 🎯 EXPORT ALL UTILITIES
 * Main exports for Ambassador Wagon components
 */
export default {
  analyzeTextForAmbassadorTags,
  parseSwedishWeekdaysForAmbassadors,
  detectSocialMediaPlatforms,
  detectAmbassadorContext,
  getAmbassadorUrgencyLevel,
  calculateAmbassadorTagScore,
  processManualAmbassadorTags,
  getAmbassadorTagAutocomplete,
  isUrgentAmbassadorActivity,
  ambassadorCommonTags
};