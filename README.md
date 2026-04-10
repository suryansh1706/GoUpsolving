# Codeforces Upsolve Tracker

A React utility for identifying and tracking Codeforces problems that users should upsolve based on their performance history.

## Features

- 🎯 **Smart Problem Recommendation**: Identifies problems worth upsolving based on user's max rating
- 📊 **Rating-Based Filtering**: Only shows problems rated ≤ (max rating + 200)
- 📅 **Recent Contests Only**: Considers only contests from the last 6 months
- 🔄 **Smart Status Categorization**: Tracks whether problems are not attempted, attempted, or upsolved
- ⚡ **API Caching**: Minimizes Codeforces API calls with intelligent 5-minute caching
- 🎨 **React Hook Interface**: Easy-to-use `useUpsolveProblems` hook for React components
- 🔍 **Built-in Filtering**: Filter by status, rating range, and tags
- 📱 **Production Ready**: Full TypeScript support with comprehensive error handling

## Architecture

### File Structure

```
├── codesforces-upsolve-service.ts  # Core service with API logic
├── useUpsolveProblems.ts           # React hook wrapper
├── CodeforcesUpsolveTracker.tsx    # Example component with UI
├── package.json                     # Dependencies
└── README.md                        # This file
```

### Components

#### 1. **codeforces-upsolve-service.ts**
Core service layer providing:
- Codeforces API integration with error handling
- Intelligent caching system
- Problem filtering and deduplication logic
- Status determination (not_attempted, attempted, upsolved)

**Main Export:**
```typescript
export async function getUpsolveProblems(handle: string): Promise<UpsolveProblem[]>
```

#### 2. **useUpsolveProblems.ts**
React hook providing:
- Automatic data fetching on mount
- Loading and error states
- Statistics (total, attempted, upsolved counts)
- Manual refetch capability
- Cache clearing

**Usage:**
```typescript
const { data, loading, error, refetch, stats } = useUpsolveProblems(handle);
```

#### 3. **CodeforcesUpsolveTracker.tsx**
Example component showing:
- Search form for Codeforces handles
- Statistics display
- Advanced filtering (status, rating range, tags)
- Sorting options
- Linked problem cards

## Algorithm Explanation

### Data Flow

```
1. Fetch User Rating History
   └─> Get maximum rating achieved

2. Fetch User Submissions
   └─> Cache all submission verdicts

3. Fetch Contest List (Last 6 Months)
   └─> Determine contest start times

4. For Each Recent Contest:
   ├─> Fetch contest standings & problems
   ├─> Identify problems solved DURING contest
   └─> For unsolved problems:
       ├─> Check rating ≤ (maxRating + 200)
       ├─> Determine status (attempted/upsolved)
       └─> Add to upsolve list

5. Deduplicate & Sort
   └─> Return sorted by rating (ascending)
```

### Status Determination

For each problem not solved during the contest:

| Condition | Status |
|-----------|--------|
| No submissions at all | `not_attempted` |
| Has submission(s) but no AC | `attempted` |
| Has AC submission after contest | `upsolved` |

**Note:** Problems solved during contests are excluded entirely.

### Rating Filter

Only problems with:
```
problemRating ≤ (userMaxRating + 200)
```
are included. This ensures recommendations are within challenging but attainable difficulty.

## API Integration

### Codeforces API Endpoints Used

1. **user.rating** - Get user's rating history
   ```
   GET https://codeforces.com/api/user.rating?handle={handle}
   ```

2. **user.status** - Get all user submissions
   ```
   GET https://codeforces.com/api/user.status?handle={handle}
   ```

3. **contest.list** - Get list of all contests
   ```
   GET https://codeforces.com/api/contest.list
   ```

4. **contest.standings** - Get contest problems and standings
   ```
   GET https://codeforces.com/api/contest.standings?contestId={id}&from=1&count=1
   ```

### Caching Strategy

- **Cache Duration:** 5 minutes
- **Cache Key:** `${endpoint}:${JSON.stringify(params)}`
- **Cache Invalidation:** Time-based (automatic after 5 minutes)
- **Clear Cache:** Call `clearCache()` function

**Benefits:**
- Reduces redundant API calls if user searches same handle twice
- Improves performance for multiple operations
- Respects Codeforces API rate limits

## Type Definitions

```typescript
interface UpsolveProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  status: "not_attempted" | "attempted" | "upsolved";
  points?: number;
  solvedAt?: number;
}

interface UseUpsolveProblemsResult {
  data: UpsolveProblem[] | null;
  loading: boolean;
  error: Error | null;
  refetch: (handle: string) => Promise<void>;
  clearCachedData: () => void;
  stats: {
    total: number;
    attempted: number;
    upsolved: number;
  };
}
```

## Usage Examples

### Basic Hook Usage

```typescript
import { useUpsolveProblems } from "./useUpsolveProblems";

function MyComponent() {
  const { data, loading, error, stats } = useUpsolveProblems("tourist");

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Total: {stats.total}</p>
      <p>Attempted: {stats.attempted}</p>
      <p>Upsolved: {stats.upsolved}</p>
      {data?.map(problem => (
        <div key={`${problem.contestId}-${problem.index}`}>
          <h3>{problem.name}</h3>
          <p>Rating: {problem.rating}</p>
          <p>Status: {problem.status}</p>
        </div>
      ))}
    </div>
  );
}
```

