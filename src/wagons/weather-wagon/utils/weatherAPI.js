// weatherAPI.js - Free API integrations for The Weather Wagon
// Self-contained API utilities using only free/open data sources
// NOW FOCUSED ON 7-10 DAY FORECASTS for fishing trip planning
// ENHANCED WITH WATER LEVEL AND TEMPERATURE DATA

// SMHI (Swedish Meteorological and Hydrological Institute) - FREE
const SMHI_BASE_URL = 'https://opendata-download-metfcst.smhi.se/api';
const SMHI_WEATHER_URL = `${SMHI_BASE_URL}/category/pmp3g/version/2/geotype/point`;

// SMHI Hydrology API endpoints (corrected and expanded)
const SMHI_HYDRO_ENDPOINTS = {
  // Water level observations (real vattenstånd - variation from normal)
  waterLevel: 'https://opendata-download-hydro.smhi.se/api/category/vatten/version/1/geotype/point',
  
  // Water flow/discharge (vattenföring) 
  waterFlow: 'https://opendata-download-hydro.smhi.se/api/category/vatten/version/1/geotype/point',
  
  // Water temperature in streams/rivers
  waterTemp: 'https://opendata-download-hydro.smhi.se/api/category/vatten/version/1/geotype/point',
  
  // Ice conditions
  iceThickness: 'https://opendata-download-hydro.smhi.se/api/category/vatten/version/1/geotype/point',
  iceConditions: 'https://opendata-download-hydro.smhi.se/api/category/vatten/version/1/geotype/point',
  
  // Water quality (from marine/lake monitoring)
  waterQuality: 'https://sharkweb.smhi.se/api/dataset'
};

// SMHI Parameter IDs for hydrological data
const HYDRO_PARAMETERS = {
  waterLevel: 3,        // Vattenstånd (water level variation)
  waterFlow: 1,         // Vattenföring (water discharge m³/s)  
  waterTemp: 4,         // Vattentemperatur (water temperature °C)
  iceThickness: 5,      // Istjocklek (ice thickness cm)
  oxygenLevel: 14,      // Syrgashalt (oxygen mg/l)
  pH: 13,               // pH value
  turbidity: 15         // Turbiditet (water clarity)
};

// Geocoding - Use OpenStreetMap Nominatim (FREE)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Water level and temperature parameter IDs (based on SMHI API documentation)
const WATER_LEVEL_PARAMETER = 'vattenstand'; // Water level parameter
const WATER_TEMP_PARAMETER = 'vattentemperatur'; // Water temperature parameter

// Moon phase calculation (built-in, no API needed)
const getMoonPhase = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Simple lunar phase calculation
  const c = Math.floor((year - 1) / 100);
  const e = 2 - c + Math.floor(c / 4);
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + e - 1524.5;
  const daysSinceNew = (jd - 2451549.5) % 29.53;
  
  let phase = '';
  let illumination = 0;
  
  if (daysSinceNew < 1) {
    phase = 'Nymåne';
    illumination = 0;
  } else if (daysSinceNew < 7.4) {
    phase = 'Tilltagande måne';
    illumination = Math.round((daysSinceNew / 7.4) * 50);
  } else if (daysSinceNew < 8.4) {
    phase = 'Första kvarteret';
    illumination = 50;
  } else if (daysSinceNew < 14.8) {
    phase = 'Tilltagande måne';
    illumination = Math.round(50 + ((daysSinceNew - 8.4) / 6.4) * 50);
  } else if (daysSinceNew < 15.8) {
    phase = 'Fullmåne';
    illumination = 100;
  } else if (daysSinceNew < 22.1) {
    phase = 'Avtagande måne';
    illumination = Math.round(100 - ((daysSinceNew - 15.8) / 6.3) * 50);
  } else if (daysSinceNew < 23.1) {
    phase = 'Sista kvarteret';
    illumination = 50;
  } else {
    phase = 'Avtagande måne';
    illumination = Math.round(50 - ((daysSinceNew - 23.1) / 6.4) * 50);
  }
  
  return { phase, illumination };
};

// Get coordinates from location name
export const geocodeLocation = async (locationName) => {
  try {
    // Clean and prepare the location string
    const cleanLocation = locationName.replace(/,\s*/g, ' ').trim();
    
    // Build the request with proper headers
    const params = new URLSearchParams({
      q: cleanLocation,
      countrycodes: 'se', // Use countrycodes instead of country
      format: 'json',
      limit: '5',
      addressdetails: '1'
    });
    
    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'B8Shield-Weather-Wagon/1.0 (Swedish Fishing App)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status} ${response.statusText}`);
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const results = await response.json();
    
    if (!results || results.length === 0) {
      // Try with simplified query if initial search failed
      const simplifiedLocation = locationName.split(',')[0].trim(); // Just take the first part
      const simplifiedParams = new URLSearchParams({
        q: simplifiedLocation,
        countrycodes: 'se',
        format: 'json',
        limit: '3'
      });
      
      const fallbackResponse = await fetch(`${NOMINATIM_BASE_URL}/search?${simplifiedParams}`, {
        headers: {
          'User-Agent': 'B8Shield-Weather-Wagon/1.0 (Swedish Fishing App)',
          'Accept': 'application/json'
        }
      });
      
      if (fallbackResponse.ok) {
        const fallbackResults = await fallbackResponse.json();
        if (fallbackResults && fallbackResults.length > 0) {
          return fallbackResults.map(result => ({
            name: result.display_name,
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            type: result.type || 'unknown',
            importance: result.importance || 0.5
          }));
        }
      }
      
      throw new Error('Location not found');
    }
    
    return results.map(result => ({
      name: result.display_name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      type: result.type || 'unknown',
      importance: result.importance || 0.5
    }));
    
  } catch (error) {
    console.error('Geocoding error:', error);
    
    // Try hardcoded coordinates for common Swedish fishing locations as fallback
    const knownLocations = {
      'kultsjön': { lat: 65.4167, lon: 17.1167, name: 'Kultsjön, Saxnäs, Västerbotten' },
      'saxnäs': { lat: 65.4167, lon: 17.1167, name: 'Saxnäs, Västerbotten' },
      'vänern': { lat: 58.9500, lon: 13.5000, name: 'Vänern, Sverige' },
      'vättern': { lat: 58.3000, lon: 14.6000, name: 'Vättern, Sverige' },
      'siljan': { lat: 60.8000, lon: 14.8000, name: 'Siljan, Dalarna' },
      'storsjön': { lat: 63.1800, lon: 14.6400, name: 'Storsjön, Jämtland' },
      'bolmen': { lat: 56.9000, lon: 13.5000, name: 'Bolmen, Småland' }
    };
    
    const searchKey = locationName.toLowerCase().split(',')[0].trim();
    const knownLocation = knownLocations[searchKey];
    
    if (knownLocation) {
      console.log(`Using fallback coordinates for ${locationName}`);
      return [{
        name: knownLocation.name,
        lat: knownLocation.lat,
        lon: knownLocation.lon,
        type: 'lake',
        importance: 0.8
      }];
    }
    
    throw error;
  }
};

// COMPLETELY REDESIGNED: Realistic fishing score calculation for Swedish conditions
// 100/100 = Truly exceptional, once-a-week perfect conditions
// 80+ = Very good fishing day, experienced anglers will have success  
// 60-79 = Good conditions, decent fishing expected
// 40-59 = Fair conditions, challenging but fishable
// 20-39 = Poor conditions, difficult fishing
// 0-19 = Terrible conditions, avoid fishing

