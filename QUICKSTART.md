# Quick Start Guide

Get up and running with the Codeforces Upsolve Tracker in 5 minutes.

## Option 1: Using React Hook (Recommended for React Apps)

### Step 1: Import the Hook

```typescript
import { useUpsolveProblems } from "./useUpsolveProblems";
```

### Step 2: Use in Your Component

```typescript
function MyComponent() {
  const [handle, setHandle] = useState("tourist");
  const { data, loading, error, stats } = useUpsolveProblems(handle);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Upsolve Problems for {handle}</h2>
      <p>Total: {stats.total} | Attempted: {stats.attempted} | Upsolved: {stats.upsolved}</p>
      <ul>
        {data?.map(problem => (
          <li key={`${problem.contestId}-${problem.index}`}>
            <a href={`https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`}
               target="_blank">
              {problem.name} (Rating: {problem.rating || 'N/A'})
            </a>
            <span className="status">{problem.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Step 3: Customize with Filters (Optional)

```typescript
const { data } = useUpsolveProblems("tourist");

// Get only attempted problems with rating >= 1500
const filteredProblems = data?.filter(p => 
  p.status === "attempted" && (p.rating || 0) >= 1500
) || [];
```

---

## Option 2: Direct Service Usage (For Non-React Projects)

### Step 1: Import the Service

```typescript
import { getUpsolveProblems, clearCache } from "./codesforces-upsolve-service";
```

### Step 2: Fetch Problems

```typescript
async function main() {
  try {
    const problems = await getUpsolveProblems("tourist");
    
    console.log(`Found ${problems.length} problems to upsolve`);
    
    problems.forEach(problem => {
      console.log(`
        Problem: ${problem.name}
        Rating: ${problem.rating || 'N/A'}
        Status: ${problem.status}
        Tags: ${problem.tags.join(", ")}
        Link: https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}
      `);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```

### Step 3: Process Results

```typescript
// Filter by rating
const easyProblems = problems.filter(p => (p.rating || 0) <= 1300);

// Filter by status
const upsolved = problems.filter(p => p.status === "upsolved");

// Filter by tags
const dpProblems = problems.filter(p => p.tags.includes("dp"));

// Get statistics
const stats = {
  total: problems.length,
  easy: easyProblems.length,
  upsolved: upsolved.length
};

console.log(stats);
```

---

## Using the Example Component

The project includes a complete example component with UI, filtering, and sorting.

### Import and Use

```typescript
import CodeforcesUpsolveTracker from "./CodeforcesUpsolveTracker";

export default function App() {
  return <CodeforcesUpsolveTracker />;
}
```

### Features Included

- 🔍 Search by Codeforces handle
- 📊 View statistics (total, attempted, upsolved)
- 🎯 Filter by status, rating range, and tags
- 📈 Sort by rating, name, or status
- 🔗 Direct links to problems on Codeforces
- 🎨 Status badges and rating classifications

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Configure TypeScript (Optional)

The project includes `tsconfig.json`. If using TypeScript:

```bash
npm run type-check
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

---

## Common Use Cases

### Use Case 1: Track Personal Upsolve Progress

```typescript
function UpsolveProgressTracker() {
  const [myHandle] = useState("your_handle");
  const { data } = useUpsolveProblems(myHandle);

  const progress = {
    total: data?.length || 0,
    attempted: data?.filter(p => p.status === "attempted").length || 0,
    upsolved: data?.filter(p => p.status === "upsolved").length || 0,
    completionRate: data ? ((data.filter(p => p.status === "upsolved").length / data.length) * 100).toFixed(1) : 0
  };

  return (
    <div>
      <h3>Your Progress</h3>
      <p>{progress.upsolved}/{progress.total} upsolved ({progress.completionRate}%)</p>
    </div>
  );
}
```

### Use Case 2: Find Specific Difficulty Problems

```typescript
function DifficultySelector() {
  const { data } = useUpsolveProblems("tourist");
  const [difficulty, setDifficulty] = useState("medium");

  const filtered = data?.filter(p => {
    const rating = p.rating || 0;
    switch(difficulty) {
      case "easy": return rating < 1300;
      case "medium": return rating >= 1300 && rating < 1700;
      case "hard": return rating >= 1700 && rating < 2100;
      case "veryhard": return rating >= 2100;
      default: return true;
    }
  }) || [];

  return (
    <div>
      <select onChange={(e) => setDifficulty(e.target.value)}>
        <option value="easy">Easy (< 1300)</option>
        <option value="medium">Medium (1300-1700)</option>
        <option value="hard">Hard (1700-2100)</option>
        <option value="veryhard">Very Hard (≥ 2100)</option>
      </select>
      <p>Found {filtered.length} problems</p>
    </div>
  );
}
```

### Use Case 3: Tag-Based Problem Selection

```typescript
function TagFilter() {
  const { data } = useUpsolveProblems("tourist");
  const [selectedTag, setSelectedTag] = useState("dp");

  const allTags = new Set(data?.flatMap(p => p.tags) || []);
  
  const taggedProblems = data?.filter(p => p.tags.includes(selectedTag)) || [];

  return (
    <div>
      <select onChange={(e) => setSelectedTag(e.target.value)}>
        {Array.from(allTags).map(tag => (
          <option key={tag} value={tag}>{tag}</option>
        ))}
      </select>
      <p>Problems with '{selectedTag}' tag: {taggedProblems.length}</p>
    </div>
  );
}
```

### Use Case 4: Daily Problem Recommendation

```typescript
function DailyProblem() {
  const { data } = useUpsolveProblems("tourist");

  // Pick a random attempted problem
  const unsolvedAttempted = data?.filter(p => p.status === "attempted") || [];
  const dailyProblem = unsolvedAttempted[Math.floor(Math.random() * unsolvedAttempted.length)];

  return (
    <div>
      <h3>Today's Challenge</h3>
      {dailyProblem ? (
        <div>
          <p>{dailyProblem.name}</p>
          <p>Rating: {dailyProblem.rating}</p>
          <a href={`https://codeforces.com/contest/${dailyProblem.contestId}/problem/${dailyProblem.index}`}>
            Solve
          </a>
        </div>
      ) : <p>No problems available</p>}
    </div>
  );
}
```

---

## Troubleshooting

### Issue: "Cannot find module" Error

**Solution:** Ensure all imports use correct relative paths:
```typescript
// Correct
import { useUpsolveProblems } from "./useUpsolveProblems";

