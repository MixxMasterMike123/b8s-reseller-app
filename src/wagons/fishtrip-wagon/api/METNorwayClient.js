// MET Norway API Client for FishTrip Wagon
// Norwegian Meteorological Institute - Premium fishing weather data
// Replaces SMHI with superior marine and weather forecasting

class METNorwayClient {
  constructor() {
    // Use Firebase Functions as proxy to avoid CORS issues
    this.baseUrl = 'https://us-central1-b8shield-reseller-app.cloudfunctions.net';
    
    // Firebase Function endpoints for MET Norway APIs
    this.endpoints = {
      weather: `${this.baseUrl}/getFishTripWeatherData`,
      ocean: `${this.baseUrl}/getFishTripOceanData`,
      tidal: `${this.baseUrl}/getFishTripTidalData`,
      solar: `${this.baseUrl}/getFishTripSolarData`,
      nowcast: `${this.baseUrl}/getFishTripNowcastData`
    };

    // Norwegian harbors with tidal data (30+ available)
    this.tidalHarbors = [
      { code: 'bergen', name: 'Bergen', lat: 60.3894, lon: 5.33 },
      { code: 'oslo', name: 'Oslo', lat: 59.9139, lon: 10.7522 },
      { code: 'trondheim', name: 'Trondheim', lat: 63.4305, lon: 10.3951 },
      { code: 'stavanger', name: 'Stavanger', lat: 58.9700, lon: 5.7331 },
      { code: 'tromsø', name: 'Tromsø', lat: 69.6492, lon: 18.9553 },
      { code: 'bodø', name: 'Bodø', lat: 67.2803, lon: 14.3712 },
      { code: 'kristiansund', name: 'Kristiansund', lat: 63.1102, lon: 7.7278 },
      { code: 'ålesund', name: 'Ålesund', lat: 62.4720, lon: 6.1498 },
      { code: 'hammerfest', name: 'Hammerfest', lat: 70.6634, lon: 23.6821 },
      { code: 'narvik', name: 'Narvik', lat: 68.4384, lon: 17.4272 },
      { code: 'vardø', name: 'Vardø', lat: 70.3705, lon: 31.0241 },
      { code: 'honningsvåg', name: 'Honningsvåg', lat: 70.9821, lon: 25.9704 },
      { code: 'andenes', name: 'Andenes', lat: 69.3117, lon: 16.1155 },
      { code: 'rørvik', name: 'Rørvik', lat: 64.8616, lon: 11.2364 }
    ];

    // Request headers for Firebase Functions
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Get comprehensive weather forecast (9-day global coverage) via Firebase Function
  async getWeatherForecast(lat, lon, altitude = null) {
    try {
      console.log(`🌤️ MET Norway: Fetching weather forecast for ${lat}, ${lon}`);
      
      const response = await fetch(this.endpoints.weather, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({
          lat: lat,
          lon: lon,
          altitude: altitude
        })
      });

      if (!response.ok) {
        throw new Error(`MET Norway Weather API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Weather data fetch failed');
      }

      console.log('✅ MET Norway: Weather forecast fetched successfully');
      
      return this.processWeatherData(result.data);
    } catch (error) {
      console.error('MET Norway Weather API error:', error);
      throw error;
    }
  }

  // Get ocean/marine conditions (waves, currents, sea temperature) via Firebase Function
  async getOceanForecast(lat, lon) {
    try {
      console.log(`🌊 MET Norway: Fetching ocean forecast for ${lat}, ${lon}`);
      
      const response = await fetch(this.endpoints.ocean, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({
          lat: lat,
          lon: lon
        })
      });

      if (!response.ok) {
        console.error(`Ocean forecast request failed: ${response.status}`);
        return null;
      }

      const result = await response.json();

      if (!result.success) {
        if (result.message && result.message.includes('inland')) {
          console.warn('⚠️ Location outside ocean forecast coverage');
          return null;
        }
        console.error('Ocean forecast error:', result.error);
        return null;
      }

      // Handle case where data is null (inland location)
      if (result.data === null) {
        console.warn('⚠️ Location outside ocean forecast coverage');
        return null;
      }

      console.log('✅ MET Norway: Ocean forecast fetched successfully');
      
      return this.processOceanData(result.data);
    } catch (error) {
      console.error('MET Norway Ocean API error:', error);
      return null; // Ocean data is optional for inland locations
    }
  }

  // Get tidal water information for Norwegian harbors via Firebase Function
  async getTidalData(lat, lon) {
    try {
      const nearestHarbor = this.findNearestTidalHarbor(lat, lon);
      
      if (!nearestHarbor || nearestHarbor.distance > 100) { // Within 100km
        console.log('📍 No tidal harbor within reasonable distance');
        return null;
      }

      console.log(`🌊 MET Norway: Fetching tidal data for ${nearestHarbor.harbor.name}`);
      
      const response = await fetch(this.endpoints.tidal, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({
          harbor: nearestHarbor.harbor.code
        })
      });

      if (!response.ok) {
        console.error(`Tidal data request failed: ${response.status}`);
        return null;
      }

      const result = await response.json();

      if (!result.success) {
        console.error('Tidal data error:', result.error);
        return null;
      }

      console.log('✅ MET Norway: Tidal data fetched successfully');
      
      return this.parseTidalData(result.data, nearestHarbor.harbor);
    } catch (error) {
      console.error('MET Norway Tidal API error:', error);
      return null;
    }
  }

  // Get solar and lunar data (sunrise, sunset, moon phases) via Firebase Function
  async getSolarLunarData(lat, lon, date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      console.log(`🌅 MET Norway: Fetching solar/lunar data for ${lat}, ${lon} on ${targetDate}`);
      
      const response = await fetch(this.endpoints.solar, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({
          lat: lat,
          lon: lon,
          date: targetDate
        })
      });

      if (!response.ok) {
        // Handle different error cases more gracefully
        if (response.status === 400) {
          console.warn('⚠️ Solar/lunar data: Invalid location parameters');
          return null;
        }
        if (response.status === 500) {
          console.warn('⚠️ Solar/lunar data: Service temporarily unavailable');
          return null;
        }
        console.warn(`⚠️ Solar/lunar data: API error ${response.status}`);
        return null;
      }

      const result = await response.json();

      if (!result.success) {
        console.warn('⚠️ Solar/lunar data: Service returned error:', result.error);
        return null;
      }

      console.log('✅ MET Norway: Solar/lunar data fetched successfully');
      
      return this.processSolarLunarData(result.data);
    } catch (error) {
      console.warn('MET Norway Solar/Lunar API error (non-critical):', error.message);
      return null; // Return null instead of throwing error
    }
  }

  // Get real-time weather conditions (updated every 5 minutes) via Firebase Function
  async getNowcast(lat, lon) {
    try {
      console.log(`⚡ MET Norway: Fetching nowcast for ${lat}, ${lon}`);
      
      const response = await fetch(this.endpoints.nowcast, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({
          lat: lat,
          lon: lon
        })
      });

      if (!response.ok) {
        console.error(`Nowcast request failed: ${response.status}`);
        return null;
      }

      const result = await response.json();

      if (!result.success) {
        if (result.message && result.message.includes('Nordic')) {
          console.warn('⚠️ Location outside nowcast coverage (Nordic region only)');
          return null;
        }
        console.error('Nowcast error:', result.error);
        return null;
      }

      // Handle case where data is null (outside Nordic coverage)
      if (result.data === null) {
        console.warn('⚠️ Location outside nowcast coverage (Nordic region only)');
        return null;
      }

      console.log('✅ MET Norway: Nowcast fetched successfully');
      
      return this.processNowcastData(result.data);
    } catch (error) {
      console.error('MET Norway Nowcast API error:', error);
      return null;
    }
  }

  // Process weather forecast data
  processWeatherData(data) {
    const timeseries = data.properties.timeseries;
    const processed = {
      location: {
        lat: data.geometry.coordinates[1],
        lon: data.geometry.coordinates[0],
        altitude: data.geometry.coordinates[2] || 0
      },
      updated: data.properties.meta.updated_at,
      units: data.properties.meta.units,
      daily: [],
      hourly: []
    };

    // Group by days
    const dailyGroups = {};
    
    timeseries.forEach(entry => {
      const date = new Date(entry.time);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = [];
      }

      const instant = entry.data.instant?.details || {};
      const next1h = entry.data.next_1_hours?.details || {};
      const next6h = entry.data.next_6_hours?.details || {};
      
      const hourlyData = {
        time: entry.time,
        hour: date.getHours(),
        temperature: instant.air_temperature,
        pressure: instant.air_pressure_at_sea_level,
        humidity: instant.relative_humidity,
        windSpeed: instant.wind_speed,
        windDirection: instant.wind_from_direction,
        windGust: instant.wind_speed_of_gust,
        cloudCover: instant.cloud_area_fraction,
        precipitation: {
          amount: next1h.precipitation_amount || 0,
          probability: next1h.probability_of_precipitation || 0
        },
        uvIndex: instant.ultraviolet_index_clear_sky,
        symbol: entry.data.next_1_hours?.summary?.symbol_code || 
               entry.data.next_6_hours?.summary?.symbol_code
      };

      dailyGroups[dateKey].push(hourlyData);
      processed.hourly.push(hourlyData);
    });

    // Create daily summaries with fishing scores
    Object.keys(dailyGroups).forEach(dateKey => {
      const dayData = dailyGroups[dateKey];
      const temps = dayData.map(h => h.temperature).filter(t => t !== undefined);
      const pressures = dayData.map(h => h.pressure).filter(p => p !== undefined);
      
      const daily = {
        date: dateKey,
        temperature: {
          min: Math.min(...temps),
          max: Math.max(...temps),
          avg: temps.reduce((sum, t) => sum + t, 0) / temps.length
        },
        pressure: {
          min: Math.min(...pressures),
          max: Math.max(...pressures),
          avg: pressures.reduce((sum, p) => sum + p, 0) / pressures.length
        },
        wind: {
          avgSpeed: dayData.reduce((sum, h) => sum + (h.windSpeed || 0), 0) / dayData.length,
          maxSpeed: Math.max(...dayData.map(h => h.windSpeed || 0))
        },
        precipitation: {
          total: dayData.reduce((sum, h) => sum + (h.precipitation?.amount || 0), 0),
          maxProbability: Math.max(...dayData.map(h => h.precipitation?.probability || 0))
        },
        cloudCover: dayData.reduce((sum, h) => sum + (h.cloudCover || 0), 0) / dayData.length,
        fishingScore: this.calculateDailyFishingScore(dayData)
      };
      
      processed.daily.push(daily);
    });

    return processed;
  }

  // Process ocean forecast data
  processOceanData(data) {
    const timeseries = data.properties.timeseries;
    
    // Add safety check for timeseries
    if (!timeseries || !Array.isArray(timeseries) || timeseries.length === 0) {
      console.warn('⚠️ Ocean data: No valid timeseries data available');
      return null;
    }
    
    return {
      location: {
        lat: data.geometry.coordinates[1],
        lon: data.geometry.coordinates[0]
      },
      updated: data.properties.meta.updated_at,
      current: this.extractOceanConditions(timeseries[0]),
      forecast: timeseries.slice(0, 24).map(entry => ({
        time: entry.time,
        ...this.extractOceanConditions(entry)
      })).filter(entry => entry.time) // Filter out any invalid entries
    };
  }

  extractOceanConditions(entry) {
    // Add safety checks for undefined entry or missing data structure
    if (!entry || !entry.data || !entry.data.instant) {
      console.warn('⚠️ Ocean data: Invalid entry structure');
      return {
        waveHeight: null,
        waveDirection: null,
        wavePeriod: null,
        seaTemperature: null,
        currentSpeed: null,
        currentDirection: null
      };
    }
    
    const details = entry.data.instant.details || {};
    
    return {
      waveHeight: details.sea_surface_wave_height,
      waveDirection: details.sea_surface_wave_from_direction,
      wavePeriod: details.sea_surface_wave_period,
      seaTemperature: details.sea_water_temperature,
      currentSpeed: details.sea_water_speed,
      currentDirection: details.sea_water_to_direction
    };
  }

  // Parse tidal data (plain text format)
  parseTidalData(rawData, harbor) {
    const lines = rawData.split('\n');
    const dataLines = lines.filter(line => 
      line.match(/^\s*\d{4}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}/)
    );

    const tidalData = dataLines.slice(0, 48).map(line => { // Next 48 entries
      const parts = line.trim().split(/\s+/);
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      const hour = parseInt(parts[3]);
      const minute = parseInt(parts[4]);
      
      const time = new Date(year, month - 1, day, hour, minute);
      
      return {
        time: time.toISOString(),
        surge: parseFloat(parts[5]) || 0,
        tide: parseFloat(parts[6]) || 0,
        total: parseFloat(parts[7]) || 0,
        percentiles: {
          p0: parseFloat(parts[8]) || 0,
          p25: parseFloat(parts[9]) || 0,
          p50: parseFloat(parts[10]) || 0,
          p75: parseFloat(parts[11]) || 0,
          p100: parseFloat(parts[12]) || 0
        }
      };
    });

    return {
      harbor: harbor,
      updated: new Date().toISOString(),
      data: tidalData
    };
  }

  // Process solar and lunar data
  processSolarLunarData(data) {
    const properties = data.properties;
    
    return {
      location: {
        lat: data.geometry.coordinates[1],
        lon: data.geometry.coordinates[0]
      },
      date: properties.body?.find(b => b.name === 'sun')?.events?.[0]?.time?.split('T')[0],
      sun: this.extractSolarEvents(properties.body?.find(b => b.name === 'sun')),
      moon: this.extractLunarEvents(properties.body?.find(b => b.name === 'moon'))
    };
  }

  extractSolarEvents(sunData) {
    if (!sunData?.events) return null;
    
    const events = {};
    sunData.events.forEach(event => {
      events[event.desc] = event.time;
    });
    
    return {
      sunrise: events.sunrise,
      sunset: events.sunset,
      solarNoon: events.solar_noon,
      civilTwilightBegin: events.civil_twilight_begin,
      civilTwilightEnd: events.civil_twilight_end
    };
  }

  extractLunarEvents(moonData) {
    if (!moonData) return null;
    
    const events = {};
    if (moonData.events) {
      moonData.events.forEach(event => {
        events[event.desc] = event.time;
      });
    }
    
    return {
      moonrise: events.moonrise,
      moonset: events.moonset,
      phase: moonData.phase || 'unknown',
      illumination: moonData.illumination || 0
    };
  }

  // Process nowcast data
  processNowcastData(data) {
    const current = data.properties.timeseries[0];
    const instant = current.data.instant.details;
    
    return {
      location: {
        lat: data.geometry.coordinates[1],
        lon: data.geometry.coordinates[0]
      },
      updated: data.properties.meta.updated_at,
      radarCoverage: data.properties.radarCoverage || 'unknown',
      current: {
        time: current.time,
        temperature: instant.air_temperature,
        pressure: instant.air_pressure_at_sea_level,
        humidity: instant.relative_humidity,
        windSpeed: instant.wind_speed,
        windDirection: instant.wind_from_direction,
        precipitation: current.data.next_1_hours?.details?.precipitation_amount || 0
      },
      forecast2h: data.properties.timeseries.slice(0, 13).map(entry => ({
        time: entry.time,
        temperature: entry.data.instant.details.air_temperature,
        precipitation: entry.data.next_1_hours?.details?.precipitation_amount || 0
      }))
    };
  }

  // Calculate fishing score based on weather conditions
  calculateDailyFishingScore(dayData) {
    let score = 50; // Base score
    
    // Temperature scoring (optimal 8-18°C)
    const avgTemp = dayData.reduce((sum, h) => sum + (h.temperature || 0), 0) / dayData.length;
    if (avgTemp >= 8 && avgTemp <= 18) {
      score += 15;
    } else if (avgTemp >= 5 && avgTemp <= 25) {
      score += 8;
    }
    
    // Pressure stability (avoid rapid changes)
    const pressures = dayData.map(h => h.pressure).filter(p => p);
    if (pressures.length > 1) {
      const pressureRange = Math.max(...pressures) - Math.min(...pressures);
      if (pressureRange < 5) score += 10;
      else if (pressureRange > 15) score -= 10;
    }
    
    // Wind conditions (moderate wind preferred)
    const avgWind = dayData.reduce((sum, h) => sum + (h.windSpeed || 0), 0) / dayData.length;
    if (avgWind >= 2 && avgWind <= 8) {
      score += 10;
    } else if (avgWind > 12) {
      score -= 15;
    }
    
    // Cloud cover (overcast often better for fishing)
    const avgClouds = dayData.reduce((sum, h) => sum + (h.cloudCover || 0), 0) / dayData.length;
    if (avgClouds >= 40 && avgClouds <= 80) {
      score += 8;
    }
    
    // Precipitation (light rain can be good)
    const totalPrecip = dayData.reduce((sum, h) => sum + (h.precipitation?.amount || 0), 0);
    if (totalPrecip > 0 && totalPrecip < 5) {
      score += 5;
    } else if (totalPrecip > 15) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Find nearest tidal harbor
  findNearestTidalHarbor(lat, lon) {
    let nearest = null;
    let minDistance = Infinity;
    
    this.tidalHarbors.forEach(harbor => {
      const distance = this.calculateDistance(lat, lon, harbor.lat, harbor.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = harbor;
      }
    });
    
    return nearest ? { harbor: nearest, distance: minDistance } : null;
  }

  // Calculate distance between coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // Get comprehensive fishing conditions
  async getFishingConditions(lat, lon, altitude = null) {
    console.log(`🎣 MET Norway: Fetching comprehensive fishing data for ${lat}, ${lon}`);
    
    try {
      // Fetch all data in parallel for maximum efficiency
      const [weather, ocean, tidal, solarLunar, nowcast] = await Promise.allSettled([
        this.getWeatherForecast(lat, lon, altitude),
        this.getOceanForecast(lat, lon),
        this.getTidalData(lat, lon),
        this.getSolarLunarData(lat, lon),
        this.getNowcast(lat, lon)
      ]);

      const result = {
        success: true,
        location: { lat, lon, altitude },
        timestamp: new Date().toISOString(),
        data: {}
      };

      // Process results
      if (weather.status === 'fulfilled') {
        result.data.weather = weather.value;
      } else {
        console.error('Weather data failed:', weather.reason);
      }

      if (ocean.status === 'fulfilled' && ocean.value) {
        result.data.ocean = ocean.value;
      }

      if (tidal.status === 'fulfilled' && tidal.value) {
        result.data.tidal = tidal.value;
      }

      if (solarLunar.status === 'fulfilled') {
        result.data.solarLunar = solarLunar.value;
      } else {
        console.error('Solar/lunar data failed:', solarLunar.reason);
      }

      if (nowcast.status === 'fulfilled' && nowcast.value) {
        result.data.nowcast = nowcast.value;
      }

      console.log('✅ MET Norway: All fishing data compiled successfully');
      return result;

    } catch (error) {
      console.error('MET Norway comprehensive data error:', error);
      throw error;
    }
  }
}

export default METNorwayClient; 