const calculateDailyFishingScore = (day, waterData = null) => {
  let score = 0;
  let factors = [];
  
  // PERFECT CONDITIONS FOR 100/100 SCORE:
  // - Overcast, light wind (2-4 m/s), stable pressure, no rain
  // - Water temp 12-16°C, high oxygen, clear water, stable levels
  // - New/full moon, peak season (May-June, Aug-Sep)
  
  console.log(`🎣 Calculating realistic fishing score for ${day.date}`);
  
  // 1. WEATHER CONDITIONS (40 points max - most critical)
  let weatherScore = 0;
  
  // Wind analysis (15 points max)
  const windAvg = day.windAvg || 0;
  if (windAvg <= 1) {
    weatherScore += 5; // Too calm, poor
    factors.push(`Mycket svag vind (${windAvg.toFixed(1)} m/s) - fisk inaktiv`);
  } else if (windAvg <= 3) {
    weatherScore += 15; // Perfect
    factors.push(`Optimal vind (${windAvg.toFixed(1)} m/s) - ideala förhållanden`);
  } else if (windAvg <= 5) {
    weatherScore += 12; // Very good
    factors.push(`Bra vind (${windAvg.toFixed(1)} m/s) - aktiva fiskar`);
  } else if (windAvg <= 8) {
    weatherScore += 8; // Decent
    factors.push(`Måttlig vind (${windAvg.toFixed(1)} m/s) - utmanande`);
  } else if (windAvg <= 12) {
    weatherScore += 3; // Poor
    factors.push(`Stark vind (${windAvg.toFixed(1)} m/s) - mycket svårt`);
  } else {
    weatherScore += 0; // Terrible
    factors.push(`Stormvind (${windAvg.toFixed(1)} m/s) - omöjligt fiske`);
  }
  
  // Pressure stability (10 points max)
  const pressure = day.pressureAvg || 1013;
  if (pressure >= 1020 && pressure <= 1030) {
    weatherScore += 10; // High, stable - perfect
    factors.push('Högtryck - stabila förhållanden');
  } else if (pressure >= 1010 && pressure <= 1025) {
    weatherScore += 7; // Good
    factors.push('Stabilt lufttryck - bra förhållanden');
  } else if (pressure >= 1000 && pressure <= 1015) {
    weatherScore += 4; // Changing
    factors.push('Växlande tryck - osäkra förhållanden');
  } else {
    weatherScore += 1; // Low pressure, storms
    factors.push('Lågtryck - instabila förhållanden');
  }
  
  // Precipitation (10 points max)
  const rain = day.precipTotal || 0;
  if (rain === 0) {
    weatherScore += 10; // Perfect
    factors.push('Ingen nederbörd - optimalt');
  } else if (rain <= 1) {
    weatherScore += 8; // Light drizzle can be good
    factors.push('Lätt duggregn - kan aktivera fisk');
  } else if (rain <= 5) {
    weatherScore += 4; // Light rain
    factors.push('Måttligt regn - utmanande');
  } else {
    weatherScore += 0; // Heavy rain
    factors.push('Kraftigt regn - dåliga förhållanden');
  }
  
  // Cloud cover (5 points max)
  // Note: We don't have direct cloud data, estimate from other factors
  if (rain > 0 || pressure < 1010) {
    weatherScore += 5; // Overcast is perfect for fishing
    factors.push('Molnigt - fisk mindre skygg');
  } else if (pressure > 1025) {
    weatherScore += 2; // Probably sunny
    factors.push('Sannolikt soligt - fisk mer försiktig');
  } else {
    weatherScore += 3; // Mixed
  }
  
  score += weatherScore;
  
  // 2. WATER CONDITIONS (30 points max - very important with our new data)
  let waterScore = 0;
  
  if (waterData && waterData.available) {
    // Water temperature (12 points max)
    if (waterData.temperature?.availability?.hasData) {
      const temp = waterData.temperature.current;
      if (temp >= 12 && temp <= 16) {
        waterScore += 12; // Perfect range
        factors.push(`Optimal vattentemperatur (${temp.toFixed(1)}°C)`);
      } else if (temp >= 8 && temp <= 20) {
        waterScore += 8; // Good range
        factors.push(`Bra vattentemperatur (${temp.toFixed(1)}°C)`);
      } else if (temp >= 4 && temp <= 24) {
        waterScore += 4; // Workable
        factors.push(`Acceptabel vattentemperatur (${temp.toFixed(1)}°C)`);
      } else {
        waterScore += 1; // Poor
        factors.push(`Extremtemperatur (${temp.toFixed(1)}°C) - svårt`);
      }
    }
    
    // Water level variation (8 points max)
    if (waterData.level?.availability?.hasData) {
      const variation = waterData.level.variation || 0;
      if (Math.abs(variation) <= 5) {
        waterScore += 8; // Stable levels
        factors.push('Stabila vattennivåer - förutsägbart');
      } else if (Math.abs(variation) <= 15) {
        waterScore += 5; // Some variation
        factors.push('Måttliga nivåförändringar');
      } else {
        waterScore += 2; // Extreme variation
        factors.push('Extrema nivåförändringar - opålitligt');
      }
    }
    
    // Water quality (10 points max)
    if (waterData.quality?.availability?.hasData) {
      const oxygen = waterData.quality.oxygen?.value || 0;
      const clarity = waterData.quality.clarity?.visibility || 0;
      
      if (oxygen >= 8) {
        waterScore += 5; // Excellent oxygen
        factors.push('Utmärkt syrgashalt - aktiva fiskar');
      } else if (oxygen >= 6) {
        waterScore += 3; // Good oxygen
        factors.push('Bra syrgashalt');
      } else if (oxygen >= 4) {
        waterScore += 1; // Poor oxygen
        factors.push('Låg syrgashalt - mindre aktivitet');
      }
      
      if (clarity >= 2 && clarity <= 4) {
        waterScore += 5; // Perfect clarity
        factors.push('Optimal sikt för fiske');
      } else if (clarity >= 1 && clarity <= 6) {
        waterScore += 3; // Good clarity
        factors.push('Bra sikt');
      } else {
        waterScore += 1; // Poor clarity
        factors.push('Dålig sikt - svår presentation');
      }
    }
  } else {
    // No water data - give average score
    waterScore += 15; // Assume decent conditions
    factors.push('Vattendata saknas - normala förhållanden antagna');
  }
  
  score += waterScore;
  
  // 3. MOON PHASE (15 points max - important for feeding behavior) 
  let moonScore = 0;
  const moonPhase = day.moon?.phase || '';
  const moonIllumination = day.moon?.illumination || 50;
  
  if (moonPhase.includes('Nymåne') || moonPhase.includes('Fullmåne')) {
    moonScore += 15; // Perfect - peak feeding times
    factors.push(`${moonPhase} - intensiv aktivitet`);
  } else if (moonIllumination <= 25 || moonIllumination >= 75) {
    moonScore += 10; // Good phases
    factors.push('Gynnsam månfas för fiske');
  } else {
    moonScore += 5; // Average
    factors.push('Normal månfas');
  }
  
  score += moonScore;
  
  // 4. SEASONAL FACTORS (15 points max)
  let seasonalScore = 0;
  const month = new Date(day.date).getMonth();
  const temp = day.tempAvg || 15;
  
  // Peak fishing months in Sweden
  if (month === 4 || month === 5) { // May-June
    seasonalScore += 15; // Spring peak
    factors.push('Vårtoppensäsong - förstklassigt fiske');
  } else if (month === 7 || month === 8) { // August-September  
    seasonalScore += 12; // Late summer good
    factors.push('Sensommarsäsong - tillförlitligt fiske');
  } else if (month === 6) { // July
    seasonalScore += 8; // Summer decent
    factors.push('Midsommarsäsong - stabilt fiske');
  } else if (month >= 9 && month <= 10) { // Autumn
    seasonalScore += 10; // Autumn good
    factors.push('Höstfiske - aktiva fiskar');
  } else {
    seasonalScore += 3; // Winter/early spring
    factors.push('Vinterfiske - tålmodig strategi krävs');
  }
  
  score += seasonalScore;
  
  // 5. PENALTY FACTORS (can reduce score significantly)
  
  // Extreme temperature penalty
  if (temp < 0 || temp > 30) {
    score -= 15;
    factors.push('Extremtemperatur - kraftigt nedsatt aktivitet');
  }
  
  // Very high wind penalty
  if (windAvg > 10) {
    score -= 10;
    factors.push('Farlig vind - säkerhetsrisk');
  }
  
  // Heavy rain penalty
  if (rain > 10) {
    score -= 10;
    factors.push('Skyfall - omöjliga förhållanden');
  }
  
  // Ensure score stays within 0-100 bounds
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  // Determine grade based on REALISTIC Swedish fishing standards
  let grade;
  if (score >= 90) {
    grade = { rating: 'Exceptionellt', color: 'green' }; // Once a week
  } else if (score >= 75) {
    grade = { rating: 'Mycket bra', color: 'green' }; // Good fishing day
  } else if (score >= 60) {
    grade = { rating: 'Bra', color: 'yellow' }; // Decent fishing
  } else if (score >= 40) {
    grade = { rating: 'Medel', color: 'orange' }; // Fair conditions
  } else if (score >= 20) {
    grade = { rating: 'Dåligt', color: 'orange' }; // Poor conditions
  } else {
    grade = { rating: 'Mycket dåligt', color: 'red' }; // Terrible
  }
  
  console.log(`🎣 Final realistic fishing score: ${score}/100 (${grade.rating})`);
  
  return {
    score,
    grade,
    factors: factors.slice(0, 6) // Limit to most important factors
  };
};

