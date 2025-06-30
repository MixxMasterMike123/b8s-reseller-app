// Geocoding utilities for FishTrip Wagon
// Location search with Swedish fishing location fallbacks

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Swedish fishing locations fallback coordinates
const KNOWN_SWEDISH_LOCATIONS = {
  'kultsjön': { lat: 64.95, lon: 16.8, name: 'Kultsjön, Saxnäs, Västerbotten' },
  'saxnäs': { lat: 64.95, lon: 16.8, name: 'Saxnäs, Västerbotten' },
  'vänern': { lat: 58.95, lon: 13.5, name: 'Vänern, Sverige' },
  'vättern': { lat: 58.3, lon: 14.6, name: 'Vättern, Sverige' },
  'siljan': { lat: 60.8, lon: 14.8, name: 'Siljan, Dalarna' },
  'storsjön': { lat: 63.18, lon: 14.64, name: 'Storsjön, Jämtland' },
  'bolmen': { lat: 56.9, lon: 13.5, name: 'Bolmen, Småland' },
  'mälaren': { lat: 59.4, lon: 17.5, name: 'Mälaren, Sverige' },
  'hjälmaren': { lat: 59.2, lon: 15.8, name: 'Hjälmaren, Sverige' },
  'åsnen': { lat: 56.4, lon: 14.7, name: 'Åsnen, Småland' },
  'ivösjön': { lat: 56.15, lon: 14.4, name: 'Ivösjön, Skåne' },
  'hornavan': { lat: 65.95, lon: 17.5, name: 'Hornavan, Lappland' },
  'uddjaure': { lat: 65.85, lon: 17.4, name: 'Uddjaure, Lappland' },
  'torneträsk': { lat: 68.35, lon: 19.8, name: 'Torneträsk, Lappland' },
  'malgomaj': { lat: 64.8, lon: 17.2, name: 'Malgomaj, Västerbotten' },
  'ångermanälven': { lat: 63.2, lon: 18.7, name: 'Ångermanälven, Norrland' },
  'dalälven': { lat: 60.6, lon: 17.0, name: 'Dalälven, Dalarna' },
  'göta älv': { lat: 57.7, lon: 11.97, name: 'Göta älv, Västergötland' },
  'motala ström': { lat: 58.5, lon: 15.0, name: 'Motala ström, Östergötland' },
  'emån': { lat: 57.0, lon: 15.6, name: 'Emån, Småland' },
  'lagan': { lat: 56.9, lon: 13.1, name: 'Lagan, Halland' },
  'nissan': { lat: 56.7, lon: 12.9, name: 'Nissan, Halland' },
  'ätran': { lat: 57.3, lon: 12.7, name: 'Ätran, Halland' }
};

// Geocode location using Nominatim with Swedish fallbacks
export const geocodeLocation = async (locationName) => {
  try {
    // Clean and prepare the location string
    const cleanLocation = locationName.replace(/,\s*/g, ' ').trim();
    
    // Build the request with proper headers
    const params = new URLSearchParams({
      q: cleanLocation,
      countrycodes: 'se',
      format: 'json',
      limit: '5',
      addressdetails: '1'
    });
    
    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'B8Shield-FishTrip-Wagon/1.0 (Swedish Fishing Intelligence)',
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
      const simplifiedLocation = locationName.split(',')[0].trim();
      const simplifiedParams = new URLSearchParams({
        q: simplifiedLocation,
        countrycodes: 'se',
        format: 'json',
        limit: '3'
      });
      
      const fallbackResponse = await fetch(`${NOMINATIM_BASE_URL}/search?${simplifiedParams}`, {
        headers: {
          'User-Agent': 'B8Shield-FishTrip-Wagon/1.0 (Swedish Fishing Intelligence)',
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
            importance: result.importance || 0.5,
            source: 'nominatim-fallback'
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
      importance: result.importance || 0.5,
      source: 'nominatim'
    }));
    
  } catch (error) {
    console.error('Geocoding error:', error);
    
    // Try hardcoded coordinates for common Swedish fishing locations as fallback
    const searchKey = locationName.toLowerCase().split(',')[0].trim();
    const knownLocation = KNOWN_SWEDISH_LOCATIONS[searchKey];
    
    if (knownLocation) {
      console.log(`Using fallback coordinates for ${locationName}`);
      return [{
        name: knownLocation.name,
        lat: knownLocation.lat,
        lon: knownLocation.lon,
        type: 'fishing_location',
        importance: 0.8,
        source: 'fallback'
      }];
    }
    
    // If no fallback found, throw the original error
    throw error;
  }
};

// Get current location using browser geolocation
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'geolocation'
        });
      },
      (error) => {
        let errorMessage = 'Geolocation error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

// Reverse geocode coordinates to location name
export const reverseGeocode = async (lat, lon) => {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
      zoom: '10'
    });
    
    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': 'B8Shield-FishTrip-Wagon/1.0 (Swedish Fishing Intelligence)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result || !result.display_name) {
      throw new Error('No location found for coordinates');
    }
    
    return {
      name: result.display_name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      type: result.type || 'unknown',
      address: result.address || {},
      source: 'reverse-geocode'
    };
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    
    // Return basic location info if reverse geocoding fails
    return {
      name: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
      lat: lat,
      lon: lon,
      type: 'coordinates',
      source: 'coordinates'
    };
  }
};

// Validate coordinates
export const validateCoordinates = (lat, lon) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return false;
  }
  
  // Check if coordinates are within Sweden's approximate bounds
  // Sweden: roughly 55-69°N, 11-24°E
  if (latitude < 55 || latitude > 69 || longitude < 11 || longitude > 24) {
    console.warn('Coordinates appear to be outside Sweden');
  }
  
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

// Calculate distance between two points
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Get list of known Swedish fishing locations
export const getKnownLocations = () => {
  return Object.entries(KNOWN_SWEDISH_LOCATIONS).map(([key, location]) => ({
    key,
    ...location
  }));
}; 