// weatherAPI.js - Free API integrations for The Weather Wagon
// Self-contained API utilities using only free/open data sources
// NOW FOCUSED ON 7-10 DAY FORECASTS for fishing trip planning

// SMHI (Swedish Meteorological and Hydrological Institute) - FREE
const SMHI_BASE_URL = 'https://opendata-download-metfcst.smhi.se/api';
const SMHI_WEATHER_URL = `${SMHI_BASE_URL}/category/pmp3g/version/2/geotype/point`;

// Geocoding - Use OpenStreetMap Nominatim (FREE)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

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
      
      // Calculate fishing score for this day
      dailySummary.fishing = calculateDailyFishingScore(dailySummary);
      
      return dailySummary;
    })
    .filter(day => day !== null);
};

// NEW: Calculate fishing score for a whole day
const calculateDailyFishingScore = (dailyWeather) => {
  let score = 50; // Base score
  let factors = [];
  
  // Temperature factors (optimal fishing temps)
  if (dailyWeather.tempAvg !== null) {
    if (dailyWeather.tempAvg >= 8 && dailyWeather.tempAvg <= 18) {
      score += 15;
      factors.push('Idealisk temperatur för fisk');
    } else if (dailyWeather.tempAvg >= 5 && dailyWeather.tempAvg <= 25) {
      score += 8;
      factors.push('Bra temperatur');
    } else if (dailyWeather.tempAvg < 0) {
      score -= 15;
      factors.push('Mycket kallt - fisk är mindre aktiv');
    }
  }
  
  // Wind factors
  if (dailyWeather.windAvg !== null) {
    if (dailyWeather.windAvg >= 2 && dailyWeather.windAvg <= 8) {
      score += 10;
      factors.push('Lagom vind skapar syrerik miljö');
    } else if (dailyWeather.windAvg < 2) {
      score -= 5;
      factors.push('Vindstilla kan minska syrenivåer');
    } else if (dailyWeather.windAvg > 12) {
      score -= 15;
      factors.push('Stark vind försvårar fiske');
    }
  }
  
  // Precipitation factors
  if (dailyWeather.precipTotal > 0) {
    if (dailyWeather.precipTotal < 2) {
      score += 5;
      factors.push('Lätt regn kan aktivera fisken');
    } else if (dailyWeather.precipTotal > 10) {
      score -= 10;
      factors.push('Kraftig nederbörd störer fisket');
    }
  }
  
  // Pressure factors
  if (dailyWeather.pressureAvg !== null) {
    if (dailyWeather.pressureAvg >= 1015 && dailyWeather.pressureAvg <= 1025) {
      score += 8;
      factors.push('Stabilt lufttryck');
    } else if (dailyWeather.pressureAvg < 1005) {
      score -= 8;
      factors.push('Lågtryck kan påverka fiskens aktivitet');
    }
  }
  
  // Moon phase factors
  if (dailyWeather.moon) {
    if (dailyWeather.moon.illumination >= 80 || dailyWeather.moon.illumination <= 20) {
      score += 5;
      factors.push('Gynnsam månfas för fiske');
    }
  }
  
  // Weather trend factors (compare with previous day if available)
  // This would need to be implemented with context from previous day
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  // Determine rating and color
  let rating, color;
  if (score >= 80) {
    rating = 'Utmärkt';
    color = 'green';
  } else if (score >= 65) {
    rating = 'Mycket bra';
    color = 'green';
  } else if (score >= 50) {
    rating = 'Bra';
    color = 'yellow';
  } else if (score >= 35) {
    rating = 'Medel';
    color = 'orange';
  } else {
    rating = 'Dåligt';
    color = 'red';
  }
  
  return { score, rating, color, factors };
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
    // Get coordinates for location
    const locations = await geocodeLocation(locationName);
    if (!locations || locations.length === 0) {
      throw new Error('Location not found');
    }
    
    // Use the first (best) location match
    const location = locations[0];
    
    // Get weather forecast for location
    const forecast = await getSMHIWeatherForecast(location.lat, location.lon);
    
    // Add location details
    forecast.location.name = location.name;
    forecast.location.type = location.type;
    
    return forecast;
    
  } catch (error) {
    console.error('Weather forecast error:', error);
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