// Get SMHI weather forecast (NEW: Returns full 10-day forecast)
export const getSMHIWeatherForecast = async (lat, lon) => {
  try {
    const response = await fetch(
      `${SMHI_WEATHER_URL}/lon/${lon.toFixed(6)}/lat/${lat.toFixed(6)}/data.json`
    );
    
    if (!response.ok) {
      throw new Error('SMHI API request failed');
    }
    
    const data = await response.json();
    
    // Process SMHI data format
    const timeSeries = data.timeSeries || [];
    
    if (timeSeries.length === 0) {
      throw new Error('No forecast data available');
    }
    
    // Process into daily forecasts
    const dailyForecasts = processForecastData(timeSeries);
    
    return {
      location: {
        lat,
        lon,
        name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
      },
      updated: new Date().toISOString(),
      dailyForecasts,
      totalDays: dailyForecasts.length
    };
    
  } catch (error) {
    console.error('SMHI API error:', error);
    throw error;
  }
};

// NEW: Main function to get location weather forecast
export const getLocationWeatherForecast = async (locationName) => {
  try {
    console.log(`Getting enhanced weather forecast for: ${locationName}`);
    
    // Get coordinates
    const locations = await geocodeLocation(locationName);
    if (!locations || locations.length === 0) {
      throw new Error('Location not found');
    }
    
    const location = locations[0];
    const { lat, lon } = location;
    
    // Get weather forecast
    const weatherData = await getSMHIWeatherForecast(lat, lon);
    
          // COMPREHENSIVE HYDROLOGICAL DATA INTEGRATION
      console.log('🌊 Fetching comprehensive water data...');
      
      const [waterLevel, waterFlow, waterQuality, iceConditions] = await Promise.all([
        getWaterLevelData(lat, lon, location.name),
        getWaterFlowData(lat, lon, location.name),
        getWaterQualityData(lat, lon, location.name),
        getIceConditionsData(lat, lon, location.name)
      ]);

      // Enhanced water temperature (keeping existing for backward compatibility)
      const waterTemperature = await getWaterTemperatureData(lat, lon, location.name);
    
        // COMPREHENSIVE WATER DATA STRUCTURE
    const waterData = {
      // Core water parameters
      level: waterLevel,
      temperature: waterTemperature,
      flow: waterFlow,
      quality: waterQuality,
      ice: iceConditions,
      
      // Overall availability status
      available: !!(
        waterLevel?.availability?.hasData || 
        waterTemperature?.availability?.hasData || 
        waterFlow?.availability?.hasData ||
        waterQuality?.availability?.hasData ||
        iceConditions?.availability?.hasData
      ),
      
      // Detailed availability tracking
      availability: {
        level: waterLevel?.availability,
        temperature: waterTemperature?.availability,
        flow: waterFlow?.availability,
        quality: waterQuality?.availability,
        ice: iceConditions?.availability,
        hasAnyData: !!(
          waterLevel?.availability?.hasData || 
          waterTemperature?.availability?.hasData || 
          waterFlow?.availability?.hasData ||
          waterQuality?.availability?.hasData ||
          iceConditions?.availability?.hasData
        ),
        limitations: [],
        fishingInsights: []
      }
    };
    
    // Collect limitations and fishing insights
    const parameters = [
      { data: waterLevel, type: 'vattenstånd', name: 'water_level' },
      { data: waterTemperature, type: 'vattentemperatur', name: 'water_temperature' },
      { data: waterFlow, type: 'vattenföring', name: 'water_flow' },
      { data: waterQuality, type: 'vattenkvalitet', name: 'water_quality' },
      { data: iceConditions, type: 'isförhållanden', name: 'ice_conditions' }
    ];
    
    parameters.forEach(param => {
      if (param.data?.availability && !param.data.availability.hasData) {
        waterData.availability.limitations.push({
          type: param.name,
          parameter: param.type,
          message: param.data.availability.limitation || param.data.availability.message,
          suggestion: param.data.availability.suggestion
        });
      } else if (param.data?.availability?.hasData) {
        // Add fishing insights from available data
        if (param.data.fishingImpact) {
          waterData.availability.fishingInsights.push({
            type: param.name,
            parameter: param.type,
            insight: param.data.fishingImpact
          });
        }
        if (param.data.fishingAdvice) {
          waterData.availability.fishingInsights.push({
            type: param.name,
            parameter: param.type,
            insight: param.data.fishingAdvice
          });
        }
      }
    });
    
    // Process daily forecasts with enhanced scoring
    const enhancedForecasts = weatherData.dailyForecasts.map(day => {
      const fishingScore = calculateDailyFishingScore(day, waterData);
      return {
        ...day,
        fishing: {
          score: fishingScore.score,
          factors: fishingScore.factors,
          rating: fishingScore.grade.rating,
          color: fishingScore.grade.color
        },
        fishingScore, // Keep for backward compatibility
        waterData: waterData.available ? waterData : null
      };
    });
    
    // Find best fishing days (top 3)
    const bestDays = enhancedForecasts
      .filter(day => day.fishing && typeof day.fishing.score === 'number')  // Safety check
      .map((day, index) => ({ ...day, index }))
      .sort((a, b) => b.fishing.score - a.fishing.score)
      .slice(0, 3);
    
    return {
      location: {
        name: location.name,
        coordinates: { lat, lon }
      },
      dailyForecasts: enhancedForecasts,
      bestFishingDays: bestDays,
      waterData: waterData.available ? waterData : null,
      summary: {
        totalDays: enhancedForecasts.length,
        averageScore: Math.round(enhancedForecasts.reduce((sum, day) => sum + (day.fishing?.score || 0), 0) / enhancedForecasts.length),
        hasWaterData: waterData.available
      }
    };
    
  } catch (error) {
    console.error('Error getting enhanced location weather forecast:', error);
    throw error;
  }
};

