import { VercelRequest, VercelResponse } from '@vercel/node';

const CODEFORCES_API = 'https://codeforces.com/api';
const REQUEST_TIMEOUT = 15000; // 15 seconds

/**
 * CORS Headers - Allow frontend to call this API
 */
function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

/**
 * Extract and validate endpoint from query parameters
 */
function getValidatedEndpoint(endpoint: string | string[] | undefined): string | null {
  if (!endpoint) return null;
  
  const endpointStr = Array.isArray(endpoint) ? endpoint[0] : endpoint;
  
  // Only allow alphanumeric and dots (user.rating, contest.list, etc)
  if (!/^[a-zA-Z0-9.]+$/.test(endpointStr)) return null;
  
  return endpointStr;
}

/**
 * Build URL with query parameters
 */
function buildCodeforcesUrl(endpoint: string, params: Record<string, any>): URL {
  const url = new URL(`${CODEFORCES_API}/${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    // Skip undefined/null values
    if (value === undefined || value === null) return;
    
    // Handle arrays (query params can come as arrays)
    const paramValue = Array.isArray(value) ? value[0] : value;
    
    if (paramValue !== undefined && paramValue !== null) {
      url.searchParams.append(key, String(paramValue));
    }
  });
  
  return url;
}

/**
 * Fetch from Codeforces with timeout protection
 */
async function fetchFromCodeforces(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    return await fetch(url.toString(), { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verify response has valid JSON content
 */
function isValidJsonResponse(contentType: string | null): boolean {
  return contentType?.includes('application/json') ?? false;
}

/**
 * Main API Handler
 */
export default async (req: VercelRequest, res: VercelResponse) => {
  // Set a timeout to prevent function from hanging
  const timeoutId = setTimeout(() => {
    console.error('❌ Request timeout - returning 504');
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  }, 25000); // 25 second timeout (Vercel has 30 second limit)
  
  try {
    setCorsHeaders(res);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      clearTimeout(timeoutId);
      return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      clearTimeout(timeoutId);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Step 1: Extract and validate endpoint
      const { endpoint, ...params } = req.query as Record<string, any>;
      const validatedEndpoint = getValidatedEndpoint(endpoint);

      if (!validatedEndpoint) {
        clearTimeout(timeoutId);
        return res.status(400).json({ error: 'Missing or invalid endpoint parameter' });
      }

      // Step 2: Build URL
      const codeforcesUrl = buildCodeforcesUrl(validatedEndpoint, params);
      console.log(`📤 Calling Codeforces: ${validatedEndpoint}`);
      console.log(`📝 URL: ${codeforcesUrl.toString()}`);
      console.log(`📝 Params: ${JSON.stringify(params)}`);

      // Step 3: Fetch from Codeforces
      const response = await fetchFromCodeforces(codeforcesUrl);
      
      // Log response details for debugging
      const contentType = response.headers.get('content-type');
      console.log(`📨 Response status: ${response.status}, Content-Type: ${contentType}`);

      // Step 4: Check for HTTP errors
      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'No body');
        console.error(`❌ Codeforces returned ${response.status}: ${errorBody.slice(0, 200)}`);
        
        clearTimeout(timeoutId);
        return res.status(response.status).json({
          error: `Codeforces API error: ${response.status}`,
          details: errorBody.slice(0, 500),
        });
      }

      // Step 5: Verify JSON response
      if (!isValidJsonResponse(contentType)) {
        const bodyPreview = await response.text().catch(() => 'Unable to read');
        console.error(`❌ Invalid response type: ${contentType}`);
        console.error(`📝 Body preview: ${bodyPreview.slice(0, 500)}`);
        clearTimeout(timeoutId);
        return res.status(502).json({
          error: 'Invalid response from Codeforces API',
          contentType,
          bodyPreview: bodyPreview.slice(0, 500),
        });
      }

      // Step 6: Parse and return data
      let data: any;
      let responseText = '';
      try {
        responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ JSON parse error: ${parseError}`);
        console.error(`📝 Response text was: ${responseText.slice(0, 500) || 'not captured'}`);
        clearTimeout(timeoutId);
        return res.status(502).json({
          error: 'Failed to parse JSON response from Codeforces',
          parseError: String(parseError),
          bodyPreview: responseText.slice(0, 500) || 'unable to capture',
        });
      }
      
      if (!data || typeof data !== 'object') {
        console.error('❌ Invalid JSON structure');
        clearTimeout(timeoutId);
        return res.status(502).json({
          error: 'Invalid response format from Codeforces API',
        });
      }

      // Step 7: Cache successful response
      res.setHeader('Cache-Control', 'public, max-age=300');
      console.log(`✅ Success: ${validatedEndpoint}`);
      
      clearTimeout(timeoutId);
      return res.status(200).json(data);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('❌ Handler error:', error);
    clearTimeout(timeoutId);
    
    // Determine error type and appropriate status code
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
    } else if (error instanceof Error && error.name === 'AbortError') {
      errorMessage = 'Request timeout - Codeforces took too long to respond';
      statusCode = 504;
    }
    
    if (!res.headersSent) {
      return res.status(statusCode).json({
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
