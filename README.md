# Codeforces Upsolve Tracker (`GoUpsolving`)

> A high-performance, responsive web application designed to help competitive programmers identify, track, and upsolve missed problems from Codeforces contests based on personalized difficulty parameters.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Project Structure](#-project-structure)
- [Core Recommendation Algorithm](#-core-recommendation-algorithm)
- [Deep Dive: Engineering Challenges & Technical Decisions](#-deep-dive-engineering-challenges--technical-decisions)
- [🎯 Interview Q&A Cheat Sheet](#-interview-qa-cheat-sheet)
- [Getting Started](#-getting-started)

---

## 🎯 Overview

Upsolving (solving problems missed during a contest) is one of the most effective ways to improve in competitive programming. However, finding the *right* problems to upsolve is often tedious:
- Browsing past contest archives manually is time-consuming.
- Problems can be too easy (wasting time) or too hard (demotivating).

**Codeforces Upsolve Tracker** solves this by analyzing a user's contest history over the last 6 months, fetching their submission records, and generating a personalized feed of recommended upsolve problems capped at `maxRating + 200`.

---

## ✨ Key Features

- **Personalized Difficulty Scaling**: Filters upsolve recommendations based on the user's peak Codeforces rating ($maxRating + 200$).
- **6-Month Rolling Window**: Restricts contest discovery to active recent contests (last 180 days).
- **Status Distinction**: Differentiates between problems never attempted (`not_attempted`) vs. attempted but not solved during/after contest (`attempted`).
- **Client-Side Filtering & Sorting**: Filter by tags, difficulty range, or completion status; sort by recency, rating, or status in real time.
- **Direct Browser API Strategy**: Solves Cloudflare datacenter IP blockages by querying Codeforces APIs directly from the browser.
- **In-Memory Caching & Rate-Limit Concurrency**: Caches network requests for 15 minutes and batches request batches to stay within Codeforces API limits.

---

## 🛠️ Tech Stack

| Domain | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **React 18** | Functional components with custom hooks for predictable state management. |
| **Language** | **TypeScript 5** | Strict type safety for complex Codeforces API payloads. |
| **Build Tool** | **Vite 5** | Fast HMR (Hot Module Replacement) and optimized production bundle. |
| **Styling** | **Vanilla CSS** | Modern CSS features (CSS variables, flexbox, grid, glassmorphic UI). |
| **Analytics** | **@vercel/analytics** | Privacy-focused telemetry for production tracking. |

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    User([User Enters Handle]) --> SearchForm[SearchForm / CodeforcesUpsolveTracker]
    SearchForm --> Hook[useUpsolveProblems Hook]
    Hook --> UpsolveService[upsolveService.ts]
    
    subgraph Data Layer & API Processing
        UpsolveService --> CF_API[codeforcesAPI.ts]
        CF_API --> APICache{In-Memory APICache}
        APICache -- Cache Hit --> ReturnData[Cached Payload]
        APICache -- Cache Miss --> FetchCF[Fetch direct from codeforces.com/api]
    end
    
    FetchCF --> PromiseAll[Parallel Promise.all: Ratings, Submissions, Contests, Problems]
    PromiseAll --> Indexing[O(1) Map Indexing: submissionsByContest & problemsetByContest]
    Indexing --> FilterAlgo[Algorithm: maxRating + 200 & 6-Month Window Filter]
    FilterAlgo --> FilteredState[UpsolveProblem[] State]
    FilteredState --> ComponentView[CodeforcesUpsolveTrackerView]
    ComponentView --> RenderCards[ProblemCard / FilterPanel / StatsSection]
```

---

## 📂 Project Structure

```
frontend project/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx                        # Root Application wrapper
    ├── main.tsx                       # Entry point
    ├── features/
    │   ├── components/                # UI Presentation Components
    │   │   ├── CodeforcesUpsolveTrackerView.tsx  # Layout container
    │   │   ├── ErrorDisplay.tsx       # Standardized error alerts
    │   │   ├── FilterPanel.tsx        # Filter controls (tags, difficulty, status)
    │   │   ├── ProblemCard.tsx        # Individual problem card UI
    │   │   ├── ProblemsList.tsx       # Grid view of problem cards
    │   │   ├── SearchForm.tsx         # User handle input & submit
    │   │   ├── StatsSection.tsx       # Summary metrics (total, attempted)
    │   │   └── index.tsx              # Feature orchestrator component
    │   ├── hooks/
    │   │   └── useUpsolveProblems.ts  # Custom state & data fetching hook
    │   ├── services/
    │   │   ├── cache.ts               # In-memory APICache class (15-min TTL)
    │   │   ├── codeforcesAPI.ts       # Raw API client with AbortController
    │   │   └── upsolveService.ts      # Core upsolving business logic
    │   ├── types/
    │   │   ├── codeforces.ts          # Type definitions (Submission, Contest, etc.)
    │   │   └── errors.ts              # Custom AppError classification
    │   └── utils/
    │       ├── problemAnalysis.ts     # Analysis helpers (max rating, status check)
    │       └── problemFiltering.ts    # Client-side filtering & sorting functions
    └── shared/
        └── global.css                 # CSS Design System & variables
```

---

## 💡 Core Recommendation Algorithm

```typescript
// Algorithm Logic in upsolveService.ts:
1. Fetch User Rating History, Submissions, and Global Problemset in parallel.
2. Calculate maxRating achieved by the user across rating history.
3. Restrict contests to those started within the last 6 months (rolling 180 days).
4. Identify contests user participated in (RATED participation).
5. Pre-index submissions and global problems by contestId into Map<number, T[]> for O(1) lookup.
6. For each participated contest problem:
   - EXCLUDE if user solved it (verdict === "OK") during contest.
   - EXCLUDE if user solved it later in practice.
   - EXCLUDE if problem rating > maxRating + 200.
   - EXCLUDE if problem rating is undefined.
7. Mark remaining problems as "attempted" (submitted during/after contest without AC) or "not_attempted".
8. Return problems sorted by rating or recency.
```

---

## ⚡ Deep Dive: Engineering Challenges & Technical Decisions

### 1. Bypassing Cloudflare Datacenter Blocks (Browser vs. Server Proxy)
- **Problem**: Deploying an API proxy on Vercel or AWS Lambda resulted in `HTTP 403 Forbidden` from Cloudflare because datacenter IP ranges are flagged by Codeforces anti-bot checks.
- **Solution**: Implemented direct browser fetch calls (`codeforcesAPI.ts`). Since Codeforces GET endpoints support CORS and the user's browser carries standard headers, browser-originating requests successfully pass Cloudflare checks.
- **Resiliency**: Added error detection for HTML responses (which indicate Cloudflare challenge pages) and surfaced clear actionable prompts asking the user to visit `codeforces.com` in their browser tab first.

### 2. Time Complexity & Data Structure Optimization
- **Problem**: A typical active Codeforces user has thousands of submissions. Performing nested array iterations (`submissions.filter(...)`) for every contest problem resulted in $O(N \times M)$ operations, causing noticeable UI freeze.
- **Solution**: Pre-indexed submissions and problem sets into `Map<number, Submission[]>` and `Map<number, ProblemInfo[]>` keyed by `contestId`.
- **Result**: Reduced lookup complexity from $O(N \times M)$ to $O(1)$ hash map reads per contest, ensuring near-instant processing.

### 3. Concurrency Control & Rate Limiting (`Promise.allSettled`)
- **Problem**: Firing uncontrolled parallel HTTP requests for dozens of contest details triggers Codeforces `HTTP 429 Rate Limit`.
- **Solution**: Built a chunking mechanism (`collectProblemsFromMultipleContests`) that batches contest requests with a strict concurrency limit (`CONCURRENCY = 5`) using `Promise.allSettled`. If one batch hits a rate limit, other batches degrade gracefully without crashing the whole application.

### 4. Client-Side In-Memory Caching
- **Problem**: Repeatedly changing filters or refetching identical handle data wasted network bandwidth.
- **Solution**: Implemented an in-memory `APICache` class with a 15-minute Time-To-Live (TTL). Cache keys are generated dynamically based on endpoint and query parameters (`${endpoint}:${JSON.stringify(params)}`).

### 5. Streamlined Single-Query Problemset Retrieval
- **Optimization**: Standardized problem discovery by leveraging a single global `problemset.problems` request pre-grouped by `contestId` in $O(1)$ Hash Maps. This completely eliminates redundant per-contest standings API calls (`contest.standings`), keeping network overhead minimal and data processing instantaneous.


---

## 🎯 Interview Q&A Cheat Sheet

Use these Q&As during engineering interviews when discussing this project:

### ❓ Q1: How did you design the data layer to handle high data volume without crashing the UI?
> **Answer**: "I separated raw data fetching from business logic and presentation. Instead of doing nested loops over thousands of user submissions for every contest problem—which would be $O(N \times M)$—I pre-indexed submissions and problems into hash maps (`Map<number, Submission[]>`) keyed by `contestId`. This brought data lookup down to $O(1)$ time complexity per contest. Additionally, I used React’s `useMemo` hook for client-side filtering and sorting so expensive computations only run when filter criteria change."

---

### ❓ Q2: How did you solve CORS and anti-bot / rate-limiting issues when dealing with third-party APIs?
> **Answer**: "When querying Codeforces from serverless backend functions (like Vercel API routes), requests were blocked with HTTP 403s because Cloudflare flags datacenter IPs. I solved this by calling the public Codeforces CORS-enabled GET API directly from the browser, which leverages the client's regular network stack. To manage rate limits (HTTP 429), I built a controlled batching fetch queue using `Promise.allSettled` with a concurrency cap of 5, alongside an in-memory `APICache` with a 15-minute TTL."

---

### ❓ Q3: How is error handling structured across the application?
> **Answer**: "I created a dedicated `AppError` class with an explicit `ErrorType` enum (`CODEFORCES_TIMEOUT`, `CODEFORCES_RATE_LIMIT`, `CODEFORCES_INVALID_USER`, etc.). In `codeforcesAPI.ts`, I wrap fetches with an `AbortController` (15-second timeout). When an error occurs, the API service categorizes the exact HTTP status or response signature (e.g., detecting if the response is HTML rather than JSON to spot Cloudflare challenge pages) and bubbles up user-friendly error messages to an `<ErrorDisplay />` UI component."

---

### ❓ Q4: How would you scale this application if Codeforces had millions of users and we wanted to save state (System Architecture v2)?
> **Answer**:
> 1. **Offload Heavy Data Crunching**: Move heavy submission filtering off the main UI thread using **Web Workers**.
> 2. **Persistent Browser Cache**: Replace in-memory cache with **IndexedDB** using `idb-keyval` so cached data persists across tab reloads.
> 3. **List Virtualization**: Implement `@tanstack/react-virtual` or `react-window` for the problem grid to DOM-render only visible problem cards when viewing 500+ items.
> 4. **Backend Caching Layer**: For enterprise scale, build a backend service with a **Redis cache** and background worker queue (e.g., BullMQ) that periodically syncs global Codeforces problem sets.

---

### ❓ Q5: Why did you choose React + Custom Hooks over Redux / Zustand for state management?
> **Answer**: "The state in this application is primarily server state (user submissions, rating history, problem sets) coupled with straightforward UI filter states (tags, min/max rating, sort order). Using a custom React hook (`useUpsolveProblems`) provided clean encapsulation and refetch controls without the boilerplate overhead of Redux or Zustand. For larger global states across multiple pages, I would evaluate React Query or Zustand."

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0 or higher)
- **npm** or **yarn**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/suryansh1706/GoUpsolving.git
   cd "frontend project"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Run type check:
   ```bash
   npm run type-check
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## 📄 License

Distributed under the MIT License. Feel free to use and adapt!