// LEGACY: Keep the old function for backward compatibility
export const getLocationWeather = async (locationName) => {
  try {
    const forecast = await getLocationWeatherForecast(locationName);
    
    // Return today's forecast in old format for compatibility
    const today = forecast.dailyForecasts[0];
    if (!today) {
      throw new Error('No current weather data available');
    }
    
    return {
      location: forecast.location,
      timestamp: forecast.updated,
      weather: {
        temperature: today.tempAvg,
        windSpeed: today.windAvg,
        windDirection: null, // Not available in daily summary
        humidity: today.humidityAvg,
        pressure: today.pressureAvg,
        precipitation: today.precipTotal,
        visibility: null // Not available in daily summary
      },
      moon: today.moon,
      fishing: today.fishing
    };
    
  } catch (error) {
    console.error('Legacy weather error:', error);
    throw error;
  }
};

// ENHANCED WATER DATA INTEGRATION - Multiple SMHI API attempts
// Tries different SMHI endpoints to find water temperature and level data

// Known SMHI water data endpoints to try
const SMHI_WATER_ENDPOINTS = [
  {
    name: 'VattenWeb Model Data',
    baseUrl: 'https://vattenweb.smhi.se/api',
    type: 'model'
  },
  {
    name: 'SMHI OpenData Hydro',
    baseUrl: 'https://opendata.smhi.se/apidocs/hydrology',
    type: 'opendata'
  },
  {
    name: 'VattenWeb Station Data',
    baseUrl: 'https://vattenweb.smhi.se/station',
    type: 'station'
  }
];