// Incorrect
import { useUpsolveProblems } from "useUpsolveProblems";
```

### Issue: Empty Results

**Possible causes:**
- User has no submissions in the last 6 months
- User hasn't participated in contests recently
- Invalid Codeforces handle

**Solution:** Try with a known active user like "tourist"

### Issue: Rate Limit Errors

**Solution:** 
- Wait a few seconds before making another request
- Use caching to avoid redundant calls
- Clear cache only when necessary

```typescript
import { clearCache } from "./codesforces-upsolve-service";

// Only clear when user explicitly requests refresh
clearCache();
```

### Issue: TypeScript Type Errors

**Solution:** Ensure you're using TypeScript 4.5+:
```bash
npm install -D typescript@latest
```

---

## Performance Tips

### 1. Memoize Filtered Results

```typescript
const filteredProblems = React.useMemo(() => {
  return data?.filter(/* ... */) || [];
}, [data, /* dependencies */]);
```

### 2. Lazy Initialize

```typescript
const { data, refetch } = useUpsolveProblems(); // No initial fetch
const [handle, setHandle] = useState("");

const handleSearch = async (e) => {
  e.preventDefault();
  await refetch(handle);
};
```

### 3. Batch API Calls

```typescript
// Don't do this (parallel)
Promise.all([
  getUpsolveProblems("user1"),
  getUpsolveProblems("user2"),
  getUpsolveProblems("user3")
]);

// Better - sequential with caching
for (const user of ["user1", "user2", "user3"]) {
  await getUpsolveProblems(user); // Cached
}
```

---

## Next Steps

1. ✅ **Set up the project** - Use the files provided
2. ✅ **Run in development mode** - `npm run dev`
3. ✅ **Test with example component** - Try CodeforcesUpsolveTracker
4. ✅ **Integrate into your app** - Use useUpsolveProblems hook
5. ✅ **Customize as needed** - Adjust filters and styling

---

## Support & Resources

- **API Documentation:** https://codeforces.com/apiHelp
- **TypeScript Guide:** https://www.typescriptlang.org/docs/
- **React Hooks:** https://react.dev/reference/react/hooks

---

**Happy Upsolving! 🚀**
