// modules/api-manager.js - API Management Module
import { CONFIG } from './config.js';
import { AuctionetAPI } from './auctionet-api.js';
import { AIAnalysisEngine } from './core/ai-analysis-engine.js';

export class APIManager {
  constructor() {
    this.apiKey = null;
    this.enableArtistInfo = true;
    this.showDashboard = true; // Default to showing dashboard
    this.currentModel = 'claude-4-sonnet'; // Default to Claude 4 Sonnet (same cost, better performance)
    this.auctionetAPI = new AuctionetAPI();
    this.searchQuerySSoT = null; // NEW: AI-only SearchQuerySSoT support
    
    // Initialize AI Analysis Engine
    this.aiAnalysisEngine = new AIAnalysisEngine(this);
    
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['anthropicApiKey', 'enableArtistInfo', 'showDashboard', 'selectedModel']);
      this.apiKey = result.anthropicApiKey;
      this.enableArtistInfo = result.enableArtistInfo !== false;
      this.showDashboard = result.showDashboard !== false; // Default to true if not set
      
      // Load selected model from storage
      if (result.selectedModel && CONFIG.MODELS[result.selectedModel]) {
        const previousModel = this.currentModel;
        this.currentModel = result.selectedModel;
        
        // Always log which model is loaded, whether it changed or not
        
        // Log if this was a change from the default
        if (previousModel !== this.currentModel) {
        }
      } else {
      }
      
      
      
