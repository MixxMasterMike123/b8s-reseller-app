import { onRequest } from 'firebase-functions/v2/https';
import { corsHandler } from '../protection/cors/cors-handler';
import { rateLimiter } from '../protection/rate-limiting/rate-limiter';

// Simple language detection patterns
const LANGUAGE_PATTERNS = {
  'sv': {
    words: ['och', 'det', 'är', 'för', 'med', 'till', 'av', 'på', 'som', 'har', 'vi', 'från', 'att', 'våra', 'vårt', 'Sverige', 'svenska'],
    businessTerms: ['företag', 'tjänster', 'produkter', 'kundservice', 'kontakt', 'om oss', 'kvalitet', 'lösningar']
  },
  'en': {
    words: ['and', 'the', 'is', 'for', 'with', 'to', 'of', 'on', 'as', 'have', 'we', 'from', 'that', 'our', 'about'],
    businessTerms: ['company', 'services', 'products', 'customer', 'contact', 'about us', 'quality', 'solutions']
  },
  'de': {
    words: ['und', 'der', 'die', 'das', 'ist', 'für', 'mit', 'zu', 'von', 'auf', 'als', 'haben', 'wir', 'aus', 'unser'],
    businessTerms: ['unternehmen', 'dienstleistungen', 'produkte', 'kunde', 'kontakt', 'über uns', 'qualität', 'lösungen']
  }
};

// Simple business term translations
const SIMPLE_TRANSLATIONS = {
  // English to Swedish
  'company': 'företag',
  'business': 'företag',
  'services': 'tjänster', 
  'products': 'produkter',
  'solutions': 'lösningar',
  'quality': 'kvalitet',
  'customer': 'kund',
  'contact': 'kontakt',
  'about us': 'om oss',
  'experience': 'erfarenhet',
  'professional': 'professionell',
  'innovation': 'innovation',
  'technology': 'teknik',
  'leading': 'ledande',
  'expertise': 'expertis',
  'reliable': 'pålitlig',
  'trusted': 'betrodd',
  
  // German to Swedish  
  'unternehmen': 'företag',
  'dienstleistungen': 'tjänster',
  'produkte': 'produkter',
  'lösungen': 'lösningar',
  'qualität': 'kvalitet',
  'kunde': 'kund',
  'kontakt': 'kontakt',
  'über uns': 'om oss',
  'erfahrung': 'erfarenhet',
  'professionell': 'professionell',
  'technologie': 'teknik',
  'führend': 'ledande',
  'kompetenz': 'expertis',
  'zuverlässig': 'pålitlig',
  'vertrauenswürdig': 'betrodd'
};

/**
 * Detect language based on common words and patterns
 */
function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();
  const scores: Record<string, number> = {};
  
  // Initialize scores
  Object.keys(LANGUAGE_PATTERNS).forEach(lang => {
    scores[lang] = 0;
  });
  
  // Score based on common words
  Object.entries(LANGUAGE_PATTERNS).forEach(([lang, patterns]) => {
    patterns.words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = (lowerText.match(regex) || []).length;
      scores[lang] += matches * 2; // Common words get 2 points
    });
    
    patterns.businessTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = (lowerText.match(regex) || []).length;
      scores[lang] += matches * 3; // Business terms get 3 points
    });
  });
  
  // Find highest scoring language
  const detected = Object.entries(scores).reduce((a, b) => 
    scores[a[0]] > scores[b[0]] ? a : b
  )[0];
  
  return scores[detected] > 0 ? detected : 'unknown';
}

/**
 * Simple translation of common business terms
 */
function simpleTranslate(text: string, fromLang: string): string {
  if (fromLang === 'sv') return text; // Already Swedish
  
  let translated = text;
  
  Object.entries(SIMPLE_TRANSLATIONS).forEach(([original, swedish]) => {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    translated = translated.replace(regex, swedish);
  });
  
  return translated === text ? '' : translated; // Return empty if no changes
}

/**
 * Extract META description and other relevant meta tags from HTML
 */
function extractMetaData(html: string): {
  description?: string;
  title?: string;
  keywords?: string;
  ogDescription?: string;
  ogTitle?: string;
} {
  const metaData: any = {};
  
  // META description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) metaData.description = descMatch[1];
  
  // Title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) metaData.title = titleMatch[1];
  
  // META keywords
  const keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
  if (keywordsMatch) metaData.keywords = keywordsMatch[1];
  
  // Open Graph description
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  if (ogDescMatch) metaData.ogDescription = ogDescMatch[1];
  
  // Open Graph title
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitleMatch) metaData.ogTitle = ogTitleMatch[1];
  
  return metaData;
}

/**
 * Firebase Function to scrape website META data
 */
export const scrapeWebsiteMeta = onRequest(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
  },
  async (req, res) => {
    try {
      // Handle CORS
      if (!corsHandler(req, res)) {
        return;
      }

      // Apply rate limiting
      if (!await rateLimiter(req, res)) {
        return;
      }

      // Only allow POST
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }

      const { url } = req.body;

      if (!url) {
        res.status(400).json({ 
          success: false, 
          error: 'URL is required' 
        });
        return;
      }

      // Validate URL format
      let websiteUrl: string;
      try {
        // Add https if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          websiteUrl = `https://${url}`;
        } else {
          websiteUrl = url;
        }
        new URL(websiteUrl); // Validate URL format
      } catch (error) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid URL format' 
        });
        return;
      }

      console.log(`Scraping META data from: ${websiteUrl}`);

      // Fetch website HTML
      const response = await fetch(websiteUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'B8Shield-MetaScraper/1.0 (+https://partner.b8shield.com)'
        },
        // Timeout after 20 seconds
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        res.status(400).json({ 
          success: false, 
          error: `Failed to fetch website: ${response.status} ${response.statusText}` 
        });
        return;
      }

      const html = await response.text();
      
      // Extract META data
      const metaData = extractMetaData(html);
      
      // Use description from META tag, fallback to Open Graph
      const description = metaData.description || metaData.ogDescription || '';
      const title = metaData.title || metaData.ogTitle || '';
      
      if (!description && !title) {
        res.json({ 
          success: true,
          data: {
            description: '',
            title: '',
            detectedLanguage: 'unknown',
            simpleTranslation: '',
            message: 'Ingen META beskrivning hittades på webbsidan'
          }
        });
        return;
      }

      // Detect language
      const textToAnalyze = `${title} ${description}`.trim();
      const detectedLanguage = detectLanguage(textToAnalyze);
      
      // Simple translation if not Swedish
      const simpleTranslation = detectedLanguage !== 'sv' ? 
        simpleTranslate(description, detectedLanguage) : '';

      res.json({ 
        success: true,
        data: {
          description,
          title,
          keywords: metaData.keywords || '',
          detectedLanguage,
          simpleTranslation,
          scrapedAt: new Date().toISOString(),
          sourceUrl: websiteUrl
        }
      });

    } catch (error: any) {
      console.error('Error scraping website META:', error);
      
      // Handle timeout
      if (error.name === 'AbortError') {
        res.status(408).json({ 
          success: false, 
          error: 'Website took too long to respond (timeout)' 
        });
        return;
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to scrape website META data' 
      });
    }
  }
);