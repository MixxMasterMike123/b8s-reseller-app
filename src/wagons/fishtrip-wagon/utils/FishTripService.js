// FishTrip Service - Main orchestrator for fishing intelligence
// Combines SMHI weather, water data, and AI enhancement
// Mobile-optimized for Swedish fishing conditions

import SMHIClient from '../api/SMHIClient.js';
import ClaudeClient from '../api/ClaudeClient.js';
import { geocodeLocation, getCurrentLocation, reverseGeocode } from './geocoding.js';

class FishTripService {
  constructor() {
    this.smhiClient = new SMHIClient();
    this.claudeClient = new ClaudeClient();
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  // Main method: Get comprehensive fishing analysis
  async getFishingAnalysis(location, options = {}) {
    try {
      // Step 1: Resolve location to coordinates
      const locationData = await this.resolveLocation(location);
      
      // Step 2: Gather all data in parallel
      const [weatherData, waterData] = await Promise.all([
        this.getWeatherData(locationData.lat, locationData.lon),
        this.getWaterData(locationData.lat, locationData.lon)
      ]);

      // Step 3: Calculate base fishing score
      const baseScore = this.calculateFishingScore(weatherData, waterData);

      // Step 4: AI enhancement (if enabled and API available)
      let aiAnalysis = null;
      if (options.enableAI !== false) {
        try {
          aiAnalysis = await this.getAIAnalysis({
            ...locationData,
            weather: weatherData,
            waterConditions: waterData
          });
        } catch (error) {
          console.warn('AI analysis failed, continuing without:', error.message);
        }
      }

      // Step 5: Compile comprehensive result
      const result = {
        location: locationData,
        weather: weatherData,
        water: waterData,
        fishingScore: baseScore,
        aiAnalysis: aiAnalysis,
        recommendations: this.generateRecommendations(weatherData, waterData, baseScore),
        timestamp: new Date().toISOString(),
        dataQuality: this.assessDataQuality(weatherData, waterData)
      };

      console.log('🎣 FishTripService: Final analysis result:', result);
      return result;

    } catch (error) {
      console.error('Fishing analysis failed:', error);
      throw new Error(`Fiskanalys misslyckades: ${error.message}`);
    }
  }

  // Resolve location string or coordinates to location data
  async resolveLocation(location) {
    if (typeof location === 'string') {
      if (location === 'current') {
        const coords = await getCurrentLocation();
        const locationInfo = await reverseGeocode(coords.lat, coords.lon);
        return {
          ...locationInfo,
          source: 'geolocation'
        };
      } else {
        const results = await geocodeLocation(location);
        return results[0]; // Take the best match
      }
    } else if (location.lat && location.lon) {
      // Already have coordinates
      if (!location.name) {
        const locationInfo = await reverseGeocode(location.lat, location.lon);
        return locationInfo;
      }
      return location;
    } else {
      throw new Error('Invalid location format');
    }
  }

  // Get weather forecast data
  async getWeatherData(lat, lon) {
    const cacheKey = `weather_${lat}_${lon}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const weatherData = await this.smhiClient.getWeatherForecast(lat, lon);
      console.log('🎣 FishTripService: Weather data received:', weatherData);
      this.setCache(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      console.error('Weather data fetch failed:', error);
      // Return minimal weather data structure
      return {
        location: { lat, lon },
        daily: [],
        hourly: [],
        error: error.message,
        source: 'error'
      };
    }
  }

  // Get water conditions data
  async getWaterData(lat, lon) {
    const cacheKey = `water_${lat}_${lon}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const [temperature, level] = await Promise.all([
        this.smhiClient.getWaterTemperature(lat, lon),
        this.smhiClient.getWaterLevel(lat, lon)
      ]);

      const available = !!(temperature || level);
      const waterData = {
        temperature: temperature,
        level: level,
        available: available,
        source: 'smhi',
        note: !available ? 'SMHI water monitoring limited in northern Sweden' : null
      };

      // Add distance context if data is from far away
      if (available && lat > 63) { // Northern Sweden
        waterData.note = 'Water data from nearest southern station (approximate)';
      }

      this.setCache(cacheKey, waterData);
      return waterData;
    } catch (error) {
      console.error('Water data fetch failed:', error);
      return {
        temperature: null,
        level: null,
        available: false,
        error: error.message,
        source: 'error',
        note: 'Water data temporarily unavailable'
      };
    }
  }

