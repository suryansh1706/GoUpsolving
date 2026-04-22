# Code Architecture Guide

## Overview

The GoUpsolving app fetches data from Codeforces API. To avoid CORS issues, we use a proxy pattern:

```
Frontend (React)
    ↓
/api/codeforces (Vercel Proxy)
    ↓
https://codeforces.com/api (Actual API)
```

## File Structure

### Backend (Serverless Functions)
- **`api/codeforces.ts`** - Vercel serverless function
  - Acts as a proxy between frontend and Codeforces API
  - Validates requests
  - Handles errors gracefully
  - Adds CORS headers
  - Caches responses (5 min)

### Frontend (React)

#### API Client Layer
- **`src/services/codeforcesAPI.ts`** - Calls the proxy
  - 5 methods to fetch different data
  - Local caching to avoid duplicate requests
  - Error classification and handling

#### Services
- **`src/services/upsolveService.ts`** - Business logic
  - Analyzes user's contest history
  - Identifies problems to upsolve
  - Uses codeforcesAPI to get data

#### React Hooks
- **`src/useUpsolveProblems.ts`** - State management
  - Fetches data and manages loading/error state
  - Calculates statistics
  - Clears cache

#### UI Components
- **`src/components/ErrorDisplay.tsx`** - Shows errors
  - Different messages for Codeforces vs app errors
  - Helpful suggestions for users
  - Collapsible technical details

#### Error Types
- **`src/types/errors.ts`** - Error classification
  - `CODEFORCES_API` - Codeforces server issue
  - `CODEFORCES_INVALID_USER` - User not found
  - `NETWORK_ERROR` - No internet
  - `APPLICATION_ERROR` - Bug in our app

---

## Data Flow Example

### User searches for "suryansh1706":

```
1. Frontend: Call useUpsolveProblems("suryansh1706")
   ↓
2. Hook: setState({ loading: true })
   ↓
3. Service: getUpsolveProblems(handle)
   ↓
4. API Client: codeforcesAPI.getUserRatingHistory(handle)
   ↓
5. Request: GET /api/codeforces?endpoint=user.rating&handle=suryansh1706
   ↓
6. Proxy: Validates endpoint → Calls Codeforces API
   ↓
7. Codeforces: Returns user's rating history
   ↓
8. Response: Cached and returned to frontend
   ↓
9. UI: Display problems or error message
```

---

## Error Handling

### When things go wrong:

```
API Call Error
    ↓
Error Type Check:
    ├─ HTTP 500? → "Codeforces Server Error"
    ├─ User not found? → "User Not Found" 
    ├─ Network error? → "Check internet"
    └─ Other? → "Application Error"
    ↓
Show User-Friendly Message
    ↓
Include Technical Details (collapsible)
    ↓
Show Suggestion on what to do
```

---

## Key Constants

- **REQUEST_TIMEOUT**: 15 seconds (api/codeforces.ts)
- **CACHE_TIME**: 5 minutes (Vercel header)
- **LOCAL_CACHE**: Application memory cache

---

## How to Debug

1. **Check Console Logs** (browser DevTools)
   - `📦 Cache hit: ...` - Data from cache
   - `🌐 Calling: ...` - Making API call
   - `✅ Success: ...` - Successful response
   - `❌ Error: ...` - Error occurred

2. **Check Network Tab** (browser DevTools)
   - Look for `/api/codeforces` requests
   - Check response status and body
   - Verify CORS headers are present

3. **Check Vercel Logs**
   - Dashboard → Project → Deployments → Logs
   - Shows what happened on the proxy server

---

## Adding New API Endpoints

If you want to call a new Codeforces endpoint:

1. Add method to `codeforcesAPI` in `src/services/codeforcesAPI.ts`:
```typescript
async getNewData(param: string): Promise<NewDataType[]> {
  return callAPI<NewDataType[]>("new.endpoint", { param });
}
```

2. Use it in your service/component:
```typescript
const data = await codeforcesAPI.getNewData(param);
```

Done! The caching, error handling, and proxy logic all work automatically.

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 500 Error | Codeforces API down | Wait, show user friendly message |
| User not found | Invalid username | Show specific error message |
| Timeout (504) | Slow Codeforces servers | Retry or increase timeout |
| CORS Error | Missing proxy | Use `/api/codeforces` endpoint |
| Cache stale | Data older than 5 min | Clear cache or wait |

---

## Future Improvements

- [ ] Add retry logic for failed requests
- [ ] Implement exponential backoff for rate limiting
- [ ] Add analytics to track API usage
- [ ] Implement real-time data updates (WebSocket)
- [ ] Add pagination for large result sets
