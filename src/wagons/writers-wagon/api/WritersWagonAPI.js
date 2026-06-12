// WritersWagonAPI.js - React-adapted Claude API manager for The Writer's Wagon™
import { getAPIKey, getContentTypeConfig, WRITERS_WAGON_CONFIG } from './WritersWagonConfig.js';
import { functionUrl } from '../../../config/urls';

class WritersWagonAPI {
  constructor() {
    // Use Firebase Function proxy instead of direct Claude API
    this.baseURL = functionUrl('generateContentWithClaude');
    this.apiKey = null; // Not needed - handled by Firebase Function
    this.requestCount = 0;
    this.costTracking = {
      totalRequests: 0,
      totalTokens: 0,
      estimatedCost: 0,
      monthlyUsage: 0
    };
    
    // Initialize API key
    this.initializeAPIKey();
  }

  initializeAPIKey() {
    // API key is handled by Firebase Function proxy - no client-side key needed
    console.log('✅ Writer\'s Wagon: Using Firebase Function proxy for API calls');
  }

  // Main content generation method
  async generateContent(contentType, prompt, options = {}) {
    const config = getContentTypeConfig(contentType);
    const requestOptions = {
      ...config,
      ...options,
      prompt: prompt
    };

    console.log(`🎯 Writer's Wagon: Generating ${contentType} content...`);
    
    try {
      const response = await this.makeRequest(requestOptions);
      this.trackUsage(response);
      return this.processResponse(response, contentType);
    } catch (error) {
      console.error(`❌ Writer's Wagon: Generation failed for ${contentType}:`, error);
      throw error;
    }
  }

  // Core API request method with retry logic (Firebase Function proxy)
  async makeRequest(options, retryCount = 0) {
    const { model, maxTokens, temperature, prompt, systemRole } = options;
    const config = WRITERS_WAGON_CONFIG.MODELS[model] || WRITERS_WAGON_CONFIG.MODELS[WRITERS_WAGON_CONFIG.CURRENT_MODEL];

    // Build the complete prompt with system context
    const fullPrompt = this.buildPrompt(prompt, systemRole);
    const systemPrompt = this.getSystemPrompt(systemRole);
    const combinedPrompt = `${systemPrompt}\n\n${fullPrompt}`;

    const requestData = {
      prompt: combinedPrompt,
      model: config.id,
      maxTokens: maxTokens || WRITERS_WAGON_CONFIG.API.maxTokens,
      temperature: temperature !== undefined ? temperature : WRITERS_WAGON_CONFIG.API.temperature,
      userId: options.userId || 'anonymous',
      wagonId: 'writers-wagon'
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WRITERS_WAGON_CONFIG.API.timeout);

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No API key needed - handled by Firebase Function
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firebase Function Error ${response.status}: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Check if the Firebase Function response indicates success
      if (!data.success) {
        throw new Error(`Generation failed: ${data.error || 'Unknown error'}`);
      }

      // Convert Firebase Function response to expected format
      const claudeResponse = {
        content: [{ text: data.content }],
        model: data.model,
        usage: data.usage || {}
      };

      this.requestCount++;
      return claudeResponse;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout after 30 seconds');
      }