  // Get AI-powered analysis
  async getAIAnalysis(locationData) {
    try {
      return await this.claudeClient.analyzeFishingLocation(locationData);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return null;
    }
  }

  // Calculate overall fishing score (0-100)
  calculateFishingScore(weatherData, waterData) {
    let score = 50; // Base score

    // Weather scoring (40% of total)
    if (weatherData.daily && weatherData.daily.length > 0) {
      const todayWeather = weatherData.daily[0];
      score += (todayWeather.fishingScore - 50) * 0.4;
    }

    // Water conditions scoring (30% of total)
    if (waterData.available) {
      let waterScore = 50;
      
      // Water temperature scoring
      if (waterData.temperature && waterData.temperature.temperature) {
        const temp = waterData.temperature.temperature;
        if (temp >= 15 && temp <= 22) {
          waterScore += 20; // Optimal temperature
        } else if (temp >= 10 && temp <= 25) {
          waterScore += 10; // Good temperature
        } else if (temp < 5 || temp > 30) {
          waterScore -= 20; // Poor temperature
        }
      }

      // Water level scoring
      if (waterData.level && waterData.level.level !== null) {
        const level = waterData.level.level;
        if (Math.abs(level) < 20) {
          waterScore += 10; // Normal level
        } else if (Math.abs(level) > 50) {
          waterScore -= 10; // Extreme level
        }
      }

      score += (waterScore - 50) * 0.3;
    }

    // Seasonal scoring (15% of total)
    const seasonalScore = this.getSeasonalScore();
    score += (seasonalScore - 50) * 0.15;

    // Moon phase scoring (15% of total)
    const moonScore = this.getMoonScore();
    score += (moonScore - 50) * 0.15;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Get seasonal fishing score
  getSeasonalScore() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    
    // Swedish fishing seasons
    if (month >= 5 && month <= 9) {
      return 80; // Prime fishing season
    } else if (month === 4 || month === 10) {
      return 65; // Good shoulder seasons
    } else if (month >= 12 || month <= 2) {
      return 45; // Ice fishing season
    } else {
      return 55; // Spring/late fall
    }
  }

  // Get moon phase fishing score
  getMoonScore() {
    const now = new Date();
    const moonPhase = this.calculateMoonPhase(now);
    
    // New moon and full moon are often better for fishing
    if (moonPhase.illumination < 10 || moonPhase.illumination > 90) {
      return 70; // New or full moon
    } else if (moonPhase.illumination >= 40 && moonPhase.illumination <= 60) {
      return 45; // Quarter moons (less ideal)
    } else {
      return 55; // Other phases
    }
  }

  // Calculate moon phase
  calculateMoonPhase(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
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
  }

  // Generate fishing recommendations
  generateRecommendations(weatherData, waterData, score) {
    const recommendations = [];

    // Score-based recommendations
    if (score >= 80) {
      recommendations.push({
        type: 'excellent',
        title: 'Utmärkta fiskeförhållanden',
        message: 'Perfekt tid för fiske! Alla förhållanden är gynnsamma.',
        priority: 'high'
      });
    } else if (score >= 60) {
      recommendations.push({
        type: 'good',
        title: 'Goda fiskeförhållanden',
        message: 'Bra tid för fiske med goda chanser för napp.',
        priority: 'medium'
      });
    } else if (score >= 40) {
      recommendations.push({
        type: 'fair',
        title: 'Okej fiskeförhållanden',
        message: 'Fiske är möjligt men förhållandena är inte optimala.',
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'poor',
        title: 'Svåra fiskeförhållanden',
        message: 'Utmanande förhållanden. Överväg att vänta på bättre väder.',
        priority: 'low'
      });
    }

    // Weather-based recommendations
    if (weatherData.daily && weatherData.daily.length > 0) {
      const today = weatherData.daily[0];
      
      if (today.wind.maxSpeed > 8) {
        recommendations.push({
          type: 'wind',
          title: 'Blåsigt väder',
          message: 'Stark vind kan göra fiske svårt. Sök skyddade vikar.',
          priority: 'medium'
        });
      }

      if (today.precipitation) {
        recommendations.push({
          type: 'rain',
          title: 'Nederbörd väntas',
          message: 'Regn kan påverka fisket. Packa regnkläder.',
          priority: 'low'
        });
      }
    }

    // Water-based recommendations
    if (waterData.temperature && waterData.temperature.temperature) {
      const temp = waterData.temperature.temperature;
      if (temp < 10) {
        recommendations.push({
          type: 'cold_water',
          title: 'Kallt vatten',
          message: 'Låg vattentemperatur. Fiska långsamt och djupt.',
          priority: 'medium'
        });
      } else if (temp > 25) {
        recommendations.push({
          type: 'warm_water',
          title: 'Varmt vatten',
          message: 'Hög vattentemperatur. Fiska tidigt på morgonen eller sent på kvällen.',
          priority: 'medium'
        });
      }
    }

    return recommendations;
  }

