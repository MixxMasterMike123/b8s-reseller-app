// SMHI API Client for FishTrip Wagon
// Swedish Meteorological and Hydrological Institute data
// Weather forecasts and water conditions for fishing

class SMHIClient {
  constructor() {
    // Use Firebase Functions as proxy instead of direct API calls
    this.baseUrl = 'https://us-central1-b8shield-reseller-app.cloudfunctions.net';
    
    // Real SMHI water monitoring stations (verified working IDs only)
    // Note: SMHI has limited water monitoring coverage, especially in northern Sweden
    this.waterStations = [
      // Verified working SMHI hydro stations (southern/central Sweden)
      { id: '2048', name: 'Vänern', lat: 58.95, lon: 13.5 },
      { id: '2054', name: 'Vättern', lat: 58.4, lon: 14.6 },
      { id: '2001', name: 'Mälaren', lat: 59.4, lon: 17.5 },
      { id: '2010', name: 'Storsjön', lat: 63.18, lon: 14.5 },
      { id: '2020', name: 'Siljan', lat: 60.8, lon: 14.8 },
      
      // Additional real stations for better coverage
      { id: '2025', name: 'Hjälmaren', lat: 59.2, lon: 15.5 },
      { id: '2050', name: 'Åsnen', lat: 56.5, lon: 14.7 }
    ];
  }