### Direct Service Usage

```typescript
import { getUpsolveProblems, clearCache } from "./codesforces-upsolve-service";

// Fetch problems
const problems = await getUpsolveProblems("yuki_2012");
console.log(`Found ${problems.length} upsolve problems`);

// Clear cache if needed
clearCache();
```

### With Filtering

```typescript
function FilteredView() {
  const { data } = useUpsolveProblems("Ashishgup");
  
  // Filter for hard problems (rating 2000+)
  const hardProblems = data?.filter(p => (p.rating || 0) >= 2000) || [];
  
  // Filter for only upsolved
  const upsolved = data?.filter(p => p.status === "upsolved") || [];
  
  // Filter by tags
  const dpProblems = data?.filter(p => p.tags.includes("dp")) || [];
}
```

## Performance Characteristics

### Time Complexity
- Fetching: O(n) where n = total submissions + contests
- Filtering: O(m) where m = recent contest problems
- Deduplication: O(k log k) where k = candidate problems

### Space Complexity
- Cache: O(c) where c = unique cached API responses
- Result Array: O(k) where k = upsolve problems

### Estimated API Calls
Without caching: 3-5 calls per unique handle
- 1 × user.rating (1 call)
- 1 × user.status (1 call)
- 1 × contest.list (1 call)
- N × contest.standings (N calls for each contest)

**Typical N for 6-month period:** 20-40 calls

### With Caching
- First search: 20-40+ calls
- Subsequent searches (within 5 min): 0 calls
- Cache hit rate depends on user behavior

## Error Handling

The service handles:
- Network errors (timeouts, connection failures)
- Invalid handles (404 responses)
- API rate limits (automatic retry with exponential backoff recommended)
- Missing contest data (skips problematic contests)
- Malformed responses (graceful degradation)

### Error Recovery

```typescript
try {
  const problems = await getUpsolveProblems(handle);
} catch (error) {
  console.error("Failed to fetch upsolve problems:", error);
  // Show user-friendly error message
}
```

## Configuration & Customization

### Adjusting Time Window

To change from 6 months to 3 months, modify in `codesforces-upsolve-service.ts`:

```typescript
// Line: filterContestsLast6Months function
const sixMonthsAgo = Math.floor(Date.now() / 1000) - 3 * 30 * 24 * 60 * 60; // 3 months
```

### Adjusting Rating Buffer

To change the +200 rating buffer to +150:

```typescript
// Line: In getUpsolveProblems function
if (problemRating > maxRating + 150) {
  return;
}
```

### Cache Duration

To change cache from 5 minutes to 10 minutes:

```typescript
// In APICache class
private cacheExpiry = 10 * 60 * 1000; // 10 minutes
```

## API Rate Limits

Codeforces API has rate limits:
- **Limit:** ~1-2 requests per second
- **Burst:** Up to 5 requests in quick succession

The current implementation respects these limits. For production use, consider adding:
- Exponential backoff retry logic
- Request debouncing
- Rate limit headers monitoring

## Testing

### Test Handle Examples
- `"tourist"` - High-rated competitive programmer
- `"Ashishgup"` - Established user
- `"yuki_2012"` - Another example

### Expected Behavior Validation

```typescript
// Verify max rating is reasonable
const maxRating = getMaxRating(ratingHistory);
assert(maxRating >= 0 && maxRating <= 3500, "Invalid max rating");

// Verify no duplicates
const problemIds = new Set();
problems.forEach(p => {
  const id = `${p.contestId}-${p.index}`;
  assert(!problemIds.has(id), "Duplicate problem found");
  problemIds.add(id);
});

// Verify rating filter
problems.forEach(p => {
  if (p.rating) {
    assert(p.rating <= maxRating + 200, "Problem rating exceeds threshold");
  }
});
```

## Browser Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ React 18+
- ✅ TypeScript 4.5+
- ✅ Node.js 16+

## Common Issues & Solutions

### Issue: "Invalid handle" Error
**Solution:** Verify the handle exists on Codeforces and is spelled correctly.

### Issue: Empty results for new users
**Solution:** User may not have participated in contests in the last 6 months. Adjust the time window or check contest history.

### Issue: Too many API calls triggering rate limits
**Solution:** 
- Use caching (automatically enabled)
- Increase cache duration
- Implement request debouncing in the component

### Issue: Old cached data
**Solution:** Call `clearCache()` function to force refresh.

## Performance Tips

1. **Memoize Results:** Use `React.useMemo` for filtered data
2. **Lazy Load:** Load problems on-demand rather than on mount
3. **Batch Operations:** Process multiple handles sequentially, not in parallel
4. **Cache Strategically:** Clear cache only when necessary

## Future Enhancements

- [ ] Support for upsolving "spree" tracking
- [ ] Integration with user profiles
- [ ] Difficulty trend analysis
- [ ] Recommendation explanations (why this problem?)
- [ ] Export/share upsolve lists
- [ ] Integration with calendar for deadline tracking
- [ ] AI-powered difficulty predictions

## License

MIT

## Support

For issues or feature requests related to this module, please contact or open an issue in your repository.

---

**Version:** 1.0.0
**Last Updated:** April 2026
**Author:** Generated by GitHub Copilot
#   G o U p s o l v i n g  
 