  // Assess data quality
  assessDataQuality(weatherData, waterData) {
    let quality = 'good';
    const issues = [];

    if (weatherData.error) {
      quality = 'poor';
      issues.push('Väderdata saknas');
    }

    if (!waterData.available) {
      if (quality === 'good') quality = 'fair';
      issues.push('Vattendata saknas');
    }

    return {
      level: quality,
      issues: issues,
      score: quality === 'good' ? 100 : quality === 'fair' ? 70 : 30
    };
  }

  // Multi-day trip planning
  async planFishingTrip(location, days = 3) {
    try {
      const analysis = await this.getFishingAnalysis(location);
      
      if (analysis.weather.daily.length < days) {
        throw new Error(`Väderdata finns bara för ${analysis.weather.daily.length} dagar`);
      }

      const tripPlan = {
        location: analysis.location,
        duration: days,
        days: [],
        overallScore: 0,
        bestDay: null,
        recommendations: []
      };

      // Analyze each day
      let totalScore = 0;
      let bestDayScore = 0;
      let bestDayIndex = 0;

      for (let i = 0; i < days; i++) {
        const dayWeather = analysis.weather.daily[i];
        const dayScore = dayWeather.fishingScore;
        totalScore += dayScore;

        if (dayScore > bestDayScore) {
          bestDayScore = dayScore;
          bestDayIndex = i;
        }

        const dayPlan = {
          date: dayWeather.date,
          weather: dayWeather,
          fishingScore: dayScore,
          recommendations: this.getDayRecommendations(dayWeather),
          bestTimes: this.getBestFishingTimes(dayWeather)
        };

        tripPlan.days.push(dayPlan);
      }

      tripPlan.overallScore = Math.round(totalScore / days);
      tripPlan.bestDay = bestDayIndex;

      // AI-enhanced trip planning (if available)
      if (analysis.aiAnalysis) {
        try {
          const aiTripPlan = await this.claudeClient.generateTripPlan(analysis.location, days);
          tripPlan.aiEnhancement = aiTripPlan;
        } catch (error) {
          console.warn('AI trip planning failed:', error);
        }
      }

      return tripPlan;
    } catch (error) {
      console.error('Trip planning failed:', error);
      throw new Error(`Reseplanering misslyckades: ${error.message}`);
    }
  }

  // Get day-specific recommendations
  getDayRecommendations(dayWeather) {
    const recommendations = [];

    if (dayWeather.fishingScore >= 80) {
      recommendations.push('Perfekt fiskedag! Planera för heldag.');
    } else if (dayWeather.fishingScore >= 60) {
      recommendations.push('Bra fiskedag. Fokusera på bästa tiderna.');
    }

    if (dayWeather.wind.maxSpeed > 10) {
      recommendations.push('Stark vind. Välj skyddade platser.');
    }

    if (dayWeather.temperature.max > 25) {
      recommendations.push('Varmt väder. Fiska tidigt/sent.');
    }

    return recommendations;
  }

  // Get best fishing times for a day
  getBestFishingTimes(dayWeather) {
    const times = [];

    // Always recommend dawn and dusk
    times.push({
      period: 'Gryning',
      time: '05:00-07:00',
      score: 85,
      reason: 'Fisk är mest aktiv vid gryning'
    });

    times.push({
      period: 'Skymning',
      time: '19:00-21:00',
      score: 85,
      reason: 'Fisk är mest aktiv vid skymning'
    });

    // Add midday if conditions are good
    if (dayWeather.fishingScore >= 70 && dayWeather.cloudCover >= 50) {
      times.push({
        period: 'Middag',
        time: '12:00-14:00',
        score: 70,
        reason: 'Molnigt väder gör middagsfiske möjligt'
      });
    }

    return times.sort((a, b) => b.score - a.score);
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

export default FishTripService; 