      // Retry logic for transient errors
      if (retryCount < WRITERS_WAGON_CONFIG.API.retryAttempts && this.isRetryableError(error)) {
        const delay = WRITERS_WAGON_CONFIG.API.retryDelay * Math.pow(2, retryCount);
        console.log(`⏳ Writer's Wagon: Retrying in ${delay}ms... (attempt ${retryCount + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(options, retryCount + 1);
      }

      throw error;
    }
  }

  // Build comprehensive prompt with context
  buildPrompt(userPrompt, systemRole) {
    const brandContext = this.getBrandContext();
    const roleContext = this.getRoleContext(systemRole);
    
    return `${brandContext}\n\n${roleContext}\n\n${userPrompt}`;
  }

  // Get system prompt based on role
  getSystemPrompt(systemRole) {
    const systemPrompts = {
      'technical-writer': `Du är en teknisk skribent som specialiserar sig på fiskeprodukter. Skriv tydligt, faktabaserat och tekniskt korrekt på svenska. Fokusera på specifikationer, funktionalitet och professionell användning.`,
      
      'marketing-copywriter': `Du är en marknadsföringscopiwriter som specialiserar sig på B2C-försäljning av fiskeprodukter. Skriv engagerande, övertygande och kundcentrerat innehåll på svenska. Fokusera på fördelar, känslor och köpmotivation.`,
      
      'seo-optimizer': `Du är en SEO-specialist som optimerar produkttitlar och beskrivningar för bättre sökbarhet. Skriv koncist och inkludera relevanta sökord på svenska.`,
      
      'product-content-specialist': `Du är en produktinnehållsspecialist som skapar både teknisk B2B-information och marknadsförande B2C-innehåll. Anpassa tonen och fokuset baserat på målgruppen.`,
      
      'default': `Du är en professionell innehållsskapare som specialiserar sig på fiskeprodukter och B8Shield. Skriv tydligt och engagerande på svenska.`
    };

    return systemPrompts[systemRole] || systemPrompts['default'];
  }

  // Get brand context for B8Shield
  getBrandContext() {
    return `BRAND KONTEXT - B8Shield:
B8Shield är ett innovativt skyddssystem för fiskebeten från svenska JPH Innovation AB. Produkten skyddar dyrbara beten från skador och förluster under fiske. B8Shield används av både professionella återförsäljare och hobbyträdgårdsmästare i hela Norden.

NYCKELFÖRDELAR:
- Effektivt skydd för fiskebeten
- Minskar beteförluster dramatiskt  
- Enkel att använda
- Svensk kvalitet och innovation
- Miljövänligt och hållbart`;
  }

  // Get role-specific context
  getRoleContext(systemRole) {
    const contexts = {
      'technical-writer': `TEKNISK KONTEXT: Fokusera på material, dimensioner, kompatibilitet, installation och tekniska specifikationer. Målgrupp: återförsäljare och professionella användare.`,
      
      'marketing-copywriter': `MARKNADSFÖRINGSKONTEXT: Fokusera på problemlösning, tidsbesparingar, kostnadsfördelar och användarupplevelse. Målgrupp: slutkonsumenter som vill förbättra sitt fiske.`,
      
      'seo-optimizer': `SEO KONTEXT: Inkludera relevanta svenska sökord som "fiskebete", "beteskydd", "fiske", "B8Shield". Håll titlar under 60 tecken.`,
      
      'product-content-specialist': `PRODUKTKONTEXT: Skapa innehåll som fungerar för både B2B (teknisk information) och B2C (marknadsföring). Anpassa språket efter målgruppen.`
    };

    return contexts[systemRole] || '';
  }

  // Process and format the response
  processResponse(response, contentType) {
    if (!response?.content?.[0]?.text) {
      throw new Error('Invalid response format from Claude API');
    }

    const generatedContent = response.content[0].text;
    
    return {
      content: generatedContent,
      contentType: contentType,
      model: response.model,
      usage: response.usage,
      generatedAt: new Date().toISOString(),
      requestId: `ww_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        tokenCount: response.usage?.output_tokens || 0,
        inputTokens: response.usage?.input_tokens || 0,
        estimatedCost: this.estimateCost(response.usage, response.model)
      }
    };
  }

  // Estimate cost based on usage
  estimateCost(usage, model) {
    if (!usage) return 0;
    
    // Rough cost estimates (per 1K tokens)
    const costPer1K = {
      'claude-3-5-sonnet-20241022': 0.003,
      'claude-3-haiku-20240307': 0.00025
    };
    
    const modelCost = costPer1K[model] || costPer1K['claude-3-5-sonnet-20241022'];
    const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    
    return (totalTokens / 1000) * modelCost;
  }

  // Track usage statistics
  trackUsage(response) {
    if (response.usage) {
      this.costTracking.totalRequests++;
      this.costTracking.totalTokens += (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0);
      this.costTracking.estimatedCost += this.estimateCost(response.usage, response.model);
    }
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT', 
      'ENOTFOUND',
      '429', // Rate limit
      '500', // Server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504'  // Gateway timeout
    ];

    return retryableErrors.some(code => 
      error.message.includes(code) || 
      error.code === code ||
      error.status === parseInt(code)
    );
  }

  // Get usage statistics
  getUsageStats() {
    return {
      ...this.costTracking,
      requestCount: this.requestCount,
      averageCostPerRequest: this.costTracking.totalRequests > 0 
        ? this.costTracking.estimatedCost / this.costTracking.totalRequests 
        : 0
    };
  }

  // Reset usage tracking
  resetUsageStats() {
    this.costTracking = {
      totalRequests: 0,
      totalTokens: 0,
      estimatedCost: 0,
      monthlyUsage: 0
    };
    this.requestCount = 0;
  }

  // Convenience methods for different content types
  async generateB2BContent(productData, options = {}) {
    const prompt = this.buildB2BPrompt(productData);
    return this.generateContent('b2b-technical', prompt, options);
  }

  async generateB2CContent(productData, options = {}) {
    const prompt = this.buildB2CPrompt(productData);
    return this.generateContent('b2c-marketing', prompt, options);
  }

  async generateDualContent(productData, options = {}) {
    const prompt = this.buildDualPrompt(productData);
    return this.generateContent('dual-content', prompt, options);
  }

  async optimizeTitle(currentTitle, context = '', options = {}) {
    const prompt = `Optimera denna produkttitel för bättre SEO och klarhet:

NUVARANDE TITEL: "${currentTitle}"
KONTEXT: ${context}

Skapa 3 förbättrade alternativ som är:
- Tydligare och mer beskrivande
- SEO-optimerade med relevanta svenska sökord
- Kort nog för e-handel (max 60 tecken)
- Attraktiva för både B2B och B2C`;

    return this.generateContent('title-optimization', prompt, options);
  }

  // Build prompts for different content types
  buildB2BPrompt(productData) {
    return `Skapa teknisk produktbeskrivning för B2B-återförsäljare:

PRODUKTDATA:
Namn: ${productData.name || 'Ej angivet'}
Storlek: ${productData.size || 'Ej angivet'} 
Grundpris: ${productData.basePrice || 'Ej angivet'} SEK
Tillverkningskostnad: ${productData.manufacturingCost || 'Ej angivet'} SEK
Beskrivning: ${productData.description || 'Ej angivet'}

KRAV:
- Tekniska specifikationer och kompatibilitet
- Marginal- och prissättningsinformation för återförsäljare
- Installationsguide eller användningsinstruktioner
- Målgrupp och användningsområden
- Konkurrensfördelar och försäljningsargument
- Svensk terminology för professionell marknad

Skriv en komplett B2B-produktbeskrivning på svenska (300-500 ord).`;
  }

  buildB2CPrompt(productData) {
    return `Skapa marknadsförande produktbeskrivning för B2C-konsumenter:

PRODUKTDATA:
Namn: ${productData.name || 'Ej angivet'}
Storlek: ${productData.size || 'Ej angivet'}
Pris: ${productData.basePrice || 'Ej angivet'} SEK  
Beskrivning: ${productData.description || 'Ej angivet'}

KRAV:
- Fokusera på fördelar och problemlösning för hobbyträdgårdsmästare
- Emotionell koppling och användarupplevelse
- Enkla, tydliga förklaringar utan teknisk jargong
- Övertyga om köp med konkreta fördelar
- Call-to-action och känsla av brådska
- Svensk konsumentfokuserat språk

Skriv en engagerande B2C-produktbeskrivning på svenska (200-400 ord).`;
  }

  buildDualPrompt(productData) {
    return `Skapa BÅDE B2B- och B2C-innehåll för samma produkt:

PRODUKTDATA:
Namn: ${productData.name || 'Ej angivet'}
Storlek: ${productData.size || 'Ej angivet'}
Grundpris: ${productData.basePrice || 'Ej angivet'} SEK
Tillverkningskostnad: ${productData.manufacturingCost || 'Ej angivet'} SEK
Beskrivning: ${productData.description || 'Ej angivet'}

Skapa:

## B2B-BESKRIVNING (för återförsäljare)
[Teknisk, professionell, marginalfokuserad - 300-400 ord]

## B2C-BESKRIVNING (för slutkonsumenter)  
[Marknadsförande, emotionell, förmånsfokuserad - 200-300 ord]

## GEMENSAMMA NYCKELORD
[5-8 svenska SEO-nyckelord som fungerar för båda målgrupperna]

Båda beskrivningarna ska vara på svenska och komplettera varandra.`;
  }
}

// Create singleton instance
const writersWagonAPI = new WritersWagonAPI();

export default writersWagonAPI;

// Named exports for convenience
export {
  WritersWagonAPI,
  writersWagonAPI
}; 