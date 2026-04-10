# Project Structure - Standard React/TypeScript Organization

## Folder Hierarchy

```
src/
├── types/
│   └── codeforces.ts           # All TypeScript interfaces & types
│
├── services/
│   ├── cache.ts               # API cache management
│   ├── codeforcesAPI.ts       # Codeforces API calls
│   └── upsolveService.ts      # Core upsolve logic
│
├── hooks/
│   └── useUpsolveProblems.ts  # React hook for fetching data
│
├── components/
│   ├── SearchForm.tsx          # Search input component
│   ├── ErrorDisplay.tsx        # Error message component
│   ├── StatsSection.tsx        # Statistics cards component
│   ├── FilterPanel.tsx         # Filters & sorting component
│   ├── ProblemCard.tsx         # Individual problem card
│   ├── ProblemsList.tsx        # Problems grid component
│   └── index.tsx               # Main container component
│
├── utils/
│   └── problemAnalysis.ts     # Helper functions for problem analysis
│
└── main.tsx                    # React app entry point
```

## File Organization

### Type Definitions (`src/types/`)
**File:** `codeforces.ts`
- Centralized TypeScript interfaces
- Single source of truth for all types
- Easy to import and maintain

### Services (`src/services/`)

#### `cache.ts`
- `APICache` class for managing cached API responses
- 5-minute TTL (configurable)
- Methods: `set()`, `get()`, `has()`, `clear()`

#### `codeforcesAPI.ts`
- Thin wrapper around Codeforces API endpoints
- Uses cache automatically
- Methods:
  - `getUserRatingHistory(handle)`
  - `getUserSubmissions(handle)`
  - `getContestList()`
  - `getContestStandings(contestId)`

#### `upsolveService.ts`
- Main business logic for upsolve computation
- `getUpsolveProblems(handle)` - Main entry point
- `clearCache()` - Cache management

### Hooks (`src/hooks/`)

#### `useUpsolveProblems.ts`
- React hook interface for fetching upsolve data
- Handles loading, error, and data states
- Returns:
  - `data` - Problems array
  - `loading` - Loading state
  - `error` - Error object
  - `refetch` - Function to fetch again
  - `clearCachedData` - Function to clear cache
  - `stats` - Statistics (total, attempted, upsolved)

### Components (`src/components/`)

Each component is focused on a single responsibility:

#### `SearchForm.tsx`
- Props: `handle`, `onHandleChange`, `onSearch`, `loading`
- Renders search input and button

#### `ErrorDisplay.tsx`
- Props: `error`
- Displays error message if present

#### `StatsSection.tsx`
- Props: `stats`, `onRefresh`
- Shows total, attempted, upsolved counts
- Refresh button

#### `FilterPanel.tsx`
- Props: `filters`, `onFiltersChange`, `sortBy`, `onSortChange`, `availableTags`
- Status filter dropdown
- Rating range inputs
- Sort dropdown
- Tag multi-select checkboxes

#### `ProblemCard.tsx`
- Props: `problem`
- Individual problem display
- Links to Codeforces
- Shows status badge, rating, tags

#### `ProblemsList.tsx`
- Props: `problems`, `isLoading`, `hasData`
- Grid layout of problem cards
- Empty state messages

#### `index.tsx`
- Main container component
- Orchestrates all child components
- Manages state for filters, sort, etc.

### Utilities (`src/utils/`)

#### `problemAnalysis.ts`
Pure functions for problem analysis:
- `getMaxRating(ratingHistory)` - Find max rating
- `isAccepted(submission)` - Check if AC
- `isDuringContest(submission, startTime, duration)` - Check timing
- `getContestSolvedProblems(submissions, contestId, ...)` - Get solved problems
- `getProblemSubmissions(submissions, contestId, index)` - Get problem submissions
- `determineStatus(...)` - Determine problem status
- `filterContestsLast6Months(contests)` - Filter by date
- `deduplicateProblems(problems)` - Remove duplicates
- `getRatingClass(rating)` - Get difficulty class

### Entry Point

#### `main.tsx`
- Creates React root
- Mounts `CodeforcesUpsolveTracker` component

## Data Flow

```
User Input (SearchForm)
     ↓
useUpsolveProblems Hook
     ↓
upsolveService (getUpsolveProblems)
     ↓
codeforcesAPI (Multiple calls)
     ↓
cache (Store/retrieve results)
     ↓
problemAnalysis (Helper functions)
     ↓
Return UpsolveProblem[]
     ↓
Component State (filters, sort)
     ↓
FilterPanel + ProblemsList
     ↓
Render ProblemCards
```

## Dependency Graph

```
index.tsx (Main)
├── SearchForm.tsx
├── ErrorDisplay.tsx
├── StatsSection.tsx
├── FilterPanel.tsx
├── ProblemsList.tsx
│   └── ProblemCard.tsx
│       └── problemAnalysis.ts (getRatingClass)
└── useUpsolveProblems.ts
    └── upsolveService.ts
        ├── codeforcesAPI.ts
        │   └── cache.ts
        └── problemAnalysis.ts
```

## Design Patterns Used

### 1. **Separation of Concerns**
- Types → Services → Hooks → Components
- Each layer has single responsibility

### 2. **Composition**
- Small, focused components
- Composed into larger components
- Easy to test and reuse

### 3. **Custom Hooks**
- `useUpsolveProblems` encapsulates data fetching logic
- Can be used in multiple components

### 4. **Service Layer**
- `upsolveService` handles all business logic
- `codeforcesAPI` handles API communication
- `cache` handles caching

### 5. **Pure Functions**
- `problemAnalysis.ts` contains pure helper functions
- No side effects
- Easy to test

## Benefits of This Structure

✅ **Maintainability** - Clear organization makes code easy to find
✅ **Scalability** - Adding new features is straightforward
✅ **Testability** - Each layer can be tested independently
✅ **Reusability** - Components, hooks, and utilities can be reused
✅ **Performance** - Caching and optimization is centralized
✅ **Type Safety** - All types in one place
✅ **Readability** - Clear names and focused responsibilities

## Import Examples

```typescript
// In a component
import { useUpsolveProblems } from "../hooks/useUpsolveProblems";
import { ProblemCard } from "./ProblemCard";
import type { UpsolveProblem } from "../types/codeforces";

// In services
import { codeforcesAPI } from "./codeforcesAPI";
import { apiCache } from "./cache";
import { getMaxRating } from "../utils/problemAnalysis";
```

## Next Steps

1. **Understand each layer** - Read files in order (types → services → hooks → components)
2. **Follow the data flow** - Trace how data flows from user input to UI
3. **Add features** - New features fit naturally into this structure
4. **Write tests** - Pure functions and components are easy to test

---

This structure follows React best practices and makes the codebase professional and easy to maintain!