// Major Swedish lakes with known monitoring (fallback coordinates)
const MAJOR_LAKE_STATIONS = {
  'vänern': { 
    lat: 58.9, lon: 13.3, 
    waterTemp: 12.5, waterLevel: 44.2, // Typical summer values
    station: 'Vänern-Mariestad'
  },
  'vättern': { 
    lat: 58.4, lon: 14.6, 
    waterTemp: 11.8, waterLevel: 88.1,
    station: 'Vättern-Jönköping'
  },
  'mälaren': { 
    lat: 59.4, lon: 17.0, 
    waterTemp: 13.2, waterLevel: 0.7,
    station: 'Mälaren-Stockholm'
  },
  'hjälmaren': { 
    lat: 59.2, lon: 15.8, 
    waterTemp: 12.1, waterLevel: 100.8,
    station: 'Hjälmaren-Örebro'
  },
  'storsjön': { 
    lat: 63.2, lon: 14.5, 
    waterTemp: 8.5, waterLevel: 291.3,
    station: 'Storsjön-Östersund'
  },
  'siljan': { 
    lat: 60.8, lon: 14.8, 
    waterTemp: 9.8, waterLevel: 162.1,
    station: 'Siljan-Rättvik'
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Helper function to find the nearest major lake
const findNearestMajorLake = (lat, lon) => {
  let nearestLake = null;
  let shortestDistance = Infinity;
  
  for (const [lakeName, station] of Object.entries(MAJOR_LAKE_STATIONS)) {
    const distance = calculateDistance(lat, lon, station.lat, station.lon);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestLake = lakeName;
    }
  }
  
  // Only suggest if within reasonable distance (~200km)
  return shortestDistance < 2.0 ? nearestLake : null;
};

// Enhanced water level data with REAL variation (not altitude!) - FIXED FALLBACK
export const getWaterLevelData = async (lat, lon, locationName = '') => {
  try {
    console.log(`🌊 Fetching REAL water level variation: ${locationName} (${lat}, ${lon})`);
    
    // IMMEDIATE FALLBACK: Check for major lake first (APIs are currently failing)
    const lakeName = identifyMajorLake(locationName, lat, lon);
    if (lakeName && MAJOR_LAKE_STATIONS[lakeName]) {
      const station = MAJOR_LAKE_STATIONS[lakeName];
      console.log(`📊 Using reference water level data for ${station.station}`);
      
      // Generate realistic seasonal variation
      const currentMonth = new Date().getMonth();
      const seasonalVariation = getSeasonalWaterLevelVariation(currentMonth);
      
      return {
        current: seasonalVariation, // FIXED: Only show variation from normal, not absolute level
        normal: 0, // Normal is the baseline (0 variation)
        variation: seasonalVariation,
        trend: seasonalVariation > 0 ? 'STIGANDE' : seasonalVariation < 0 ? 'SJUNKANDE' : 'STABIL',
        status: getWaterLevelStatus(seasonalVariation),
        unit: 'cm över medel',
        station: station.station,
        lastUpdated: new Date(),
        availability: {
          hasData: true,
          dataType: 'reference',
          message: `Referensdata för ${station.station}`,
          limitation: 'Beräknade variationsdata baserat på säsongsmodeller'
        }
      };
    }
    
    // Try SMHI hydrology API (currently failing - keeping for future)
    try {
      const response = await fetch(`${SMHI_HYDRO_ENDPOINTS.waterLevel}/lon/${lon}/lat/${lat}/data.json`, {
        headers: {
          'User-Agent': 'B8Shield-Weather-Wagon/1.0 (Swedish Fishing App)',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.timeSeries && data.timeSeries.length > 0) {
          const latest = data.timeSeries[data.timeSeries.length - 1];
          const current = parseFloat(latest.value);
          
          // Calculate variation from normal
          const normalLevel = calculateNormalLevel(data.timeSeries, new Date());
          const variation = current - normalLevel;
          
          return {
            current: current,
            normal: normalLevel,
            variation: variation,
            trend: calculateLevelTrend(data.timeSeries),
            status: getWaterLevelStatus(variation),
            unit: 'cm över medel',
            station: data.station?.name || `Station ${data.station?.id}`,
            lastUpdated: new Date(latest.date),
            availability: {
              hasData: true,
              dataType: 'measured',
              message: `Vattenstånd från ${data.station?.name || 'mätstation'}`
            }
          };
        }
      }
    } catch (apiError) {
      console.log('SMHI API failed, using reference data if available');
    }
    
    // No data available
    return {
      availability: {
        hasData: false,
        message: 'Vattenstånd-data ej tillgänglig för denna plats',
        limitation: 'SMHI mäter endast vattenstånd vid utvalda sjöar och vattendrag',
        suggestion: 'Prova större sjöar som Vänern, Vättern, Mälaren eller större vattendrag'
      }
    };
    
  } catch (error) {
    console.error('Error fetching water level data:', error);
    return {
      availability: {
        hasData: false, 
        message: 'Fel vid hämtning av vattenstånd-data',
        limitation: error.message
      }
    };
  }
};

// Helper function for seasonal water level variation
const getSeasonalWaterLevelVariation = (month) => {
  // Realistic Swedish lake level variations by month
  const seasonalVariations = {
    0: -8,   // January (frozen, lower)
    1: -10,  // February (lowest)
    2: -5,   // March (ice melting)
    3: 15,   // April (spring flood)
    4: 20,   // May (peak spring levels)
    5: 8,    // June (high but declining)
    6: 2,    // July (summer normal)
    7: -2,   // August (slightly low)
    8: -3,   // September (low)
    9: 0,    // October (autumn rains)
    10: 5,   // November (autumn high)
    11: -2   // December (winter decline)
  };
  
  return seasonalVariations[month] || 0;
};

// NEW: Water flow data (vattenföring) - FIXED FALLBACK for major lakes
export const getWaterFlowData = async (lat, lon, locationName = '') => {
  try {
    console.log(`🌊 Fetching water flow data: ${locationName}`);
    
    // IMMEDIATE FALLBACK: Major lakes have inflow/outflow data
    const lakeName = identifyMajorLake(locationName, lat, lon);
    if (lakeName && MAJOR_LAKE_STATIONS[lakeName]) {
      const station = MAJOR_LAKE_STATIONS[lakeName];
      console.log(`📊 Using reference flow data for ${station.station}`);
      
      // Realistic flow data for major Swedish lakes
      const referenceFlow = getLakeFlowData(lakeName);
      
      return {
        current: referenceFlow.current,
        normal: referenceFlow.normal,
        variation: referenceFlow.variation,
        trend: referenceFlow.trend,
        status: referenceFlow.status,
        unit: 'm³/s',
        station: `${station.station} (in/utflöde)`,
        fishingImpact: getFlowFishingAdvice(referenceFlow.current, referenceFlow.normal),
        availability: {
          hasData: true,
          dataType: 'reference',
          message: `Referensdata för ${station.station} vattenföring`,
          limitation: 'Beräknat flöde baserat på sjöstorlek och säsong'
        }
      };
    }
    
    // Try SMHI API (currently failing)
    try {
      const response = await fetch(`${SMHI_HYDRO_ENDPOINTS.waterFlow}/lon/${lon}/lat/${lat}/data.json`, {
        headers: {
          'User-Agent': 'B8Shield-Weather-Wagon/1.0 (Swedish Fishing App)',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.timeSeries && data.timeSeries.length > 0) {
          const latest = data.timeSeries[data.timeSeries.length - 1];
          const current = parseFloat(latest.value);
          const normal = calculateNormalFlow(data.timeSeries, new Date());
          
          return {
            current: current,
            normal: normal,
            variation: ((current - normal) / normal * 100),
            trend: calculateFlowTrend(data.timeSeries),
            status: getFlowStatus(current, normal),
            unit: 'm³/s',
            station: data.station?.name,
            fishingImpact: getFlowFishingAdvice(current, normal),
            availability: {
              hasData: true,
              dataType: 'measured',
              message: `Vattenföring från ${data.station?.name}`
            }
          };
        }
      }
    } catch (apiError) {
      console.log('SMHI flow API failed, no reference data available');
    }
    
    return {
      availability: {
        hasData: false,
        message: 'Vattenföring-data ej tillgänglig',
        limitation: 'Mäts främst i större vattendrag och vid regleringsstationer'
      }
    };
    
  } catch (error) {
    console.error('Error fetching water flow data:', error);
    return { availability: { hasData: false, message: 'Fel vid hämtning av flödesdata' } };
  }
};

// Helper function for major lake flow data
const getLakeFlowData = (lakeName) => {
  const currentMonth = new Date().getMonth();
  
  const lakeFlows = {
    'vanern': {
      normal: 450,   // m³/s average outflow
      seasonal: getSeasonalFlowVariation(currentMonth, 'large')
    },
    'vattern': {
      normal: 120,   // m³/s average outflow  
      seasonal: getSeasonalFlowVariation(currentMonth, 'large')
    },
    'malaren': {
      normal: 280,   // m³/s average outflow
      seasonal: getSeasonalFlowVariation(currentMonth, 'large')
    },
    'kultsjön': {
      normal: 15,    // m³/s smaller lake
      seasonal: getSeasonalFlowVariation(currentMonth, 'small')
    }
  };
  
  const flow = lakeFlows[lakeName] || { normal: 50, seasonal: 0 };
  const current = flow.normal + flow.seasonal;
  const variation = (flow.seasonal / flow.normal) * 100;
  
  return {
    current: current,
    normal: flow.normal,
    variation: variation,
    trend: flow.seasonal > 5 ? 'STIGANDE' : flow.seasonal < -5 ? 'SJUNKANDE' : 'STABIL',
    status: getFlowStatus(current, flow.normal)
  };
};

// Helper function for seasonal flow variation
const getSeasonalFlowVariation = (month, lakeSize) => {
  const multiplier = lakeSize === 'large' ? 1.0 : 0.3;
  
  const seasonalFlows = {
    0: -20,  // January (low flow)
    1: -25,  // February (lowest)
    2: -10,  // March (ice melting starts)
    3: 40,   // April (spring flood)
    4: 60,   // May (peak flow)
    5: 20,   // June (high but declining)
    6: 5,    // July (summer normal)
    7: -5,   // August (low)
    8: -10,  // September (autumn low)
    9: 10,   // October (autumn rains)
    10: 15,  // November (autumn flow)
    11: -5   // December (winter decline)
  };
  
  return (seasonalFlows[month] || 0) * multiplier;
};

// NEW: Water quality data (oxygen, pH, clarity) - FIXED FALLBACK for major lakes
export const getWaterQualityData = async (lat, lon, locationName = '') => {
  try {
    console.log(`🧪 Fetching water quality data: ${locationName}`);
    
    // IMMEDIATE FALLBACK: Major Swedish lakes have known water quality
    const lakeName = identifyMajorLake(locationName, lat, lon);
    if (lakeName && MAJOR_LAKE_STATIONS[lakeName]) {
      const station = MAJOR_LAKE_STATIONS[lakeName];
      console.log(`📊 Using reference water quality data for ${station.station}`);
      
      // Realistic water quality for major Swedish lakes
      const quality = getLakeWaterQuality(lakeName);
      
      return {
        oxygen: {
          value: quality.oxygen,
          status: getOxygenStatus(quality.oxygen),
          fishingImpact: getOxygenFishingAdvice(quality.oxygen)
        },
        pH: {
          value: quality.pH,
          status: getPHStatus(quality.pH),
          fishingImpact: getPHFishingAdvice(quality.pH)
        },
        clarity: {
          visibility: quality.clarity,
          status: getClarityStatus(quality.clarity),
          fishingImpact: getClarityFishingAdvice(quality.clarity)
        },
        lastUpdated: new Date(),
        availability: {
          hasData: true,
          dataType: 'reference',
          message: `Referensdata för ${station.station} vattenkvalitet`,
          limitation: 'Typiska värden för svensk sjömiljö'
        }
      };
    }
    
    // Try marine/lake monitoring data (currently has CORS issues)
    try {
      const params = new URLSearchParams({
        'bbox': `${lon-0.1},${lat-0.1},${lon+0.1},${lat+0.1}`,
        'datatype': 'physicalchemical',
        'format': 'json'
      });
      
      const response = await fetch(`${SMHI_HYDRO_ENDPOINTS.waterQuality}?${params}`, {
        headers: {
          'User-Agent': 'B8Shield-Weather-Wagon/1.0 (Swedish Fishing App)',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
          const latest = data.data[0];
          
          return {
            oxygen: {
              value: latest.oxygen_mg_l,
              status: getOxygenStatus(latest.oxygen_mg_l),
              fishingImpact: getOxygenFishingAdvice(latest.oxygen_mg_l)
            },
            pH: {
              value: latest.ph,
              status: getPHStatus(latest.ph),
              fishingImpact: getPHFishingAdvice(latest.ph)
            },
            clarity: {
              visibility: latest.secchi_depth_m,
              status: getClarityStatus(latest.secchi_depth_m),
              fishingImpact: getClarityFishingAdvice(latest.secchi_depth_m)
            },
            lastUpdated: new Date(latest.sample_date),
            availability: {
              hasData: true,
              dataType: 'monitored',
              message: 'Vattenkvalitet från miljöövervakning'
            }
          };
        }
      }
    } catch (apiError) {
      console.log('Water quality API failed, using reference data if available');
    }
    
    return {
      availability: {
        hasData: false,
        message: 'Vattenkvalitet-data ej tillgänglig',
        limitation: 'Mäts vid utvalda övervakningsstationer'
      }
    };
    
  } catch (error) {
    console.error('Error fetching water quality data:', error);
    return { availability: { hasData: false, message: 'Fel vid hämtning av vattenkvalitet' } };
  }
};

// Helper function for major lake water quality
const getLakeWaterQuality = (lakeName) => {
  const currentMonth = new Date().getMonth();
  
  const lakeQualities = {
    'vanern': {
      oxygen: 9.2 + getSeasonalOxygenVariation(currentMonth),
      pH: 7.4,
      clarity: 3.5 // meters
    },
    'vattern': {
      oxygen: 10.8 + getSeasonalOxygenVariation(currentMonth), 
      pH: 7.6,
      clarity: 8.2 // Very clear lake
    },
    'malaren': {
      oxygen: 8.5 + getSeasonalOxygenVariation(currentMonth),
      pH: 7.2,
      clarity: 2.8 // More turbid
    },
    'kultsjön': {
      oxygen: 8.8 + getSeasonalOxygenVariation(currentMonth),
      pH: 6.9,
      clarity: 4.2
    }
  };
  
  return lakeQualities[lakeName] || {
    oxygen: 8.5,
    pH: 7.2,
    clarity: 3.0
  };
};

// Helper function for seasonal oxygen variation
const getSeasonalOxygenVariation = (month) => {
  const seasonalOxygen = {
    0: 2.0,   // January (high oxygen, cold water)
    1: 2.2,   // February (peak oxygen)
    2: 1.5,   // March (ice melting)
    3: 0.5,   // April (spring warming)
    4: -0.5,  // May (warming continues)
    5: -1.2,  // June (summer low)
    6: -1.8,  // July (lowest oxygen)
    7: -1.5,  // August (still low)
    8: -0.8,  // September (cooling starts)
    9: 0.2,   // October (recovery)
    10: 1.0,  // November (good levels)
    11: 1.5   // December (winter high)
  };
  
  return seasonalOxygen[month] || 0;
};

// NEW: Ice conditions data - SEASONAL (only during winter months)
export const getIceConditionsData = async (lat, lon, locationName = '') => {
  try {
    console.log(`🧊 Checking ice conditions for: ${locationName}`);
    
    const currentMonth = new Date().getMonth();
    const isWinterSeason = currentMonth < 3 || currentMonth > 10; // Nov-Mar
    
    if (!isWinterSeason) {
      console.log('🌞 Summer season - no ice data relevant');
      return {
        availability: {
          hasData: false,
          message: 'Ingen isdata under sommarsäsongen',
          limitation: 'Isförhållanden är endast relevanta november-mars',
          suggestion: 'Kontrollera isdata igen under vinterhalvåret'
        }
      };
    }
    
    // During winter, try to get ice data for major lakes
    const lakeName = identifyMajorLake(locationName, lat, lon);
    if (lakeName && MAJOR_LAKE_STATIONS[lakeName] && isWinterSeason) {
      const station = MAJOR_LAKE_STATIONS[lakeName];
      console.log(`❄️ Using reference ice data for ${station.station}`);
      
      // Realistic winter ice data
      const iceData = getWinterIceData(lakeName, currentMonth);
      
      return {
        thickness: iceData.thickness,
        safety: getIceSafety(iceData.thickness),
        fishingAdvice: getIceFishingAdvice(iceData.thickness),
        trend: iceData.trend,
        unit: 'cm',
        lastUpdated: new Date(),
        availability: {
          hasData: true,
          dataType: 'reference',
          message: `Referens isdata för ${station.station}`,
          limitation: 'Beräknade isvärden baserat på historiska data'
        }
      };
    }
    
    // Try SMHI API during winter
    if (isWinterSeason) {
      try {
        const response = await fetch(`${SMHI_HYDRO_ENDPOINTS.iceThickness}/lon/${lon}/lat/${lat}/data.json`, {
          headers: {
            'User-Agent': 'B8Shield-Weather-Wagon/1.0 (Swedish Fishing App)',
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data && data.timeSeries && data.timeSeries.length > 0) {
            const latest = data.timeSeries[data.timeSeries.length - 1];
            const thickness = parseFloat(latest.value);
            
            return {
              thickness: thickness,
              safety: getIceSafety(thickness),
              fishingAdvice: getIceFishingAdvice(thickness),
              trend: calculateIceTrend(data.timeSeries),
              unit: 'cm',
              lastUpdated: new Date(latest.date),
              availability: {
                hasData: true,
                dataType: 'measured',
                message: 'Istjocklek från SMHI-station'
              }
            };
          }
        }
      } catch (apiError) {
        console.log('SMHI ice API failed during winter season');
      }
    }
    
    return {
      availability: {
        hasData: false,
        message: 'Isdata ej tillgänglig',
        limitation: 'Mäts endast vintertid vid utvalda stationer'
      }
    };
    
  } catch (error) {
    console.error('Error fetching ice data:', error);
    return { availability: { hasData: false, message: 'Fel vid hämtning av isdata' } };
  }
};

// Helper function for winter ice data
const getWinterIceData = (lakeName, month) => {
  const iceThickness = {
    'vanern': { 0: 25, 1: 35, 2: 30, 11: 15 },     // Large lake - slower freeze
    'vattern': { 0: 20, 1: 30, 2: 25, 11: 10 },    // Deep lake - less ice
    'malaren': { 0: 30, 1: 40, 2: 35, 11: 20 },    // Moderate lake
    'kultsjön': { 0: 35, 1: 45, 2: 40, 11: 25 }    // Smaller lake - more ice
  };
  
  const thickness = iceThickness[lakeName]?.[month] || 0;
  
  return {
    thickness: thickness,
    trend: month === 11 ? 'TJOCKNAR' : month === 2 ? 'TUNNAR' : 'STABIL'
  };
};

// Helper function to identify major Swedish lakes
const identifyMajorLake = (locationName, lat, lon) => {
  if (!locationName) return null;
  
  const name = locationName.toLowerCase();
  
  // Direct name matching
  for (const lakeName of Object.keys(MAJOR_LAKE_STATIONS)) {
    if (name.includes(lakeName)) {
      return lakeName;
    }
  }
  
  // Geographic proximity matching (within ~50km)
  for (const [lakeName, station] of Object.entries(MAJOR_LAKE_STATIONS)) {
    const distance = calculateDistance(lat, lon, station.lat, station.lon);
    if (distance < 0.5) { // ~50km in degrees (rough approximation)
      return lakeName;
    }
  }
  
  return null;
};

// Add seasonal variation to water temperature
const addSeasonalVariation = (baseTemp) => {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  
  // Simple seasonal curve (peak in August ~day 220, minimum in February ~day 45)
  const seasonalFactor = Math.sin(((dayOfYear - 45) / 365) * 2 * Math.PI);
  const seasonalAdjustment = seasonalFactor * 4; // ±4°C seasonal variation
  
  return Math.max(1, baseTemp + seasonalAdjustment); // Never below 1°C
};

// Attempt to fetch water level from different endpoints
const attemptWaterLevelFetch = async (endpoint, lat, lon) => {
  // These would be implemented when we find the correct endpoints
  console.log(`🔍 Trying water level via ${endpoint.name}...`);
  
  // TODO: Implement actual API calls when correct endpoints are found
  // For now, return null to continue trying other endpoints
  return null;
};

// Attempt to fetch water temperature from different endpoints  
const attemptWaterTempFetch = async (endpoint, lat, lon) => {
  // These would be implemented when we find the correct endpoints
  console.log(`🔍 Trying water temperature via ${endpoint.name}...`);
  
  // TODO: Implement actual API calls when correct endpoints are found
  // For now, return null to continue trying other endpoints
  return null;
};

// Helper function to calculate water level trend
const calculateLevelTrend = (data) => {
  if (!data || data.length < 2) return 'STABLE';
  
  const recent = data.slice(-3); // Last 3 measurements
  const values = recent.map(d => d.value).filter(v => v !== null);
  
  if (values.length < 2) return 'STABLE';
  
  const change = values[values.length - 1] - values[0];
  
  if (change > 5) return 'STIGANDE'; // Rising
  if (change < -5) return 'SJUNKANDE'; // Falling
  return 'STABLE';
};

// Helper function to calculate water temperature trend
const calculateWaterTempTrend = (data) => {
  if (!data || data.length < 2) return 'STABLE';
  
  const recent = data.slice(-3); // Last 3 measurements
  const values = recent.map(d => d.value).filter(v => v !== null);
  
  if (values.length < 2) return 'STABLE';
  
  const change = values[values.length - 1] - values[0];
  
  if (change > 1) return 'STIGANDE'; // Rising
  if (change < -1) return 'SJUNKANDE'; // Falling
  return 'STABLE';
};

// Helper function to estimate thermocline depth based on surface temperature
const estimateThermocline = (surfaceTemp) => {
  if (surfaceTemp < 4) return 'INGEN'; // No thermocline in winter
  if (surfaceTemp < 10) return '2-4 meter'; // Early spring
  if (surfaceTemp < 15) return '3-6 meter'; // Late spring
  if (surfaceTemp < 20) return '4-8 meter'; // Early summer
  return '5-10 meter'; // Peak summer
};

// Helper function to determine fishing zone based on water temperature
const getFishingZoneFromWaterTemp = (temp) => {
  if (temp < 4) return 'DJUPT (vinterfiske)';
  if (temp < 8) return 'DJUPT (kallvatten)';
  if (temp < 12) return 'MEDEL (övergångszon)';
  if (temp < 16) return 'GRUND (vårvärme)';
  if (temp < 20) return 'GRUND (sommar)';
  return 'YTVATTEN (varm sommar)';
};

// (Removed old getScoreGrade - now using realistic inline grading system)

// Helper functions for water level analysis
const calculateNormalLevel = (timeSeries, date) => {
  if (!timeSeries || timeSeries.length === 0) return 0;
  
  // Calculate average for same month over available years
  const month = date.getMonth();
  const monthlyData = timeSeries.filter(point => {
    const pointDate = new Date(point.date);
    return pointDate.getMonth() === month;
  });
  
  if (monthlyData.length === 0) {
    // Fallback to overall average
    return timeSeries.reduce((sum, point) => sum + parseFloat(point.value), 0) / timeSeries.length;
  }
  
  return monthlyData.reduce((sum, point) => sum + parseFloat(point.value), 0) / monthlyData.length;
};

const getWaterLevelStatus = (variation) => {
  if (variation > 30) return 'Mycket hög nivå för årstiden';
  if (variation > 15) return 'Hög nivå för årstiden';
  if (variation > 5) return 'Något hög nivå för årstiden';
  if (variation < -30) return 'Mycket låg nivå för årstiden';
  if (variation < -15) return 'Låg nivå för årstiden';
  if (variation < -5) return 'Något låg nivå för årstiden';
  return 'Normal nivå för årstiden';
};

// Helper functions for water flow analysis
const calculateNormalFlow = (timeSeries, date) => {
  const month = date.getMonth();
  const monthlyData = timeSeries.filter(point => {
    const pointDate = new Date(point.date);
    return pointDate.getMonth() === month;
  });
  
  if (monthlyData.length === 0) {
    return timeSeries.reduce((sum, point) => sum + parseFloat(point.value), 0) / timeSeries.length;
  }
  
  return monthlyData.reduce((sum, point) => sum + parseFloat(point.value), 0) / monthlyData.length;
};

const calculateFlowTrend = (data) => {
  if (!data || data.length < 3) return 'OKÄND';
  
  const recent = data.slice(-7); // Last week
  const values = recent.map(point => parseFloat(point.value));
  
  const first = values[0];
  const last = values[values.length - 1];
  const change = ((last - first) / first) * 100;
  
  if (change > 10) return 'STIGANDE';
  if (change < -10) return 'SJUNKANDE';
  return 'STABIL';
};

const getFlowStatus = (current, normal) => {
  const ratio = current / normal;
  if (ratio > 2.0) return 'Mycket högt flöde';
  if (ratio > 1.5) return 'Högt flöde';
  if (ratio > 1.2) return 'Något högt flöde';
  if (ratio < 0.3) return 'Mycket lågt flöde';
  if (ratio < 0.6) return 'Lågt flöde';
  if (ratio < 0.8) return 'Något lågt flöde';
  return 'Normalt flöde';
};

const getFlowFishingAdvice = (current, normal) => {
  const ratio = current / normal;
  if (ratio > 2.0) return 'Högt flöde - fisk i lugnvatten, använd tyngre beten';
  if (ratio > 1.5) return 'Kraftigt flöde - fiska nära stränderna och i vikar';
  if (ratio > 1.2) return 'Något förhöjt flöde - bra förhållanden för aktivt fiske';
  if (ratio < 0.3) return 'Mycket lågt flöde - försiktig presentation, små beten';
  if (ratio < 0.6) return 'Lågt flöde - fiska djupare håll, finen utrustning';
  if (ratio < 0.8) return 'Något lågt flöde - bra för siktfiske i klarvatten';
  return 'Optimalt flöde för fiske';
};

// Helper functions for water quality analysis
const getOxygenStatus = (oxygenMgL) => {
  if (!oxygenMgL) return 'Okänd';
  if (oxygenMgL > 8) return 'Mycket bra syrhalt';
  if (oxygenMgL > 6) return 'Bra syrhalt';
  if (oxygenMgL > 4) return 'Acceptabel syrhalt';
  if (oxygenMgL > 2) return 'Låg syrhalt';
  return 'Kritiskt låg syrhalt';
};

const getOxygenFishingAdvice = (oxygenMgL) => {
  if (!oxygenMgL) return 'Okänd syrgasnivå';
  if (oxygenMgL > 8) return 'Utmärkta förhållanden - fisk aktiv på alla djup';
  if (oxygenMgL > 6) return 'Bra förhållanden för fiske';
  if (oxygenMgL > 4) return 'Fisk kan vara mindre aktiv i djupare vatten';
  if (oxygenMgL > 2) return 'Fisk koncentrerad till ytvatten - undvik djupa håll';
  return 'Dåliga fiskeförhållanden - risk för fiskdöd';
};

const getPHStatus = (pH) => {
  if (!pH) return 'Okänd';
  if (pH < 6.0) return 'Surt vatten';
  if (pH < 6.5) return 'Lätt surt vatten';
  if (pH > 8.5) return 'Alkaliskt vatten';
  if (pH > 8.0) return 'Lätt alkaliskt vatten';
  return 'Neutralt vatten';
};

const getPHFishingAdvice = (pH) => {
  if (!pH) return 'Okänd surhetsgrad';
  if (pH < 6.0) return 'Surt vatten - begränsad fiskpopulation';
  if (pH < 6.5) return 'Lätt surt - vissa arter påverkade';
  if (pH > 8.5) return 'Högt pH - fisk kan vara stressad';
  if (pH > 8.0) return 'Lätt högt pH - generellt bra för fisk';
  return 'Optimalt pH för de flesta fiskarter';
};

const getClarityStatus = (secchiDepth) => {
  if (!secchiDepth) return 'Okänd sikt';
  if (secchiDepth > 4) return 'Mycket klart vatten';
  if (secchiDepth > 2) return 'Klart vatten';
  if (secchiDepth > 1) return 'Måttligt klart vatten';
  if (secchiDepth > 0.5) return 'Grumligt vatten';
  return 'Mycket grumligt vatten';
};

const getClarityFishingAdvice = (secchiDepth) => {
  if (!secchiDepth) return 'Okänd sikt';
  if (secchiDepth > 4) return 'Klart vatten - använd naturliga färger, fina linor';
  if (secchiDepth > 2) return 'Bra sikt - idealiskt för siktfiske';
  if (secchiDepth > 1) return 'Måttlig sikt - normala betesval fungerar';
  if (secchiDepth > 0.5) return 'Grumligt - använd mer framträdande beten';
  return 'Mycket grumligt - starka färger och vibration rekommenderas';
};

// Helper functions for ice analysis
const getIceSafety = (thickness) => {
  if (!thickness || thickness < 5) return 'OSÄKER - gå inte ut';
  if (thickness < 10) return 'OSÄKER - endast för promenad nära land';
  if (thickness < 15) return 'FÖRSIKTIG - lätt aktivitet';
  if (thickness < 20) return 'MÅTTLIG - pimpelfiske OK';
  if (thickness < 30) return 'BRA - normalt vinterifiske';
  return 'UTMÄRKT - all aktivitet säker';
};

const getIceFishingAdvice = (thickness) => {
  if (!thickness || thickness < 5) return 'INGEN isfiske - för tunn is';
  if (thickness < 10) return 'Vänta några dagar till';
  if (thickness < 15) return 'Försiktig pimpelfiske nära land';
  if (thickness < 20) return 'Bra för pimpelfiske, undvik fordon';
  if (thickness < 30) return 'Utmärkt pimpelfiske - snömoppe OK';
  return 'Perfekt för all typ av isfiske och transport';
};

const calculateIceTrend = (data) => {
  if (!data || data.length < 3) return 'OKÄND';
  
  const recent = data.slice(-5); // Last 5 measurements
  const values = recent.map(point => parseFloat(point.value));
  
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  
  if (change > 2) return 'TJOCKNAR';
  if (change < -2) return 'TUNNAR';
  return 'STABIL';
};

// Enhanced water temperature data - FIXED FALLBACK prioritized
export const getWaterTemperatureData = async (lat, lon, locationName = '') => {
  try {
    console.log(`🌡️ Fetching water temperature data: ${locationName}`);
    
    // IMMEDIATE FALLBACK: Check major lake first (APIs failing)
    const lakeName = identifyMajorLake(locationName, lat, lon);
    if (lakeName && MAJOR_LAKE_STATIONS[lakeName]) {
      const station = MAJOR_LAKE_STATIONS[lakeName];
      console.log(`📊 Using reference water temperature for ${station.station}`);
      
      const seasonalTemp = addSeasonalVariation(station.waterTemp);
      
      return {
        current: seasonalTemp,
        trend: calculateTempTrendFromSeason(),
        thermocline: estimateThermocline(seasonalTemp),
        fishingZone: getFishingZoneFromWaterTemp(seasonalTemp),
        unit: '°C',
        station: station.station,
        lastUpdated: new Date(),
        availability: {
          hasData: true,
          dataType: 'reference',
          message: `Referensdata för ${station.station}`,
          limitation: 'Beräknad temperatur baserat på säsongsvariation'
        }
      };
    }
    
    // Try SMHI water temperature API (currently failing)
    try {
      const response = await fetch(`${SMHI_HYDRO_ENDPOINTS.waterTemp}/lon/${lon}/lat/${lat}/data.json`, {
        headers: {
          'User-Agent': 'B8Shield-Weather-Wagon/1.0 (Swedish Fishing App)',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.timeSeries && data.timeSeries.length > 0) {
          const latest = data.timeSeries[data.timeSeries.length - 1];
          const current = parseFloat(latest.value);
          
          return {
            current: current,
            trend: calculateTempTrend(data.timeSeries),
            thermocline: estimateThermocline(current),
            fishingZone: getFishingZoneFromWaterTemp(current),
            unit: '°C',
            station: data.station?.name,
            lastUpdated: new Date(latest.date),
            availability: {
              hasData: true,
              dataType: 'measured',
              message: `Vattentemperatur från ${data.station?.name}`
            }
          };
        }
      }
    } catch (apiError) {
      console.log('SMHI temperature API failed, using reference data if available');
    }
    
    return {
      availability: {
        hasData: false,
        message: 'Vattentemperatur ej tillgänglig',
        limitation: 'Mäts vid utvalda stationer och större sjöar'
      }
    };
    
  } catch (error) {
    console.error('Error fetching water temperature:', error);
    return { availability: { hasData: false, message: 'Fel vid hämtning av vattentemperatur' } };
  }
};

// Helper function for seasonal temperature trend
const calculateTempTrendFromSeason = () => {
  const currentMonth = new Date().getMonth();
  if (currentMonth >= 4 && currentMonth <= 7) return 'STIGANDE'; // May-Aug warming
  if (currentMonth >= 8 && currentMonth <= 10) return 'SJUNKANDE'; // Sep-Nov cooling
  return 'STABIL'; // Winter/early spring
};

// Helper function for temperature trend
const calculateTempTrend = (data) => {
  if (!data || data.length < 3) return 'STABIL';
  
  const recent = data.slice(-7); // Last week
  const values = recent.map(point => parseFloat(point.value));
  
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  
  if (change > 2) return 'STIGANDE';
  if (change < -2) return 'SJUNKANDE';
  return 'STABIL';
};

// NEW: Process SMHI forecast data into daily summaries
const processForecastData = (timeSeries) => {
  const dailyForecasts = {};
  const now = new Date();
  
  // Group hourly forecasts by day
  timeSeries.forEach(forecast => {
    const forecastTime = new Date(forecast.validTime);
    const dateKey = forecastTime.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Skip past forecasts
    if (forecastTime < now) return;
    
    if (!dailyForecasts[dateKey]) {
      dailyForecasts[dateKey] = {
        date: dateKey,
        forecasts: []
      };
    }
    
    // Extract parameters for this forecast point
    const getParam = (name) => {
      const param = forecast.parameters.find(p => p.name === name);
      return param ? param.values[0] : null;
    };
    
    dailyForecasts[dateKey].forecasts.push({
      time: forecast.validTime,
      temperature: getParam('t'),
      windSpeed: getParam('ws'),
      windDirection: getParam('wd'),
      humidity: getParam('r'),
      pressure: getParam('msl'),
      precipitation: getParam('pmedian'),
      cloudCover: getParam('tcc_mean'),
      visibility: getParam('vis')
    });
  });
  
  // Convert to array and calculate daily summaries
  return Object.values(dailyForecasts)
    .slice(0, 10) // Take max 10 days
    .map(day => {
      const forecasts = day.forecasts;
      if (forecasts.length === 0) return null;
      
      // Calculate daily statistics
      const temps = forecasts.map(f => f.temperature).filter(t => t !== null);
      const winds = forecasts.map(f => f.windSpeed).filter(w => w !== null);
      const precips = forecasts.map(f => f.precipitation).filter(p => p !== null);
      const pressures = forecasts.map(f => f.pressure).filter(p => p !== null);
      const humidities = forecasts.map(f => f.humidity).filter(h => h !== null);
      
      const dailySummary = {
        date: day.date,
        dateObj: new Date(day.date),
        dayName: new Date(day.date).toLocaleDateString('sv-SE', { weekday: 'long' }),
        dayShort: new Date(day.date).toLocaleDateString('sv-SE', { weekday: 'short' }),
        dayMonth: new Date(day.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
        
        // Temperature summary
        tempMin: temps.length > 0 ? Math.min(...temps) : null,
        tempMax: temps.length > 0 ? Math.max(...temps) : null,
        tempAvg: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
        
        // Wind summary
        windMin: winds.length > 0 ? Math.min(...winds) : null,
        windMax: winds.length > 0 ? Math.max(...winds) : null,
        windAvg: winds.length > 0 ? winds.reduce((a, b) => a + b, 0) / winds.length : null,
        
        // Precipitation summary
        precipTotal: precips.length > 0 ? precips.reduce((a, b) => a + b, 0) : 0,
        precipMax: precips.length > 0 ? Math.max(...precips) : 0,
        
        // Other averages
        pressureAvg: pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : null,
        humidityAvg: humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null,
        
        // Hourly details (for expanded view)
        hourlyForecasts: forecasts,
        
        // Moon phase for this day
        moon: getMoonPhase(new Date(day.date))
      };
      
      return dailySummary;
    })
    .filter(day => day !== null);
};