  // Get weather forecast for coordinates
  async getWeatherForecast(lat, lon) {
    try {
      console.log(`🌤️ SMHI: Fetching weather forecast for ${lat}, ${lon} via Firebase Functions`);
      
      const response = await fetch(`${this.baseUrl}/getFishTripWeatherData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lon })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Weather API error: ${response.status} - ${errorData.details || errorData.error}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch weather data');
      }

      console.log('✅ SMHI: Weather forecast fetched successfully');
      
      // Process raw SMHI data into fishing-relevant format
      const processedData = this.processWeatherData(result.data);
      console.log('🔄 SMHI: Weather data processed for fishing analysis');
      
      return processedData;
    } catch (error) {
      console.error('SMHI Weather API error:', error);
      throw error;
    }
  }

  // Process raw weather data into fishing-relevant format
  processWeatherData(data) {
    if (!data.timeSeries || data.timeSeries.length === 0) {
      throw new Error('No weather data available');
    }

    const processed = {
      location: {
        lat: data.geometry?.coordinates?.[1],
        lon: data.geometry?.coordinates?.[0]
      },
      referenceTime: data.referenceTime,
      daily: [],
      hourly: []
    };

    // Group by days and process
    const dailyGroups = {};
    
    data.timeSeries.forEach(entry => {
      const date = new Date(entry.validTime);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = [];
      }
      
      const hourlyData = {
        time: entry.validTime,
        hour: date.getHours(),
        temperature: this.getParameter(entry.parameters, 't'),
        pressure: this.getParameter(entry.parameters, 'msl'),
        windSpeed: this.getParameter(entry.parameters, 'ws'),
        windDirection: this.getParameter(entry.parameters, 'wd'),
        humidity: this.getParameter(entry.parameters, 'r'),
        precipitation: this.getParameter(entry.parameters, 'pcat'),
        cloudCover: this.getParameter(entry.parameters, 'tcc_mean'),
        visibility: this.getParameter(entry.parameters, 'vis')
      };
      
      dailyGroups[dateKey].push(hourlyData);
      processed.hourly.push(hourlyData);
    });

    // Create daily summaries
    Object.keys(dailyGroups).forEach(dateKey => {
      const dayData = dailyGroups[dateKey];
      const daily = {
        date: dateKey,
        temperature: {
          min: Math.min(...dayData.map(h => h.temperature)),
          max: Math.max(...dayData.map(h => h.temperature)),
          avg: dayData.reduce((sum, h) => sum + h.temperature, 0) / dayData.length
        },
        pressure: {
          min: Math.min(...dayData.map(h => h.pressure)),
          max: Math.max(...dayData.map(h => h.pressure)),
          avg: dayData.reduce((sum, h) => sum + h.pressure, 0) / dayData.length
        },
        wind: {
          avgSpeed: dayData.reduce((sum, h) => sum + h.windSpeed, 0) / dayData.length,
          maxSpeed: Math.max(...dayData.map(h => h.windSpeed))
        },
        precipitation: dayData.some(h => h.precipitation > 0),
        cloudCover: dayData.reduce((sum, h) => sum + h.cloudCover, 0) / dayData.length,
        fishingScore: this.calculateDailyFishingScore(dayData)
      };
      
      processed.daily.push(daily);
    });

    return processed;
  }

  // Get parameter value from SMHI parameter array
  getParameter(parameters, name) {
    const param = parameters.find(p => p.name === name);
    return param ? param.values[0] : null;
  }

  // Calculate fishing score based on weather conditions
  calculateDailyFishingScore(dayData) {
    let score = 50; // Base score
    
    // Temperature scoring (optimal 15-22°C)
    const avgTemp = dayData.reduce((sum, h) => sum + h.temperature, 0) / dayData.length;
    if (avgTemp >= 15 && avgTemp <= 22) {
      score += 20;
    } else if (avgTemp >= 10 && avgTemp <= 25) {
      score += 10;
    } else if (avgTemp < 5 || avgTemp > 30) {
      score -= 20;
    }

    // Pressure scoring (stable high pressure is good)
    const avgPressure = dayData.reduce((sum, h) => sum + h.pressure, 0) / dayData.length;
    const pressureRange = Math.max(...dayData.map(h => h.pressure)) - Math.min(...dayData.map(h => h.pressure));
    
    if (avgPressure > 1015 && pressureRange < 5) {
      score += 15; // Stable high pressure
    } else if (avgPressure < 1000 || pressureRange > 10) {
      score -= 15; // Low or unstable pressure
    }

    // Wind scoring (light wind is best)
    const avgWind = dayData.reduce((sum, h) => sum + h.windSpeed, 0) / dayData.length;
    if (avgWind <= 3) {
      score += 10; // Calm conditions
    } else if (avgWind > 8) {
      score -= 15; // Too windy
    }

    // Cloud cover (overcast can be good for fishing)
    const avgClouds = dayData.reduce((sum, h) => sum + h.cloudCover, 0) / dayData.length;
    if (avgClouds >= 50 && avgClouds <= 80) {
      score += 5; // Partial overcast
    }

    // Precipitation penalty
    if (dayData.some(h => h.precipitation > 0)) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Get water temperature data from hydro stations
  async getWaterTemperature(lat, lon) {
    try {
      // Use known SMHI station IDs for water temperature
      const stationId = this.findNearestWaterStation(lat, lon);
      
      if (!stationId) {
        console.log('🌡️ SMHI: No water temperature station found for this location');
        return null;
      }
      
      console.log(`🌡️ SMHI: Fetching water temperature for station ${stationId} via Firebase Functions`);
      
      const response = await fetch(`${this.baseUrl}/getFishTripWaterData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          parameter: 4, // Water temperature parameter
          stationId: stationId 
        })
      });

      if (!response.ok) {
        console.log(`🌡️ SMHI: Water temperature not available for station ${stationId}`);
        return null;
      }

      const result = await response.json();
      
      if (!result.success) {
        console.log(`🌡️ SMHI: Water temperature data not available: ${result.error}`);
        return null;
      }

      console.log('✅ SMHI: Water temperature data fetched successfully');
      return result.data;
    } catch (error) {
      console.error('SMHI Water Temperature API error:', error);
      return null; // Return null instead of throwing to allow other data to load
    }
  }

  // Get water level data
  async getWaterLevel(lat, lon) {
    try {
      // Use known SMHI station IDs for water level
      const stationId = this.findNearestWaterStation(lat, lon);
      
      if (!stationId) {
        console.log('🌊 SMHI: No water level station found for this location');
        return null;
      }
      
      console.log(`🌊 SMHI: Fetching water level for station ${stationId} via Firebase Functions`);
      
      const response = await fetch(`${this.baseUrl}/getFishTripWaterData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          parameter: 3, // Water level parameter
          stationId: stationId 
        })
      });

      if (!response.ok) {
        console.log(`🌊 SMHI: Water level not available for station ${stationId}`);
        return null;
      }

      const result = await response.json();
      
      if (!result.success) {
        console.log(`🌊 SMHI: Water level data not available: ${result.error}`);
        return null;
      }

      console.log('✅ SMHI: Water level data fetched successfully');
      return result.data;
    } catch (error) {
      console.error('SMHI Water Level API error:', error);
      return null; // Return null instead of throwing to allow other data to load
    }
  }

  // Find nearest monitoring station
  findNearestStation(lat, lon, stations) {
    if (!stations || stations.length === 0) {
      return null;
    }

    let nearest = null;
    let minDistance = Infinity;

    stations.forEach(station => {
      if (station.active && station.latitude && station.longitude) {
        const distance = this.calculateDistance(lat, lon, station.latitude, station.longitude);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = station;
        }
      }
    });

    return nearest;
  }

  // Find nearest water monitoring station
  findNearestWaterStation(lat, lon) {
    if (!this.waterStations || this.waterStations.length === 0) {
      console.log('🚫 SMHI: No water stations database available');
      return null;
    }

    let nearestStation = null;
    let minDistance = Infinity;

    console.log(`🔍 SMHI: Finding nearest water station for ${lat}, ${lon}`);

    for (const station of this.waterStations) {
      const distance = this.calculateDistance(lat, lon, station.lat, station.lon);
      console.log(`📍 SMHI: Station ${station.name} (${station.id}) distance: ${distance.toFixed(1)}km`);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    }

    if (nearestStation) {
      console.log(`✅ SMHI: Nearest station: ${nearestStation.name} (${nearestStation.id}) at ${minDistance.toFixed(1)}km`);
    }

    // Use more generous distance limits for water data (SMHI coverage is limited)
    const maxDistance = 500; // Increased for better coverage - water data is sparse
    if (minDistance <= maxDistance) {
      console.log(`✅ SMHI: Station within ${maxDistance}km limit, using ${nearestStation.id}`);
      console.log(`ℹ️  SMHI: Note - Water data from ${nearestStation.name}, ${minDistance.toFixed(0)}km away`);
      return nearestStation.id;
    } else {
      console.log(`❌ SMHI: Nearest station ${minDistance.toFixed(1)}km away, exceeds ${maxDistance}km limit`);
      console.log(`ℹ️  SMHI: Water monitoring coverage limited in northern Sweden`);
      return null;
    }
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get latest value from time series
  getLatestValue(values) {
    if (!values || values.length === 0) {
      return null;
    }
    
    // Values are usually sorted by date, get the most recent
    const latest = values[values.length - 1];
    return latest.value;
  }
}

export default SMHIClient; 