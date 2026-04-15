import { VercelRequest, VercelResponse } from '@vercel/node';

const CODEFORCES_API = 'https://codeforces.com/api';

// Health check for debugging
if (process.env.VERCEL_ENV === 'production') {
  console.log('[codeforces-api] Function loaded in production');
} else {
  console.log('[codeforces-api] Function loaded in development');
}

export default async (req: VercelRequest, res: VercelResponse) => {
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
    const { endpoint, ...params } = req.query as { endpoint?: string | string[]; [key: string]: any };

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

    console.log(`[codeforces-api] Proxying: ${endpointStr} with params:`, params);

    // Fetch from Codeforces API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No body');
      console.error(`[codeforces-api] Error response (${response.status}): ${errorBody.slice(0, 500)}`);
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).json({ 
        error: `Codeforces API error: ${response.status}`,
      });
    }

    if (!contentType?.includes('application/json')) {
      console.error(`[codeforces-api] Invalid content type: ${contentType}`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ 
        error: 'Invalid response from Codeforces API',
        contentType
      });
    }

    const data = await response.json();
    
    // Validate Codeforces response format
    if (!data || typeof data !== 'object') {
      console.error('[codeforces-api] Invalid JSON response format');
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ 
        error: 'Invalid response format from Codeforces API'
      });
    }

    // Set cache headers for GET requests (5 minutes)
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('[codeforces-api] Exception:', error);
    
    // Determine error type for better debugging
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
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
        statusCode = 504;
      }
    }
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
