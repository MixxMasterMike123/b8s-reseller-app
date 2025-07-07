import Papa from 'papaparse';

// Path relative to public folder. Adjust if the CSV is moved.
const CSV_PATH = '/x_trustpilot_scrape.csv';

/**
 * Loads Trustpilot reviews from a CSV that has been exported from Trustpilot
 * and placed in the site's public folder (or Firebase Hosting root).
 *
 * Expected columns (Trustpilot export default):
 * Name,Country,Review Count,Review Date,Rating,Title,Review Text,Experience Date
 *
 * We normalise this into the internal review object format used by
 * utils/trustpilotAPI.js & ReviewsSection.jsx
 */
export const loadReviewsFromCsv = async () => {
  const response = await fetch(CSV_PATH, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch reviews CSV: ${response.status}`);
  }

  const csvText = await response.text();
  const { data } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
  });

  // Map CSV rows to Review objects
  return data.map((row, idx) => {
    const ratingNum = Number(row['Rating']) || 5;
    const country = (row['Country'] || '').toUpperCase();
    const lang = country === 'SE' ? 'sv' : 'en';

    // Prefer Review Date; fallback to Experience Date
    const dateStr = row['Review Date'] || row['Experience Date'] || new Date().toISOString().slice(0, 10);

    return {
      id: `csv_${idx}_${row['Name']?.replace(/\s+/g, '_')}`,
      rating: ratingNum,
      title: row['Title']?.trim() || '',
      text: row['Review Text']?.trim() || '',
      author: row['Name']?.trim() || 'Trustpilot User',
      date: normaliseDate(dateStr),
      verified: true,
      location: country ? `${country}` : undefined,
      lang,
      source: 'csv',
    };
  });
};

// Converts various Trustpilot date formats to YYYY-MM-DD
function normaliseDate(dateString) {
  if (!dateString) return new Date().toISOString().slice(0, 10);
  // Trustpilot exports like "Jun 27 2025" or "September 16 2024"
  const parsed = Date.parse(dateString);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return dateString; // fallback – maybe already ISO
}

export default loadReviewsFromCsv; 