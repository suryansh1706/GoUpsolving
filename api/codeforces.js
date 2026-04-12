const CODEFORCES_API = 'https://codeforces.com/api';

// Health check for debugging
if (process.env.VERCEL_ENV === 'production') {
  console.log('[codeforces-api] Function loaded in production');
} else {
  console.log('[codeforces-api] Function loaded in development');
}

module.exports = async (req, res) => {
  // Enable CORS for frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, ...params } = req.query;

    // Handle endpoint as string or array and validate
    const endpointStr = Array.isArray(endpoint) ? endpoint[0] : endpoint;

    if (!endpointStr || typeof endpointStr !== 'string') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Missing or invalid endpoint parameter' });
    }

    // Validate endpoint format (alphanumeric and dots only)
    if (!/^[a-zA-Z0-9.]+$/.test(endpointStr)) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Invalid endpoint format' });
    }

    // Build URL with parameters
    const url = new URL(`${CODEFORCES_API}/${endpointStr}`);
    
    // Handle all params (could be string or array)
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const paramValue = Array.isArray(value) ? value[0] : value;
      if (paramValue !== undefined && paramValue !== null) {
        url.searchParams.append(key, String(paramValue));
      }
    });

    console.log(`[codeforces-api] Proxying: ${endpointStr} with params:`, Object.keys(params));
    console.log(`[codeforces-api] Full URL: ${url.toString()}`);

    // Fetch from Codeforces API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GoUpsolving/1.0 (+https://go-upsolving.vercel.app)'
        }
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[codeforces-api] Fetch failed:', fetchError.message);
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ 
        error: 'Network error',
        details: fetchError.message
      });
    }

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        errorBody = 'Could not read error body';
      }
      
      console.error(`[codeforces-api] Error response (${response.status}): ${errorBody.slice(0, 500)}`);
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).json({ 
        error: `Codeforces API error: ${response.status}`,
        details: errorBody.slice(0, 200)
      });
    }

    if (!contentType?.includes('application/json')) {
      console.error(`[codeforces-api] Invalid content type: ${contentType}`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ 
        error: 'Invalid response from Codeforces API',
        contentType: contentType || 'unknown'
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[codeforces-api] JSON parse failed:', parseError.message);
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ 
        error: 'Failed to parse Codeforces API response',
        details: parseError.message
      });
    }
    
    // Validate Codeforces response format
    if (!data || typeof data !== 'object') {
      console.error('[codeforces-api] Invalid JSON response format');
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ 
        error: 'Invalid response format from Codeforces API'
      });
    }

    console.log(`[codeforces-api] ✓ Success: ${endpointStr}`);

    // Set cache headers for GET requests (5 minutes)
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('[codeforces-api] Unhandled exception:', error);
    
    let errorMessage = 'Unknown error';
    let statusCode = 500;
    
    if (error instanceof TypeError) {
      if (error.message.includes('fetch')) {
        errorMessage = 'Network error connecting to Codeforces';
        statusCode = 502;
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Failed to parse API response';
        statusCode = 502;
      }
    } else if (error instanceof Error) {
      if (error.message.includes('AbortError')) {
        errorMessage = 'Request timeout';
        statusCode = 504;
      }
    }
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: error && error.message ? error.message : 'Unknown error'
    });
  }
};
