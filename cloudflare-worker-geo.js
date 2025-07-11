/**
 * CloudFlare Worker for B8Shield B2C Shop Geo-Targeting
 * Injects country and geo data into HTML for client-side currency detection
 * 
 * DEPLOY ONLY FOR: shop.b8shield.com
 * (B2B portal partner.b8shield.com stays in SEK)
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    // Only process requests for shop.b8shield.com
    const url = new URL(request.url)
    const hostname = url.hostname
    
    // Skip geo injection for non-shop domains
    if (hostname !== 'shop.b8shield.com') {
      console.log(`Skipping geo injection for domain: ${hostname}`)
      return fetch(request)
    }
    
    console.log(`Processing geo injection for B2C shop: ${hostname}`)
    
    // Get the original response from Firebase Hosting
    const response = await fetch(request)
    
    // Only process HTML responses
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('text/html')) {
      return response
    }
    
    // Get geo data from CloudFlare headers
    const country = request.headers.get('CF-IPCountry') || 'SE'
    const region = request.headers.get('CF-IPContinent') || 'EU'
    const city = request.headers.get('CF-IPCity') || 'Stockholm'
    const timezone = request.cf?.timezone || 'Europe/Stockholm'
    
    // Get original HTML
    const originalHtml = await response.text()
    
    // Inject geo data into HTML head
    const geoScript = `
    <script>
      // B8Shield CloudFlare Geo Data
      window.CF_COUNTRY = '${country}';
      window.CF_REGION = '${region}'; 
      window.CF_CITY = '${city}';
      window.CF_TIMEZONE = '${timezone}';
      window.CF_GEO_LOADED = true;
      
      console.log('🌍 CloudFlare Geo Data:', {
        country: '${country}',
        region: '${region}',
        city: '${city}',
        timezone: '${timezone}'
      });
    </script>
    `
    
    // Insert geo script right after <head> tag
    const modifiedHtml = originalHtml.replace(
      '<head>',
      '<head>' + geoScript
    )
    
    // Return modified response
    return new Response(modifiedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
    
  } catch (error) {
    console.error('CloudFlare Worker error:', error)
    // Return original response on error
    return fetch(request)
  }
}

/**
 * Alternative: API endpoint version
 * Add this route to the worker for AJAX requests
 */
async function handleGeoAPI(request) {
  const geoData = {
    country: request.headers.get('CF-IPCountry') || 'SE',
    region: request.headers.get('CF-IPContinent') || 'EU',
    city: request.headers.get('CF-IPCity') || 'Stockholm',
    timezone: request.cf?.timezone || 'Europe/Stockholm',
    timestamp: Date.now()
  }
  
  return new Response(JSON.stringify(geoData), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300' // 5 minutes cache
    }
  })
} 