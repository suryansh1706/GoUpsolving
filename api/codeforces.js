const CODEFORCES_API = 'https://codeforces.com/api';

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[API] Query params:', req.query);
    
    const { endpoint, ...params } = req.query;

    // Validate endpoint
    if (!endpoint) {
      console.error('[API] Missing endpoint');
      return res.status(400).json({ error: 'Missing endpoint parameter' });
    }

    // Handle endpoint as array (query params can be arrays)
    const endpointStr = Array.isArray(endpoint) ? endpoint[0] : endpoint;

    // Build request URL
    const apiUrl = new URL(`${CODEFORCES_API}/${endpointStr}`);
    
    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const paramValue = Array.isArray(value) ? value[0] : value;
        apiUrl.searchParams.append(key, String(paramValue));
      }
    });

    console.log(`[API] Calling Codeforces: ${apiUrl.toString()}`);

    // Make the request
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'User-Agent': 'GoUpsolving/1.0'
      }
    });

    console.log(`[API] Response status: ${response.status}`);

    // Read response text first (safer)
    const responseText = await response.text();
    console.log(`[API] Response length: ${responseText.length}`);

    if (!response.ok) {
      console.error(`[API] Error from Codeforces: ${response.status}`);
      console.error(`[API] Error body: ${responseText.slice(0, 200)}`);
      return res.status(response.status).json({
        error: `Codeforces API returned ${response.status}`,
        details: responseText.slice(0, 100)
      });
    }

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[API] JSON parse error:', e.message);
      return res.status(502).json({
        error: 'Invalid JSON from Codeforces API',
        details: e.message
      });
    }

    console.log(`[API] ✓ Success for endpoint: ${endpointStr}`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(data);

  } catch (error) {
    console.error('[API] Exception:', error);
    console.error('[API] Stack:', error.stack);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      type: error.constructor.name
    });
  }
};
