# Quick Debugging Guide

## When the API returns an error

### 1️⃣ Codeforces Server Error (500, 502, 503, 504)
**What it means:** Codeforces.com is having issues, NOT your app
**What to do:** 
- Check if codeforces.com is working
- Tell user to try again in a few minutes

### 2️⃣ User Not Found
**What it means:** Username doesn't exist on Codeforces
**What to do:** Ask user to check their username spelling

### 3️⃣ Network Error
**What it means:** Can't reach Codeforces or internet is down
**What to do:** Check internet connection

### 4️⃣ Request Timeout (504)
**What it means:** Codeforces took more than 15 seconds to respond
**What to do:** Try again, Codeforces might be slow

### 5️⃣ Rate Limited (429)
**What it means:** Too many requests too fast
**What to do:** Wait a minute and try again

---

## Looking at Logs

### Browser Console (F12)
```
📦 Cache hit: user.rating          → Using saved data
🌐 Calling: user.rating            → Making API call  
✅ Success: user.rating            → Got response
❌ CODEFORCES_API: ...              → API error
```

### Browser Network Tab (F12 → Network)
1. Search for: `/api/codeforces`
2. Click the request
3. Check:
   - **Status**: 200 = good, anything else = problem
   - **Headers**: Look for CORS headers
   - **Response**: See what data came back or error message

### Vercel Dashboard
1. Go to vercel.com
2. Select your project
3. Click "Deployments"
4. Click the latest deployment
5. Go to "Logs" tab
6. See what happened on the server

---

## Common Error Messages

| Error Message | Root Cause | Fix |
|---|---|---|
| `Codeforces Server Error - Their servers are having issues` | Codeforces API returned 500 | Wait and retry |
| `User not found: No such user` | Username typo or doesn't exist | Check username |
| `Network error: Unable to reach Codeforces` | No internet or firewall | Check connection |
| `Request timeout - Codeforces took too long` | Codeforces slow or overloaded | Try again |
| `Rate Limited` | Too many requests | Wait 1 minute |

---

## Code Flow (What happens when you search)

```
User types "suryansh1706" and presses Enter
                ↓
Browser calls: /api/codeforces?endpoint=user.rating&handle=suryansh1706
                ↓
Vercel receives request
                ↓
Vercel validates endpoint (must be alphanumeric + dots only)
                ↓
Vercel calls: https://codeforces.com/api/user.rating?handle=suryansh1706
                ↓
Codeforces API responds
                ↓
Vercel checks: Is response OK? Is JSON valid? Is data present?
                ↓
Vercel sends response back to browser
                ↓
Browser stores in cache
                ↓
React processes data
                ↓
Display results or error message
```

---

## How to Test API Manually

### Using Browser Console:
```javascript
// Test the proxy endpoint
fetch('/api/codeforces?endpoint=user.rating&handle=suryansh1706')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

### Using curl (terminal):
```bash
curl "https://your-domain.vercel.app/api/codeforces?endpoint=user.rating&handle=suryansh1706"
```

---

## Performance Tips

- **Logs are slow**: Remove `console.log` calls in production
- **Cache helps**: First call takes 15s (with Codeforces delay), next calls instant
- **Batch requests**: Don't call API multiple times, collect all data you need
- **Use local cache**: Check `apiCache` before making requests

---

## Emergency Fixes

If something breaks and you need quick fix:

1. **Is the proxy down?**
   - Check Vercel status page
   - Check deployment logs
   - Redeploy if needed

2. **Is Codeforces API down?**
   - Go to codeforces.com
   - If site is down, nothing you can do
   - Show user friendly message about Codeforces being down

3. **Is there a bug in code?**
   - Check browser console for errors
   - Check Vercel logs
   - Look at the error stack trace
   - Fix the bug, test locally, push to GitHub

---

## Questions?

- **What's a 502 error?** = Bad Gateway = Proxy can't reach Codeforces
- **What's a 504 error?** = Timeout = Took too long
- **What's cached?** = API responses, not UI state
- **How long is cache?** = 5 minutes for Vercel, instant for browser
- **Can I clear cache?** = Yes, there's a button in the app UI
