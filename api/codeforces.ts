import { VercelRequest, VercelResponse } from '@vercel/node';

const CODEFORCES_API = 'https://codeforces.com/api';

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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, ...params } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  try {
    // Build URL with parameters
    const url = new URL(`${CODEFORCES_API}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    console.log(`Fetching: ${url.toString()}`);

    // Fetch from Codeforces API
    const response = await fetch(url.toString());

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Codeforces API returned ${response.status}` 
      });
    }

    const data = await response.json();
    
    // Set cache headers for GET requests (5 minutes)
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from Codeforces API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
