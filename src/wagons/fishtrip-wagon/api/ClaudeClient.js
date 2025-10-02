// Claude API Client for FishTrip Wagon
// AI-powered fishing intelligence using Claude 3.5 Sonnet
// Handles Swedish fishing locations, species, and conditions

class ClaudeClient {
  constructor() {
    // Use Firebase Functions as proxy instead of direct API calls
    this.baseUrl = 'https://us-central1-b8shield-reseller-app.cloudfunctions.net';
    this.model = 'claude-3-5-sonnet-20241022';
  }

  async makeRequest(prompt, options = {}) {
    try {
      console.log('🤖 Claude: Making AI request via Firebase Functions');
      
      const response = await fetch(`${this.baseUrl}/getFishTripAIAnalysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: options.model || this.model,
          maxTokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          userId: options.userId || 'default'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claude API error: ${response.status} - ${errorData.details || errorData.error}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate AI analysis');
      }

      console.log('✅ Claude: AI analysis generated successfully');
      return result.content;
    } catch (error) {
      console.error('Claude API request failed:', error);
      throw error;
    }
  }

  // Helper to extract key weather info without JSON dump
  extractWeatherSummary(weather) {
    if (!weather || !weather.current) return 'Väderdata ej tillgänglig';
    
    const temp = weather.current.temperature || 'okänd';
    const wind = weather.current.windSpeed || 'okänd';
    const conditions = weather.current.conditions || 'okänt';
    
    return `${temp}°C, vind ${wind} m/s, ${conditions}`;
  }

  // Helper to extract key water info without JSON dump
  extractWaterSummary(water) {
    if (!water) return 'Vattendata ej tillgänglig';
    
    const temp = water.temperature || 'okänd';
    const level = water.level || 'okänd';
    
    return `Temp: ${temp}°C, Nivå: ${level}`;
  }

  // Analyze fishing location with AI enhancement
  async analyzeFishingLocation(locationData) {
    const weatherSummary = this.extractWeatherSummary(locationData.weather);
    const waterSummary = this.extractWaterSummary(locationData.waterConditions);
    
    const prompt = `Analysera fiskemöjligheter för:

Plats: ${locationData.name}
Koordinater: ${locationData.lat}°N, ${locationData.lon}°E
Väder: ${weatherSummary}
Vatten: ${waterSummary}

Ge kort analys med:
1. Troliga fiskarter
2. Bästa fisketider
3. Rekommenderade beten
4. Fiskemöjligheter (0-100)

Max 300 ord.`;

    return await this.makeRequest(prompt);
  }

  // Discover nearby waters with AI intelligence
  async discoverNearbyWaters(lat, lon, locationName) {
    const prompt = `Hitta 5 närliggande fiskvatten runt ${locationName} (${lat}°N, ${lon}°E).

För varje vatten ange:
- Namn och avstånd
- Huvudfiskarter
- Typ (sjö/älv)

Max 200 ord.`;

    return await this.makeRequest(prompt);
  }

  // Generate multi-day fishing trip plan
  async generateTripPlan(locationData, days = 3) {
    const weatherSummary = this.extractWeatherSummary(locationData.weather);
    
    const prompt = `Planera ${days}-dagars fiskeresa till ${locationData.name}.

Väder: ${weatherSummary}

Skapa dag-för-dag plan:
1. Bästa fiskeplats
2. Fisketider
3. Tekniker och beten
4. Väderanpassningar

Max 400 ord.`;

    return await this.makeRequest(prompt);
  }

  // Enhance water quality analysis with AI
  async enhanceWaterAnalysis(waterData, locationName) {
    const waterSummary = this.extractWaterSummary(waterData);
    
    const prompt = `Analysera vattenförhållanden för fiske i ${locationName}:

${waterSummary}

Förklara:
1. Påverkan på fisk
2. Bästa djup att fiska
3. Rekommenderade beten
4. Optimala tider

Max 250 ord.`;

    return await this.makeRequest(prompt);
  }

  // Generate fishing intelligence summary
  async generateFishingIntelligence(allData) {
    const location = allData.location?.name || 'Okänd plats';
    const score = allData.fishingScore || 0;
    const weatherSummary = this.extractWeatherSummary(allData.weather);
    const waterSummary = this.extractWaterSummary(allData.water);
    
    const prompt = `Fiskeintelligensrapport för ${location}:

Poäng: ${score}/100
Väder: ${weatherSummary}
Vatten: ${waterSummary}

Ge kort rapport med:
1. Sammanfattning
2. Bästa fisketider
3. Rekommenderade tekniker
4. Säkerhetsaspekter

Max 300 ord.`;

    return await this.makeRequest(prompt);
  }
}

export default ClaudeClient; 