      // Sync settings with AI Analysis Engine
      if (this.aiAnalysisEngine) {
        this.aiAnalysisEngine.updateSettings({ enableArtistInfo: this.enableArtistInfo });
      }
      

      
      // Also refresh Auctionet API settings
      if (this.auctionetAPI) {
        await this.auctionetAPI.refreshExcludeCompanySetting();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // NEW: Method to refresh just the model selection
  async refreshModelSelection() {
    try {
      const result = await chrome.storage.sync.get(['selectedModel']);
      if (result.selectedModel && CONFIG.MODELS[result.selectedModel]) {
        const previousModel = this.currentModel;
        this.currentModel = result.selectedModel;
        
        // Always log the refresh action, even if model didn't change
        if (previousModel !== this.currentModel) {
        } else {
        }
      } else {
      }
    } catch (error) {
      console.error('Error refreshing model selection:', error);
    }
  }

  // Get current model (replacing the config version)
  getCurrentModel() {
    return CONFIG.MODELS[this.currentModel] || CONFIG.MODELS['claude-4-sonnet'];
  }

  async callClaudeAPI(itemData, fieldType, retryCount = 0) {
    if (!this.apiKey) {
      throw new Error('API key not configured. Please set your Anthropic API key in the extension popup.');
    }

    const systemPrompt = this.getSystemPrompt(fieldType);
    const userPrompt = this.getUserPrompt(itemData, fieldType);

    // Field-specific model selection
    const getModelForField = (fieldType) => {
      if (fieldType === 'title-correct') {
        // Use Haiku for simple corrections - faster and more literal
        return 'claude-3-haiku-20240307';
      }
      // Use user's selected model for other tasks
      return this.getCurrentModel().id;
    };

    // Field-specific parameters
    const getParametersForField = (fieldType) => {
      if (fieldType === 'title-correct') {
        return {
          max_tokens: 500,
          temperature: 0.1  // Very low temperature for literal corrections
        };
      }
      return {
        max_tokens: CONFIG.API.maxTokens,
        temperature: CONFIG.API.temperature
      };
    };

    const modelParams = getParametersForField(fieldType);

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'anthropic-fetch',
          apiKey: this.apiKey,
          body: {
            model: getModelForField(fieldType),
            max_tokens: modelParams.max_tokens,
            temperature: modelParams.temperature,
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: userPrompt
            }]
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'API request failed'));
          }
        });
      });
      
      return await this.processAPIResponse(response, systemPrompt, userPrompt, fieldType);
      
    } catch (error) {
      if ((error.message.includes('Overloaded') || error.message.includes('rate limit') || error.message.includes('429')) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callClaudeAPI(itemData, fieldType, retryCount + 1);
      }
      
      if (error.message.includes('Overloaded')) {
        throw new Error('Claude API är överbelastad just nu. Vänta en stund och försök igen.');
      }
      
      throw error;
    }
  }

  async processAPIResponse(response, systemPrompt, userPrompt, fieldType) {
    const data = response.data;
    
    if (!data || !data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new Error('Invalid response format from API');
    }
    
    if (!data.content[0] || !data.content[0].text) {
      throw new Error('No text content in API response');
    }
    
    let result = this.parseClaudeResponse(data.content[0].text, fieldType);
    
    if (result.needsCorrection && ['all', 'all-enhanced', 'all-sparse'].includes(fieldType)) {
      const correctionPrompt = `
De föregående förslagen klarade inte kvalitetskontrollen:
Poäng: ${result.validationScore}/100

FEL SOM MÅSTE RÄTTAS:
${result.validationErrors.join('\n')}

FÖRBÄTTRINGSFÖRSLAG:
${result.validationWarnings.join('\n')}

Vänligen korrigera dessa problem och returnera förbättrade versioner som följer alla svenska auktionsstandarder.
`;
      
      const correctionResponse = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'anthropic-fetch',
          apiKey: this.apiKey,
          body: {
            model: this.getCurrentModel().id,
            max_tokens: CONFIG.API.maxTokens,
            temperature: CONFIG.API.temperature,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt },
              { role: 'assistant', content: data.content[0].text },
              { role: 'user', content: correctionPrompt }
            ]
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'API request failed'));
          }
        });
      });
      
      if (correctionResponse.success) {
        const correctionData = correctionResponse.data;
        
        if (correctionData && correctionData.content && correctionData.content[0] && correctionData.content[0].text) {
          result = this.parseClaudeResponse(correctionData.content[0].text, fieldType);
        } else {
          console.warn('Invalid correction response format, using original result');
        }
      }
    }
    
    return result;
  }

  parseClaudeResponse(response, fieldType) {
    
    if (!response || typeof response !== 'string') {
      console.error('Invalid response format:', response);
      throw new Error('Invalid response format from Claude');
    }
    
    // SPECIAL CASE: Handle search_query field type - return raw JSON response
    if (fieldType === 'search_query') {
      return response.trim();
    }
    
    // For single field requests
    if (['title', 'title-correct', 'description', 'condition', 'keywords'].includes(fieldType)) {
      const result = {};
      const lines = response.split('\n');
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.match(/^\*?\*?TITEL\s*:?\*?\*?\s*/i)) {
          result.title = trimmedLine.replace(/^\*?\*?TITEL\s*:?\*?\*?\s*/i, '').trim();
        } else if (trimmedLine.match(/^\*?\*?BESKRIVNING\s*:?\*?\*?\s*/i)) {
          result.description = trimmedLine.replace(/^\*?\*?BESKRIVNING\s*:?\*?\*?\s*/i, '').trim();
        } else if (trimmedLine.match(/^\*?\*?KONDITION\s*:?\*?\*?\s*/i)) {
          result.condition = trimmedLine.replace(/^\*?\*?KONDITION\s*:?\*?\*?\s*/i, '').trim();
        } else if (trimmedLine.match(/^\*?\*?SÖKORD\s*:?\*?\*?\s*/i)) {
          result.keywords = trimmedLine.replace(/^\*?\*?SÖKORD\s*:?\*?\*?\s*/i, '').trim();
        }
      });
      
      // IMPROVED FALLBACK LOGIC: Handle cases where AI doesn't follow the expected format
      if (Object.keys(result).length === 0) {
        // For title-correct, if no structured response, use the entire response as title
        if (fieldType === 'title-correct') {
          result.title = response.trim();
        } else {
          result[fieldType] = response.trim();
        }
      }
      
      // SPECIAL CASE: For title-correct, if we got other fields but no title, try to extract title from response
      if (fieldType === 'title-correct' && !result.title && Object.keys(result).length > 0) {
        // Check if any of the other fields might contain the corrected title
        if (result.description && result.description.length > 0 && result.description.length < 100) {
          // If description is short, it might be the corrected title
          result.title = result.description;
        } else {
          // Last resort: use the entire response as title
          result.title = response.trim();
        }
        console.warn('⚠️ title-correct: AI returned unexpected format, using fallback logic');
      }
      
      // For title-correct, map the result to title field for field application
      if (fieldType === 'title-correct' && result[fieldType]) {
        result.title = result[fieldType];
        delete result[fieldType];
      }
      
      // CLEANUP: Remove unwanted outer quotes from title field
      if (result.title && typeof result.title === 'string') {
        // Remove outer quotes if the entire title is wrapped in them
        let cleanTitle = result.title.trim();
        if (cleanTitle.startsWith('"') && cleanTitle.endsWith('"') && cleanTitle.length > 2) {
          // Make sure it's not just quoted content like "Alvine" but the whole title wrapped
          const innerContent = cleanTitle.slice(1, -1);
          // Only remove outer quotes if there are other quotes inside (indicating wrapped title)
          if (innerContent.includes('"')) {
            cleanTitle = innerContent;
            console.log('🧹 Removed unwanted outer quotes from title');
          }
        }
        result.title = cleanTitle;
      }
      
      console.log('Single field parsed result:', result);
      return result;
    }
    
    // Parse multi-field responses with proper multi-line support
    const result = {};
    const lines = response.split('\n');
    
    console.log('Parsing multi-field response, lines:', lines);
    
    let currentField = null;
    let currentContent = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check if this line starts a new field
      if (trimmedLine.match(/^\*?\*?TITEL(\s*\([^)]*\))?\s*:?\*?\*?\s*/i)) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'title';
        currentContent = [trimmedLine.replace(/^\*?\*?TITEL(\s*\([^)]*\))?\s*:?\*?\*?\s*/i, '').trim()];
      } else if (trimmedLine.match(/^\*?\*?BESKRIVNING\s*:?\*?\*?\s*/i)) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'description';
        currentContent = [trimmedLine.replace(/^\*?\*?BESKRIVNING\s*:?\*?\*?\s*/i, '').trim()];
      } else if (trimmedLine.match(/^\*?\*?KONDITION(SRAPPORT)?\s*:?\*?\*?\s*/i)) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'condition';
        currentContent = [trimmedLine.replace(/^\*?\*?KONDITION(SRAPPORT)?\s*:?\*?\*?\s*/i, '').trim()];
      } else if (trimmedLine.match(/^\*?\*?SÖKORD\s*:?\*?\*?\s*/i)) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'keywords';
        currentContent = [trimmedLine.replace(/^\*?\*?SÖKORD\s*:?\*?\*?\s*/i, '').trim()];
      } else if (trimmedLine.match(/^\*?\*?VALIDERING\s*:?\*?\*?\s*/i)) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'validation';
        currentContent = [trimmedLine.replace(/^\*?\*?VALIDERING\s*:?\*?\*?\s*/i, '').trim()];
      }
      // Handle simple formats
      else if (trimmedLine.startsWith('TITEL:')) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'title';
        currentContent = [trimmedLine.substring(6).trim()];
      } else if (trimmedLine.startsWith('BESKRIVNING:')) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'description';
        currentContent = [trimmedLine.substring(12).trim()];
      } else if (trimmedLine.startsWith('KONDITION:')) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'condition';
        currentContent = [trimmedLine.substring(10).trim()];
      } else if (trimmedLine.startsWith('SÖKORD:')) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'keywords';
        currentContent = [trimmedLine.substring(7).trim()];
      } else if (trimmedLine.startsWith('VALIDERING:')) {
        // Save previous field if exists
        if (currentField && currentContent.length > 0) {
          result[currentField] = currentContent.join('\n').trim();
        }
        currentField = 'validation';
        currentContent = [trimmedLine.substring(11).trim()];
      } else if (currentField && trimmedLine.length > 0) {
        // This is a continuation line for the current field
        currentContent.push(line); // Keep original formatting/indentation
      }
    }
    
    // Save the last field
    if (currentField && currentContent.length > 0) {
      result[currentField] = currentContent.join('\n').trim();
    }
    
    if (Object.keys(result).length === 0 && response.trim().length > 0) {
      console.log('No fields found, using entire response as title');
      result.title = response.trim();
    }
    
    console.log('Multi-field parsed result:', result);
    console.log('Fields found:', Object.keys(result));
    return result;
  }

  getCategorySpecificRules(itemData) {
    const category = itemData.category?.toLowerCase() || '';
    const title = itemData.title?.toLowerCase() || '';
    const description = itemData.description?.toLowerCase() || '';
    
    // Detect weapons and militaria - expanded detection
    const isWeapon = category.includes('vapen') || 
                    category.includes('svärd') || 
                    category.includes('kniv') || 
                    category.includes('bajonett') || 
                    category.includes('militaria') ||
                    category.includes('krigshistoria') ||
                    title.includes('svärd') || 
                    title.includes('bajonett') || 
                    title.includes('kniv') ||
                    title.includes('dolk') ||
                    title.includes('yxa') ||
                    title.includes('spjut') ||
                    title.includes('gevär') ||
                    title.includes('pistol') ||
                    title.includes('uniformsdelar') ||
                    title.includes('hjälm') ||
                    description.includes('vapen') ||
                    description.includes('militär') ||
                    description.includes('svärdsskola') ||
                    description.includes('svärdsmed') ||
                    description.includes('signerad') && (description.includes('fujiwara') || description.includes('takada'));
    
    if (isWeapon) {
      return `
KATEGORI-SPECIFIK REGEL - VAPEN OCH MILITARIA:
Detta är ett vapen eller militärt föremål. EXTRA FÖRSIKTIGHET krävs för att undvika historiska felaktigheter och AI-hallucinationer.

🚨 KRITISKA ANTI-HALLUCINATION REGLER FÖR VAPEN:

FÖRBJUDNA TILLÄGG - LÄG ALDRIG TILL:
• Historisk kontext som inte explicit finns i källan (t.ex. "under Enpō-perioden")
• Skolnamn eller regionnamn som inte är explicit nämnda (t.ex. "Bungo-skolan", "Bungo-regionen")
• Generaliseringar från specifika namn (t.ex. från "Takada" till "Takada-skolan i Bungo-regionen")
• Biografisk information om svärdssmeder eller vapensmeder
• Produktionstekniker eller traditioner som inte är nämnda
• Tidsperioder baserade på stilanalys eller gissningar
• Karakteristiska drag eller kvalitetsbedömningar

ENDAST TILLÅTET - FÖRBÄTTRA BEFINTLIG INFORMATION:
• Rätta stavfel i namn och termer (t.ex. "Fujiwara Toyoyuki" om felstavat)
• Förbättra grammatik och struktur UTAN att lägga till ny information
• Använd korrekt terminologi för vapentyper (svärd, bajonett, etc.)
• Behåll EXAKT samma information som finns i källan

EXEMPEL PÅ FÖRBJUDNA AI-HALLUCINATIONER:
❌ FÖRBJUDET: "Takada" → "Takada-skolan i Bungo-regionen"
❌ FÖRBJUDET: "Fujiwara Toyoyuki" → "känd för sina högkvalitativa blad med karakteristisk härdningslinje"
❌ FÖRBJUDET: "1673" → "under Enpō-perioden (1673-1681)"
❌ FÖRBJUDET: Att lägga till kontext om svärdssmeden som inte finns i källan

✅ KORREKT: Behåll exakt samma faktainformation, förbättra endast språk och struktur

SPECIALFALL - JAPANSKA VAPEN:
• Behåll EXAKT samma skolnamn och regionnamn som anges
• Lägg INTE till historiska perioder eller dynastier
• Lägg INTE till information om svärdsmedstekniker
• Behandla japonska namn som egenn namn - expandera INTE till skolor eller regioner

STRIKT BEGRÄNSNING FÖR EXPERTKÄNSKAP:
• Även om AI:n "känner till" vapenhistoria - ANVÄND INTE denna kunskap
• Håll dig STRIKT till vad som explicit står i källmaterialet
• Om osäker - använd osäkerhetsmarkörer som "troligen", "möjligen"
• Bättre att ha kortare, mer exakt text än längre text med felaktigheter

EXEMPEL PÅ KORREKT HANTERING:
ORIGINAL: "SVÄRD kol 1673 Svärdsskola Takada Reg Bungo Signerad Fujiwara Toyoyuki"
KORREKT FÖRBÄTTRING: "Svärd från Takada, Bungo-regionen, 1673. Signerat Fujiwara Toyoyuki."
FÖRBJUDEN FÖRBÄTTRING: "Traditionellt japanskt svärd från Takada-skolan i Bungo-regionen, tillverkat under Enpō-perioden (1673-1681). Signerat av svärdssmeden Fujiwara Toyoyuki, en respekterad mästare..."

VIKTIGASTE REGELN: När i tvivel - FÖRBÄTTRA MINDRE och bevara EXAKTHET.`;
    }
    
    // Detect watches/timepieces
    const isWatch = category.includes('armbandsur') || 
                   category.includes('klocka') || 
                   title.includes('armbandsur') || 
                   title.includes('klocka') ||
                   description.includes('armbandsur') ||
                   description.includes('klocka');
    
    if (isWatch) {
      return `
KATEGORI-SPECIFIK REGEL - ARMBANDSUR:
Detta är ett armbandsur/klocka. Följ Auctionets krav:

OBLIGATORISK INFORMATION (om tillgänglig i källdata):
• Storlek i mm (diameter)
• Urverk: "automatic" eller "quartz" 
• Tillverkare och modell (eller kaliber)
• Material (stål, guld, etc.)

FUNKTIONSKLAUSUL - LÄGG ALLTID TILL I BESKRIVNING:
"Fungerar vid katalogisering - ingen garanti lämnas på funktion."

KRITISKT FÖR ARMBANDSUR TITEL:
• BEHÅLL ALLTID "ARMBANDSUR" FÖRST i titeln
• Format: "ARMBANDSUR, [material], [tillverkare], [modell], [urverk], [storlek], [period]"
• EXEMPEL: "ARMBANDSUR, stål, ROLEX, Submariner, automatic, 40mm, 1990-tal"

EXEMPEL PÅ KORREKT FORMAT:
TITEL: "ARMBANDSUR, stål, ROLEX, Submariner, automatic, 40mm, 1990-tal"
BESKRIVNING: "Automatiskt armbandsur i rostfritt stål. Svart urtavla med lysande index. Fungerar vid katalogisering - ingen garanti lämnas på funktion."

KRITISKA REGLER FÖR ARMBANDSUR:
• BEHÅLL "ARMBANDSUR" som första ord i titel - TA ALDRIG BORT
• Lägg INTE till mått (mm) som inte finns i källdata
• Lägg INTE till urverk (automatic/quartz) som inte är angivet
• RÄTTA stavfel i märken/modeller (t.ex. "Oscean" → "Ocean")
• Förbättra ENDAST befintlig information - uppfinn INGET nytt

ANTI-HALLUCINATION: Om storlek, urverk eller andra tekniska detaljer INTE finns i originalet - lägg INTE till dem.`;
    }
    
    // Detect historical/cultural artifacts that need conservative handling
    const isHistoricalItem = category.includes('antikviteter') ||
                            category.includes('arkeologi') ||
                            category.includes('etnografika') ||
                            category.includes('historiska') ||
                            category.includes('kulturhistoria') ||
                            title.includes('antik') ||
                            title.includes('historisk') ||
                            title.includes('forntid') ||
                            title.includes('medeltid') ||
                            title.includes('vikinga') ||
                            title.includes('bronsålder') ||
                            description.includes('antik') ||
                            description.includes('historisk') ||
                            description.includes('kulturell') ||
                            description.includes('arkeologisk');
    
    if (isHistoricalItem) {
      return `
KATEGORI-SPECIFIK REGEL - HISTORISKA FÖREMÅL OCH ANTIKVITETER:
Detta är ett historiskt/kulturellt föremål. Använd KONSERVATIV förstärkning för att undvika felaktiga historiska tolkningar.

KONSERVATIVA REGLER:
• Lägg INTE till historiska perioder eller dynastier som inte är explicit nämnda
• Expandera INTE kulturella eller geografiska referenser utan källa
• Undvik arkeologiska eller historiska spekulationer
• Behandla alla historiska namn och platser som exakta citat
• Använd osäkerhetsmarkörer vid minsta tvivel: "troligen", "möjligen"

ANTI-HALLUCINATION:
• Uppfinn ALDRIG historisk kontext eller bakgrund
• Utöka INTE geografiska eller kulturella referenser
• Lägg INTE till datering baserad på stilanalys
• Behåll EXAKT samma historiska referenser som i källan`;
    }
    
    // Detect jewelry that might have complex gemological terms
    const isJewelry = category.includes('smycken') ||
                     category.includes('guld') ||
                     category.includes('silver') ||
                     category.includes('diamant') ||
                     category.includes('ädelsten') ||
                     title.includes('ring-3') ||
                     title.includes('halsband') ||
                     title.includes('armband') ||
                     title.includes('brosch') ||
                     title.includes('örhängen') ||
                     description.includes('karat') ||
                     description.includes('ädelsten') ||
                     description.includes('rubin') ||
                     description.includes('safir') ||
                     description.includes('smaragd');
    
    if (isJewelry) {
      return `
KATEGORI-SPECIFIK REGEL - SMYCKEN OCH ÄDELMETALLER:
Detta är ett smycke eller föremål i ädelmetall. Var FÖRSIKTIG med tekniska specifikationer.

TEKNISKA BEGRÄNSNINGAR:
• Lägg INTE till karattyngd som inte är angiven
• Specificera INTE metallhalt (18k, 14k) utan källa
• Lägg INTE till information om ädelstenars kvalitet eller ursprung
• Uppfinn INTE tekniska detaljer om legering eller bearbetning
• Behåll EXAKT samma tekniska information som finns i källan

ENDAST FÖRBÄTTRA:
• Stavning av ädelstensnamn och märken
• Grammatik och struktur
• Korrekt smyckesterminologi
• Språk och läsbarhet utan att lägga till tekniska detaljer`;
    }
    
    return '';
  }

  isSpecializedCategory(itemData) {
    const category = itemData.category?.toLowerCase() || '';
    const title = itemData.title?.toLowerCase() || '';
    const description = itemData.description?.toLowerCase() || '';
    
    // Check for specialized categories that need conservative enhancement
    const specializedKeywords = [
      // Weapons and militaria
      'vapen', 'svärd', 'kniv', 'bajonett', 'militaria', 'krigshistoria',
      'dolk', 'yxa', 'spjut', 'gevär', 'pistol', 'uniformsdelar', 'hjälm',
      'militär', 'svärdsskola', 'svärdsmed',
      // Historical items
      'antikviteter', 'arkeologi', 'etnografika', 'historiska', 'kulturhistoria',
      'antik', 'historisk', 'forntid', 'medeltid', 'vikinga', 'bronsålder',
      'kulturell', 'arkeologisk',
      // Jewelry and precious items
      'smycken', 'guld', 'silver', 'diamant', 'ädelsten',
      'ring-3', 'halsband', 'armband', 'brosch', 'örhängen',
      'karat', 'rubin', 'safir', 'smaragd'
    ];
    
    return specializedKeywords.some(keyword => 
      category.includes(keyword) || 
      title.includes(keyword) || 
      description.includes(keyword)
    );
  }

  getSystemPrompt(fieldType = null) {
    // 🚀 NEW: Using centralized AI Rules System v2.0
    // OLD: ~100 lines of hardcoded rules
    // NEW: Single call to global system with field-specific prompts
    
    try {
      if (fieldType === 'title-correct') {
        console.log('🔍 DEBUG: Getting titleCorrect prompt from AI Rules System');
        
        // Check if the global function exists
        if (typeof getSystemPrompt !== 'function') {
          console.error('❌ getSystemPrompt function not available! Available functions:', Object.keys(window).filter(k => k.includes('getS')));
          throw new Error('AI Rules System not initialized');
        }
        
        const prompt = getSystemPrompt('titleCorrect');
        console.log('✅ DEBUG: titleCorrect prompt retrieved, length:', prompt?.length);
        console.log('🔍 DEBUG: Has comma rule:', prompt?.includes('komma före citerade modellnamn'));
        
        if (!prompt || prompt.length < 100) {
          console.error('❌ titleCorrect prompt is empty or too short:', prompt);
          throw new Error('Invalid titleCorrect prompt');
        }
        
        return prompt;
      }
      
      if (fieldType === 'title') {
        console.log('🔍 DEBUG: Getting enhanced title prompt with comma rules');
        
        // Enhanced title gets core prompt PLUS comma rules
        const corePrompt = getSystemPrompt('core', 'apiManager');
        const commaRules = `

⚠️ KRITISK KOMMAREGEL - FÖLJ ALLTID ⚠️
När ett ord följs DIREKT av citationstecken, lägg ALLTID till komma mellan ordet och citatet.

EXEMPEL SOM MÅSTE FÖLJAS:
Input:  "MATTA, Rölakan "Alvine", IKEA"
Output: "MATTA, Rölakan, "Alvine", IKEA"
                    ↑ DENNA KOMMA ÄR OBLIGATORISK

Input:  "VAS, Graal "Ariel", Orrefors"  
Output: "VAS, Graal, "Ariel", Orrefors"
                  ↑ DENNA KOMMA ÄR OBLIGATORISK

🔥 ABSOLUT KRITISKT: Lägg ALLTID till komma före citationstecken! 🔥`;

        const enhancedPrompt = corePrompt + commaRules;
        console.log('✅ DEBUG: Enhanced title prompt with comma rules, total length:', enhancedPrompt?.length);
        
        return enhancedPrompt;
      }
      
      // Default to core prompt for other field types
      const corePrompt = getSystemPrompt('core', 'apiManager');
      console.log('✅ DEBUG: Core prompt retrieved for fieldType:', fieldType);
      return corePrompt;
      
    } catch (error) {
      console.error('❌ Error getting system prompt:', error);
      console.error('Falling back to emergency titleCorrect prompt');
      
                    // EMERGENCY FALLBACK for title-correct and title
       if (fieldType === 'title-correct') {
         return `🚨🚨🚨 TITLE-CORRECT UPPGIFT - MINIMALA KORRIGERINGAR 🚨🚨🚨

⚠️ KRITISK KOMMAREGEL - FÖLJ EXAKT ⚠️
När ett ord följs DIREKT av citationstecken, lägg ALLTID till komma mellan ordet och citatet.

EXEMPEL SOM MÅSTE FÖLJAS:
Input:  "MATTA, Rölakan "Alvine", IKEA"
Output: "MATTA, Rölakan, "Alvine", IKEA"
                    ↑ DENNA KOMMA ÄR OBLIGATORISK

Input:  "VAS, Graal "Ariel", Orrefors"  
Output: "VAS, Graal, "Ariel", Orrefors"
                  ↑ DENNA KOMMA ÄR OBLIGATORISK

🔥 ABSOLUT KRITISKT: Lägg ALLTID till komma före citationstecken! 🔥

Korrigera också:
• Stavfel och grammatik
• Kända varumärken till korrekt kapitalisering (IKEA, ROLEX, BMW)
• Lägg till avslutande punkt (.) om den saknas

🚨 ÄNDRA ALDRIG:
• Ordval eller terminologi
• Innehåll eller struktur
• Beskrivande ord

Behåll EXAKT samma innehåll - korrigera bara uppenbara fel.`;
       }
       
       if (fieldType === 'title') {
         return `🚨 FÖRBÄTTRA TITEL - SVENSKA AUKTIONSSTANDARDER 🚨

⚠️ KRITISK KOMMAREGEL - FÖLJ ALLTID ⚠️
När ett ord följs DIREKT av citationstecken, lägg ALLTID till komma mellan ordet och citatet.

EXEMPEL SOM MÅSTE FÖLJAS:
Input:  "MATTA, Rölakan "Alvine", IKEA"
Output: "MATTA, Rölakan, "Alvine", IKEA"
                    ↑ DENNA KOMMA ÄR OBLIGATORISK

Input:  "VAS, Graal "Ariel", Orrefors"  
Output: "VAS, Graal, "Ariel", Orrefors"
                  ↑ DENNA KOMMA ÄR OBLIGATORISK

🔥 ABSOLUT KRITISKT: Lägg ALLTID till komma före citationstecken! 🔥

FÖRBÄTTRA OCKSÅ:
• Titel struktur enligt Auctionet standarder
• Korrekt kapitalisering (IKEA, ROLEX, BMW)
• Lägg till avslutande punkt (.) om den saknas
• Förbättra terminologi och ordning
• Max 60 tecken

FÖLJ AUCTIONET TITELFORMAT:
• MÖBLER: "OBJEKT, stil, period"
• SMÅSAKER: "OBJEKT, material, stil, tillverkare, period"
• MATTOR: "MATTA, typ, ålder, mått"

Returnera endast den förbättrade titeln.`;
       }
      
      // For other field types, throw the error
      throw error;
    }
  }

  getUserPrompt(itemData, fieldType) {
    // 🚀 NEW: Using centralized AI Rules System v2.0
    // OLD: ~600 lines of scattered rules
    // NEW: Single call to migration class
    return APIManagerMigration.getUserPrompt(itemData, fieldType);
  }

  validateTitle(title) {
    const errors = [];
    const warnings = [];
    
    // Validate input
    if (!title || typeof title !== 'string') {
      errors.push('Titel saknas eller är ogiltig');
      return { errors, warnings };
    }
    
    // Length check
    if (title.length > 60) {
      errors.push(`Titel för lång: ${title.length}/60 tecken`);
    }
    
    // Structure check
    if (!title.match(/^[A-ZÅÄÖÜ]/)) {
      warnings.push('Titel bör börja med stor bokstav');
    }
    
    // CRITICAL: Check for date speculation/hallucination
    const originalTitle = document.querySelector('#item_title_sv')?.value || '';
    const dateSpeculationCheck = this.detectDateSpeculation(originalTitle, title);
    if (dateSpeculationCheck.hasSpeculation) {
      dateSpeculationCheck.speculations.forEach(speculation => {
        errors.push(`DATUM HALLUCINATION: "${speculation.expanded}" - originalet säger bara "${speculation.original}". Expandera ALDRIG partiella årtal!`);
      });
    }
    
    // Check for uncertainty markers preservation
    const uncertaintyMarkers = ['troligen', 'tillskriven', 'efter', 'stil av', 'möjligen', 'typ', 'skola av', 'krets kring'];
    
    uncertaintyMarkers.forEach(marker => {
      if (originalTitle.toLowerCase().includes(marker) && !title.toLowerCase().includes(marker)) {
        errors.push(`Osäkerhetsmarkör "${marker}" får inte tas bort från titel`);
      }
    });
    
    // Forbidden marketing terms
    const marketingTerms = [
      'fantastisk', 'vacker', 'underbar', 'magnifik', 'exceptional', 'stunning',
      'rare', 'unique', 'sällsynt', 'unik', 'perfekt', 'pristine'
    ];
    
    marketingTerms.forEach(term => {
      if (title.toLowerCase().includes(term)) {
        errors.push(`Förbjuden marknadsföringsterm i titel: "${term}"`);
      }
    });
    
    // Check for proper format
    if (title.includes(',')) {
      const parts = title.split(',').map(p => p.trim());
      if (parts.length < 2) {
        warnings.push('Titel bör följa format: KONSTNÄR, Föremål, Material, Period');
      }
    }
    
    return { errors, warnings };
  }

  // NEW: Detect date speculation and hallucination
  detectDateSpeculation(original, enhanced) {
    const speculations = [];
    
    // Pattern to find partial dates in original (like "55", "daterad 55", "signerad 55")
    const partialDatePattern = /(daterad|signerad|märkt|stämplad)?\s*(\d{2})\b/gi;
    
    let match;
    while ((match = partialDatePattern.exec(original)) !== null) {
      const [fullMatch, prefix, twoDigitYear] = match;
      const prefixPart = prefix ? prefix.trim() : '';
      
      // Check if the enhanced version has expanded this to a full year
      const expandedPatterns = [
        new RegExp(`${prefixPart}\\s*1[6-9]${twoDigitYear}\\b`, 'i'), // 1655, 1755, 1855, 1955
        new RegExp(`${prefixPart}\\s*20${twoDigitYear}\\b`, 'i'),      // 2055 (unlikely but possible)
      ];
      
      // Also check for cases where prefix is removed and just the year appears
      if (prefixPart) {
        expandedPatterns.push(new RegExp(`\\b1[6-9]${twoDigitYear}\\b`, 'i'));
        expandedPatterns.push(new RegExp(`\\b20${twoDigitYear}\\b`, 'i'));
      }
      
      expandedPatterns.forEach(pattern => {
        const expandedMatch = enhanced.match(pattern);
        if (expandedMatch) {
          // Make sure this expansion doesn't already exist in the original
          const expandedYear = expandedMatch[0].trim();
          if (!original.includes(expandedYear)) {
            speculations.push({
              original: fullMatch.trim(),
              expanded: expandedMatch[0].trim(),
              position: match.index
            });
          }
        }
      });
    }
    
    return {
      hasSpeculation: speculations.length > 0,
      speculations
    };
  }

  // AI-powered artist detection methods - UPDATED to use AI Analysis Engine
  async analyzeForArtist(title, objectType, artistField, description = '', options = {}) {
    return await this.aiAnalysisEngine.analyzeForArtist(title, objectType, artistField, description, options);
  }

  // LEGACY METHOD - kept for backward compatibility but delegates to engine
  async analyzeForArtist_LEGACY(title, objectType, artistField, description = '') {
    
    if (!this.apiKey) {
      console.log('❌ No API key available, skipping AI artist analysis');
      return null;
    }

    // ORIGINAL BUG: Only analyze if artist field is empty or very short
    if (artistField && artistField.trim().length > 2) {
      return null;
    }

    if (!title || title.length < 10) {
      return null;
    }

    // This was the legacy implementation with the bug - now delegates to AI Analysis Engine
    return await this.aiAnalysisEngine.analyzeForArtist(title, objectType, artistField, description, { skipIfArtistExists: true });
  }

  async verifyArtist(artistName, objectType, period) {
    return await this.aiAnalysisEngine.verifyArtist(artistName, objectType, period);
  }

  // LEGACY method for artist verification
  async verifyArtist_LEGACY(artistName, objectType, period) {
    if (!this.apiKey || !this.enableArtistInfo) {
      return null;
    }

    try {
      const prompt = `Verifiera denna potentiella konstnär/designer:

NAMN: "${artistName}"
OBJEKTTYP: ${objectType || 'Okänd'}
PERIOD: ${period || 'Okänd'}

UPPGIFT:
Är detta en verklig konstnär, designer eller hantverkare? Ge biografisk kontext om möjligt.

SVARA MED JSON:
{
  "isRealArtist": boolean,
  "confidence": 0.0-1.0,
  "biography": "kort biografisk information eller null",
  "specialties": ["lista", "över", "specialiteter"] eller null,
  "activeYears": "aktiva år eller null",
  "relevanceToObject": "relevans till objekttyp eller null"
}`;

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'anthropic-fetch',
          apiKey: this.apiKey,
          body: {
            model: 'claude-3-haiku-20240307', // Use fast Haiku model for artist verification
            max_tokens: 400,
            temperature: 0.1,
            messages: [{
              role: 'user',
              content: prompt
            }]
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'API request failed'));
          }
        });
      });

      if (response.success && response.data?.content?.[0]?.text) {
        const result = this.parseArtistVerificationResponse(response.data.content[0].text);
        console.log('AI artist verification result:', result);
        return result;
      }

      return null;
    } catch (error) {
      console.error('Error in AI artist verification:', error);
      return null;
    }
  }

  parseArtistAnalysisResponse(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate the response structure
        if (typeof parsed.hasArtist === 'boolean' && 
            typeof parsed.confidence === 'number' &&
            parsed.confidence >= 0 && parsed.confidence <= 1) {
          
          return {
            hasArtist: parsed.hasArtist,
            artistName: parsed.artistName || null,
            foundIn: parsed.foundIn || 'unknown',
            suggestedTitle: parsed.suggestedTitle || null,
            suggestedDescription: parsed.suggestedDescription || null,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning || '',
            source: 'ai'
          };
        }
      }
      
      // Fallback parsing if JSON is malformed
      const hasArtist = /hasArtist['":\s]*true/i.test(responseText);
      const artistMatch = responseText.match(/artistName['":\s]*["']([^"']+)["']/i);
      const confidenceMatch = responseText.match(/confidence['":\s]*([0-9.]+)/i);
      const foundInMatch = responseText.match(/foundIn['":\s]*["']([^"']+)["']/i);
      
      if (hasArtist && artistMatch && confidenceMatch) {
        return {
          hasArtist: true,
          artistName: artistMatch[1],
          foundIn: foundInMatch ? foundInMatch[1] : 'unknown',
          suggestedTitle: null,
          suggestedDescription: null,
          confidence: parseFloat(confidenceMatch[1]),
          reasoning: 'Fallback parsing',
          source: 'ai'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing AI artist analysis response:', error);
      return null;
    }
  }

  parseArtistVerificationResponse(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate the response structure
        if (typeof parsed.isRealArtist === 'boolean' && 
            typeof parsed.confidence === 'number' &&
            parsed.confidence >= 0 && parsed.confidence <= 1) {
          
          return {
            isRealArtist: parsed.isRealArtist,
            confidence: parsed.confidence,
            biography: parsed.biography || null,
            specialties: parsed.specialties || null,
            activeYears: parsed.activeYears || null,
            relevanceToObject: parsed.relevanceToObject || null
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing AI artist verification response:', error);
      return null;
    }
  }

  // Market analysis methods
  async analyzeComparableSales(artistName, objectType, period, technique, description, currentValuation = null) {
    
    try {
      
      // Run historical and live analysis in parallel
      const [historicalResult, liveResult] = await Promise.all([
        this.auctionetAPI.analyzeComparableSales(artistName, objectType, period, technique, currentValuation, this.searchQuerySSoT),
        this.auctionetAPI.analyzeLiveAuctions(artistName, objectType, period, technique, this.searchQuerySSoT)
      ]);
      
      // Combine historical and live data intelligently
      if (historicalResult || liveResult) {
        
        // Create SSoT for WORKING search queries (the ones that actually found data)
        const workingQueries = {
          historical: historicalResult?.actualSearchQuery || null,
          live: liveResult?.actualSearchQuery || null
        };
        
        // Determine the best working query for dashboard links (prioritize historical)
        const bestWorkingQuery = workingQueries.historical || workingQueries.live;
        
        if (workingQueries.historical !== workingQueries.live && workingQueries.historical && workingQueries.live) {
          console.log(`⚠️ SEARCH QUERY MISMATCH DETECTED:`);
          console.log(`   Historical query: "${workingQueries.historical}"`);
          console.log(`   Live query: "${workingQueries.live}"`);
        } else {
        }
        
        const combinedResult = {
          hasComparableData: !!(historicalResult || liveResult),
          dataSource: 'auctionet_comprehensive',
          
          // Historical data (if available)
          historical: historicalResult ? {
            priceRange: historicalResult.priceRange,
            confidence: historicalResult.confidence,
            analyzedSales: historicalResult.analyzedSales,
            totalMatches: historicalResult.totalMatches,
            marketContext: historicalResult.marketContext,
            trendAnalysis: historicalResult.trendAnalysis,
            recentSales: historicalResult.recentSales,
            limitations: historicalResult.limitations,
            exceptionalSales: historicalResult.exceptionalSales, // NEW: Pass through exceptional sales
            actualSearchQuery: historicalResult.actualSearchQuery, // NEW: Pass through actual search query
            searchStrategy: historicalResult.searchStrategy // NEW: Pass through search strategy
          } : null,
          
          // Live data (if available)
          live: liveResult ? {
            currentEstimates: liveResult.currentEstimates,
            currentBids: liveResult.currentBids,
            marketActivity: liveResult.marketActivity,
            marketSentiment: liveResult.marketSentiment,
            analyzedLiveItems: liveResult.analyzedLiveItems,
            totalMatches: liveResult.totalMatches,
            liveItems: liveResult.liveItems,
            actualSearchQuery: liveResult.actualSearchQuery, // NEW: Pass through actual search query
            searchStrategy: liveResult.searchStrategy // NEW: Pass through search strategy
          } : null,
          
          // Combined insights
          insights: this.generateCombinedInsights(historicalResult, liveResult, currentValuation),
          
          // Maintain backward compatibility
          priceRange: historicalResult?.priceRange || this.estimatePriceRangeFromLive(liveResult),
          confidence: this.calculateCombinedConfidence(historicalResult, liveResult),
          marketContext: this.generateCombinedMarketContext(historicalResult, liveResult)
        };
        
        return combinedResult;
      } else {
        console.log('❌ No market data found (neither historical nor live)');
        
        // Fallback to Claude analysis if no Auctionet data found
        return await this.analyzeComparableSalesWithClaude(artistName, objectType, period, technique, description);
      }
      
    } catch (error) {
      console.error('💥 Market analysis error, falling back to Claude:', error);
      
      // Fallback to Claude analysis on error
      return await this.analyzeComparableSalesWithClaude(artistName, objectType, period, technique, description);
    }
  }

  // NEW: Enhanced sales analysis that accepts search context for artist, brand, and freetext searches
  async analyzeSales(searchContext) {
    
    const {
      primarySearch,
      objectType,
      period,
      technique,
      analysisType,
      searchStrategy,
      confidence,
      termCount
    } = searchContext;
    
    // Store original SSoT query for logging purposes only
    const originalSSoTQuery = this.searchQuerySSoT ? this.searchQuerySSoT.getCurrentQuery() : null;
    
    let analysisResult;
    
    try {
      if (analysisType === 'artist') {
        analysisResult = await this.analyzeComparableSales(primarySearch, objectType, period, technique);
      } else if (analysisType === 'brand') {
        analysisResult = await this.analyzeComparableSales(primarySearch, objectType, period, technique);
      } else if (analysisType === 'freetext') {
        analysisResult = await this.analyzeComparableSales(primarySearch, objectType, period, technique);
      } else {
        analysisResult = await this.analyzeComparableSales(primarySearch, objectType, period, technique);
      }

      
      // Keep original SSoT query intact - NO OVERRIDES

      
      return analysisResult;

    } catch (error) {
      console.error('❌ Market analysis failed:', error);
      throw error;
    }
  }

  // NEW: Generate combined insights from historical and live data
  generateCombinedInsights(historicalResult, liveResult, currentValuation = null) {
    const insights = [];
    
    if (historicalResult && liveResult) {
      // Get market activity context first to inform all other insights
      const marketActivity = liveResult.marketActivity;
      const reserveMetPercentage = marketActivity ? marketActivity.reservesMetPercentage : null;
      const analyzedLiveItems = liveResult.analyzedLiveItems || 0;
      const totalBids = marketActivity ? marketActivity.totalBids : 0;
      const averageBidsPerItem = marketActivity ? marketActivity.averageBidsPerItem : 0;
      
      // MINIMUM SAMPLE SIZE CHECK: Need at least 4 live auctions for reliable reserve percentage statistics
      const hasReliableMarketData = analyzedLiveItems >= 4;
      const isWeakMarket = hasReliableMarketData && reserveMetPercentage !== null && reserveMetPercentage < 40;
      const isStrongMarket = hasReliableMarketData && reserveMetPercentage !== null && reserveMetPercentage > 70;
      
      // NEW: Create more specific bidding activity description
      function getBiddingActivityDescription() {
        const searchQuery = historicalResult.actualSearchQuery || liveResult.actualSearchQuery || '';
        let auctionText = `${analyzedLiveItems} auktioner`;
        
        // Add clickable link if we have a search query (similar to "Pågående" link in data sources)
        if (searchQuery) {
          // SAFETY CHECK: Use fallback URL generation since this is a nested function
          const liveUrl = `https://auctionet.com/sv/search?event_id=&q=${encodeURIComponent(searchQuery)}`;
          auctionText = `<a href="${liveUrl}" target="_blank" style="color: #e74c3c; text-decoration: none; font-weight: 500;" title="Visa alla pågående auktioner på Auctionet för '${searchQuery}'">${analyzedLiveItems} auktioner</a>`;
        }
        
        if (totalBids === 0) {
          return `inga bud (${auctionText})`;
        } else if (reserveMetPercentage === 0) {
          return `bud finns men 0% utrop nås (${Math.round(averageBidsPerItem * 10) / 10} bud/auktion, ${auctionText})`;
        } else {
          return `${reserveMetPercentage}% utrop nås (${auctionText})`;
        }
      }
      

      
      // CRITICAL FIX: Check if priceRange exists before accessing its properties
      if (!historicalResult.priceRange || !historicalResult.priceRange.low || !historicalResult.priceRange.high) {
        console.warn('⚠️ Historical result missing priceRange data, skipping price comparison insights');
        return insights; // Return early with empty insights
      }
      
      // Compare historical vs live pricing WITH market context
      const histAvg = (historicalResult.priceRange.low + historicalResult.priceRange.high) / 2;
      const liveAvg = liveResult.currentEstimates ? 
        (liveResult.currentEstimates.low + liveResult.currentEstimates.high) / 2 : null;
      
      if (liveAvg && currentValuation) {
        // SMART LOGIC: Consider cataloger's current valuation in context
        const priceDiff = ((liveAvg - histAvg) / histAvg) * 100;
        const catalogerVsHist = ((currentValuation - histAvg) / histAvg) * 100;
        const catalogerVsLive = ((currentValuation - liveAvg) / liveAvg) * 100;
        
        // Only provide insights if the difference is significant
        if (Math.abs(priceDiff) > 15) {
          let message = '';
          let significance = 'medium';
          
          // CONTEXT-AWARE LOGIC: Consider market strength AND cataloger's position
          if (isWeakMarket) {
            // WEAK MARKET: Be more conservative with all recommendations
            if (catalogerVsHist > 50) {
              // Cataloger is above historical in weak market - definitely too high
              message = `Svag marknad (${getBiddingActivityDescription()}) och din värdering ${Math.round(catalogerVsHist)}% över historiska värden - sänk betydligt`;
              significance = 'high';
            } else if (priceDiff > 30) {
              // Live estimates are high but market is weak - be cautious
              message = `Trots att pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar är marknaden svag (${getBiddingActivityDescription()}) - var försiktig`;
              significance = 'high';
            } else if (catalogerVsLive > 20) {
              // Cataloger above live estimates in weak market
              message = `Svag marknad (${getBiddingActivityDescription()}) - din värdering ligger över pågående auktioner, överväg att sänka`;
              significance = 'medium';
            }
          } else if (isStrongMarket) {
            // STRONG MARKET: Be more optimistic but still realistic
            if (catalogerVsHist < -20 && priceDiff > 30) {
              // Cataloger is conservative but market is strong and live is high
              message = `Stark marknad (${getBiddingActivityDescription()}) och pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar - överväg att höja`;
              significance = 'medium';
            } else if (catalogerVsHist > 100) {
              // Even in strong market, don't be too aggressive
              message = `Trots stark marknad (${getBiddingActivityDescription()}) är din värdering ${Math.round(catalogerVsHist)}% över historiska värden - överväg att sänka`;
              significance = 'medium';
            } else if (priceDiff > 50) {
              // Live is much higher and market is strong
              message = `Stark marknad (${getBiddingActivityDescription()}) och pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar - gynnsam marknad`;
              significance = 'medium';
            }
          } else {
            // NORMAL MARKET: Use balanced logic
            if (catalogerVsHist > 100) {
              // Cataloger is way above historical
              if (priceDiff > 30) {
                // Live is also high, but cataloger is even worse
                message = `Pågående auktioner värderas ${Math.round(priceDiff)}% över historiska försäljningar, men din värdering är ${Math.round(catalogerVsHist)}% över - överväg att sänka`;
                significance = 'high';
              } else {
                // Live is reasonable, cataloger is the problem
                message = `Din värdering ligger ${Math.round(catalogerVsHist)}% över historiska värden - överväg att sänka`;
                significance = 'high';
              }
            } else if (catalogerVsHist > 50) {
              // Cataloger is moderately above historical
              if (priceDiff > 50) {
                // Live is much higher, maybe market is heating up
                message = `Pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar - marknad kan vara starkare`;
                significance = 'medium';
              } else {
                // Live is moderately higher, cataloger should be cautious
                message = `Både pågående auktioner och din värdering ligger över historiska värden - överväg försiktig prissättning`;
                significance = 'medium';
              }
            } else if (catalogerVsHist < -20) {
              // Cataloger is below historical
              if (priceDiff > 30) {
                // Live is much higher, cataloger might be too conservative
                message = `Pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar - överväg att höja utropet`;
                significance = 'medium';
              }
            } else {
              // Cataloger is reasonably close to historical
              if (priceDiff > 50) {
                // Live is much higher
                message = `Pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar - stark marknad för liknande objekt`;
                significance = 'medium';
              } else if (priceDiff < -30) {
                // Live is much lower
                message = `Pågående auktioner värderas ${Math.abs(Math.round(priceDiff))}% lägre än historiska försäljningar - marknad kan vara svagare`;
                significance = 'medium';
              }
            }
          }
          
          if (message) {
            insights.push({
              type: 'price_comparison',
              message: message,
              significance: significance
            });
          }
        }
      } else if (liveAvg && !currentValuation) {
        // Fallback to old logic if no current valuation provided, but still consider market context
        const priceDiff = ((liveAvg - histAvg) / histAvg) * 100;
        if (Math.abs(priceDiff) > 15) {
          let message = '';
          let significance = Math.abs(priceDiff) > 30 ? 'high' : 'medium';
          
          if (isWeakMarket && priceDiff > 15) {
            // In weak market, be cautious about higher live estimates
            message = `KONFLIKT: Pågående auktioner värderas ${Math.round(priceDiff)}% högre än slutpriser, men marknaden är svag (${getBiddingActivityDescription()}) - höga utrop möter låg efterfrågan`;
            significance = 'high';
          } else if (!hasReliableMarketData && reserveMetPercentage !== null && reserveMetPercentage < 40 && priceDiff > 15) {
            // Even with limited data, warn about weak market indicators
            message = `VARNING: Pågående auktioner värderas ${Math.round(priceDiff)}% högre än slutpriser, men ${getBiddingActivityDescription()} - höga utrop möter låg efterfrågan`;
            significance = 'high';
          } else if (isStrongMarket && priceDiff > 15) {
            // In strong market, higher estimates are more reliable
            message = `Stark marknad (${getBiddingActivityDescription()}) och pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar - gynnsam marknad`;
            significance = 'medium';
          } else {
            // Normal market logic
            if (priceDiff > 30) {
              message = `Pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar`;
            } else if (priceDiff > 15) {
              message = `Pågående auktioner värderas ${Math.round(priceDiff)}% högre än historiska försäljningar - nuvarande marknad verkar starkare`;
            } else if (priceDiff < -30) {
              message = `Pågående auktioner värderas ${Math.abs(Math.round(priceDiff))}% lägre än historiska försäljningar`;
            } else if (priceDiff < -15) {
              message = `Pågående auktioner värderas ${Math.abs(Math.round(priceDiff))}% lägre än historiska försäljningar - nuvarande marknad verkar svagare`;
            }
          }
          
          if (message) {
            insights.push({
              type: 'price_comparison',
              message: message,
              significance: significance
            });
          }
        }
      }
      
      // Market activity insights - but don't duplicate if already mentioned in price comparison
      if (marketActivity && hasReliableMarketData && !insights.some(insight => insight.message.includes('utrop nås') || insight.message.includes('inga bud') || insight.message.includes('bud finns'))) {
        if (reserveMetPercentage > 70) {
          insights.push({
            type: 'market_strength',
            message: `Stark marknad: ${getBiddingActivityDescription()} - gynnsam försäljningsmiljö`,
            significance: 'high'
          });
        } else if (reserveMetPercentage < 30) {
          if (totalBids === 0) {
            insights.push({
              type: 'market_weakness',
              message: `Utmanande marknad: ${getBiddingActivityDescription()} - överväg försiktig prissättning`,
              significance: 'high'
            });
          } else {
            insights.push({
              type: 'market_weakness',
              message: `Utmanande marknad: ${getBiddingActivityDescription()} - överväg försiktig prissättning`,
              significance: 'medium'
            });
          }
        }
      } else if (marketActivity && !hasReliableMarketData && analyzedLiveItems > 0) {
        // Alternative message when we have some live data but not enough for reliable statistics
        if (totalBids === 0) {
          insights.push({
            type: 'market_info',
            message: `Begränsad marknadsdata: ${getBiddingActivityDescription()} - för få för pålitlig marknadsanalys`,
            significance: 'medium'
          });
        } else {
          insights.push({
            type: 'market_info',
            message: `Begränsad marknadsdata: Endast ${analyzedLiveItems} pågående auktioner analyserade - för få för pålitlig marknadsanalys`,
            significance: 'low'
          });
        }
      }
    }
    
    return insights;
  }

  // NEW: Calculate combined confidence from both data sources
  calculateCombinedConfidence(historicalResult, liveResult) {
    if (historicalResult && liveResult) {
      // Both sources available - higher confidence
      return Math.min(1.0, (historicalResult.confidence + 0.2));
    } else if (historicalResult) {
      return historicalResult.confidence;
    } else if (liveResult) {
      // Live data only - moderate confidence
      return Math.min(0.8, 0.5 + (liveResult.analyzedLiveItems / 20));
    }
    return 0.3;
  }

  // NEW: Estimate price range from live auction data
  estimatePriceRangeFromLive(liveResult) {
    if (!liveResult || !liveResult.currentEstimates) {
      return null;
    }
    
    return {
      low: liveResult.currentEstimates.low,
      high: liveResult.currentEstimates.high,
      currency: 'SEK'
    };
  }

  // NEW: Generate combined market context
  generateCombinedMarketContext(historicalResult, liveResult) {
    const contexts = [];
    
    if (historicalResult?.marketContext) {
      contexts.push(historicalResult.marketContext);
    }
    
    if (liveResult?.marketSentiment) {
      const sentimentMap = {
        'strong': 'Stark efterfrågan i pågående auktioner',
        'moderate': 'Måttlig aktivitet i pågående auktioner', 
        'weak': 'Låg aktivitet i pågående auktioner',
        'neutral': 'Normal aktivitet i pågående auktioner'
      };
      contexts.push(sentimentMap[liveResult.marketSentiment] || 'Pågående auktionsaktivitet');
    }
    
    return contexts.join(' • ');
  }

  // Fallback method using Claude AI (original implementation)
  async analyzeComparableSalesWithClaude(artistName, objectType, period, technique, description) {
    
    if (!this.apiKey) {
      console.log('❌ No API key available, skipping Claude sales analysis');
      return null;
    }

    // Only analyze if we have sufficient information
    if (!artistName || artistName.trim().length < 3) {
      return null;
    }

    
    try {
      const prompt = `Analysera jämförbara försäljningar för denna svenska auktionspost:

KONSTNÄR: ${artistName}
OBJEKTTYP: ${objectType || 'Okänd'}
PERIOD: ${period || 'Okänd'}
TEKNIK: ${technique || 'Okänd'}
BESKRIVNING: ${description ? description.substring(0, 200) : 'Ingen beskrivning'}

Som expert på svensk konstmarknad, analysera:

1. JÄMFÖRBARA FÖRSÄLJNINGAR:
   - Prisintervall för liknande verk av denna konstnär
   - Senaste marknadsaktivitet (om känd)
   - Faktorer som påverkar värdering

2. KONFIDENSANALYS:
   - Hur säker är denna analys? (0.1-1.0)
   - Vad baseras analysen på?
   - Begränsningar i data

3. MARKNADSKONTEXT:
   - Konstnärens marknadsstatus
   - Trend för denna typ av verk
   - Regionala faktorer (svensk/nordisk marknad)

Svara ENDAST med giltig JSON:
{
  "hasComparableData": boolean,
  "priceRange": {
    "low": number (SEK),
    "high": number (SEK),
    "currency": "SEK"
  },
  "confidence": number (0.1-1.0),
  "confidenceFactors": {
    "artistRecognition": number (0.1-1.0),
    "dataAvailability": number (0.1-1.0),
    "marketActivity": number (0.1-1.0),
    "comparabilityQuality": number (0.1-1.0)
  },
  "marketContext": {
    "artistStatus": string,
    "marketTrend": string,
    "recentActivity": string
  },
  "comparableSales": [
    {
      "description": string,
      "priceRange": string,
      "relevance": number (0.1-1.0)
    }
  ],
  "limitations": string,
  "reasoning": string
}`;

      console.log('📤 Sending Claude comparable sales request via Chrome runtime...');

      // Use Chrome runtime messaging instead of direct fetch
      const response = await new Promise((resolve, reject) => {
        console.log('📨 Calling chrome.runtime.sendMessage for Claude sales analysis...');
        
        chrome.runtime.sendMessage({
          type: 'anthropic-fetch',
          apiKey: this.apiKey,
          body: {
            model: this.getCurrentModel().id,
            max_tokens: 1000,
            temperature: 0.1, // Low temperature for consistent analysis
            messages: [{
              role: 'user',
              content: prompt
            }]
          }
        }, (response) => {
          console.log('📥 Chrome runtime response received:', response);
          
          if (chrome.runtime.lastError) {
            console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response);
          } else {
            console.error('❌ Chrome runtime failed:', response);
            reject(new Error(response?.error || 'API request failed'));
          }
        });
      });


      if (response.success && response.data?.content?.[0]?.text) {
        const content = response.data.content[0].text;

        // Parse JSON response with fallback
        let salesData;
        try {
          salesData = JSON.parse(content);
        } catch (parseError) {
          console.warn('⚠️ JSON parsing failed, attempting fallback parsing:', parseError);
          salesData = this.fallbackParseSalesData(content);
        }

        if (salesData && salesData.hasComparableData) {
          // Mark as AI estimate
          salesData.dataSource = 'claude_ai_estimate';
          return salesData;
        } else {
          console.log('❌ No comparable sales data found in Claude response');
          return null;
        }
      } else {
        console.error('❌ Invalid Claude comparable sales response structure:', response);
        return null;
      }
    } catch (error) {
      console.error('💥 Error in Claude comparable sales analysis:', error);
      console.error('💥 Error stack:', error.stack);
      return null;
    }
  }

  // Fallback parser for sales data if JSON parsing fails
  fallbackParseSalesData(content) {
    
    try {
      // Look for price ranges in the text
      const priceMatch = content.match(/(\d+[\s,]*\d*)\s*-\s*(\d+[\s,]*\d*)\s*(?:SEK|kr|kronor)/i);
      const confidenceMatch = content.match(/confidence["\s:]*(\d+\.?\d*)/i);
      
      if (priceMatch) {
        const low = parseInt(priceMatch[1].replace(/[\s,]/g, ''));
        const high = parseInt(priceMatch[2].replace(/[\s,]/g, ''));
        const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.3;
        
        return {
          hasComparableData: true,
          priceRange: {
            low: low,
            high: high,
            currency: "SEK"
          },
          confidence: Math.min(confidence, 1.0),
          confidenceFactors: {
            artistRecognition: 0.5,
            dataAvailability: 0.3,
            marketActivity: 0.4,
            comparabilityQuality: 0.4
          },
          marketContext: {
            artistStatus: "Analys från textparsning",
            marketTrend: "Begränsad data",
            recentActivity: "Okänd"
          },
          comparableSales: [],
          limitations: "Begränsad analys från textparsning",
          reasoning: "Fallback-analys använd på grund av JSON-parsningsfel"
        };
      }
    } catch (error) {
      console.error('Fallback parsing failed:', error);
    }
    
    return null;
  }

  // NEW: Set SearchQuerySSoT for AI-only search decisions
  setSearchQuerySSoT(searchQuerySSoT) {
    this.searchQuerySSoT = searchQuerySSoT;
  }

  // NEW: AI-powered search term extraction
  async generateAISearchTerms(prompt) {
    try {
      
      const response = await this.callClaudeAPI({
        title: 'AI Search Term Extraction',
        description: prompt
      }, 'search_query');
      
      // Parse the JSON response
      let parsedResponse;
      try {
        // Handle markdown code blocks
        let cleanResponse = response;
        if (response.includes('```json')) {
          cleanResponse = response
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();
        }
        
        parsedResponse = JSON.parse(cleanResponse);
        
        return parsedResponse;
      } catch (parseError) {
        console.error('❌ AI Manager: Failed to parse JSON:', parseError);
        throw new Error('Invalid JSON in AI response');
      }
      
    } catch (error) {
      console.error('❌ AI Manager: AI search term generation failed:', error);
      throw error;
    }
  }
} 