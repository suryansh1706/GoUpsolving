/**
 * Codeforces Upsolve Recommendation Service
 * 
 * This module provides functionality to fetch and analyze problems that a user
 * should upsolve based on their Codeforces rating history and contest performance.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

interface UserRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

interface Submission {
  id: number;
  contestId: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: ProblemInfo;
  author: {
    contestId: number;
    members: Array<{ handle: string }>;
    participantType: string;
    ghost: boolean;
    startTimeSeconds: number;
  };
  programmingLanguage: string;
  verdict: string; // "OK", "TIME_LIMIT_EXCEEDED", etc.
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

interface ProblemInfo {
  contestId: number;
  index: string;
  name: string;
  type: string;
  points: number;
  rating?: number;
  tags: string[];
}

interface Contest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds: number;
}

interface ContestStanding {
  contest: Contest;
  problems: ProblemInfo[];
  rows: Array<{
    party: {
      contestId: number;
      members: Array<{ handle: string }>;
      participantType: string;
      ghost: boolean;
      startTimeSeconds: number;
    };
    rank: number;
    points: number;
    penalty: number;
    successfulHackCount: number;
    unsuccessfulHackCount: number;
    problemResults: Array<{
      points: number;
      penalty: number;
      rejectedAttemptCount: number;
      type: string;
      bestSubmissionTimeSeconds: number;
    }>;
  }>;
}

interface UpsolveStatus {
  "not_attempted": boolean;
  "attempted": boolean;
  "upsolved": boolean;
}

export interface UpsolveProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  status: "not_attempted" | "attempted" | "upsolved";
  points?: number;
  solvedAt?: number;
}

// ============================================================================
// API Cache Management
// ============================================================================

class APICache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new APICache();

// ============================================================================
// Codeforces API Helper Functions
// ============================================================================

/**
 * Generic Codeforces API call with error handling and caching
 */
async function codeforcesAPI<T>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<T> {
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  
  // Check cache first
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  const baseURL = "https://codeforces.com/api";
  const url = new URL(`${baseURL}/${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();

    if (json.status !== "OK") {
      throw new Error(`Codeforces API error: ${json.comment}`);
    }

    apiCache.set(cacheKey, json.result);
    return json.result;
  } catch (error) {
    console.error(`Failed to fetch from Codeforces API: ${endpoint}`, error);
    throw error;
  }
}

/**
 * Fetch user's rating history
 */
async function getUserRatingHistory(handle: string): Promise<UserRatingChange[]> {
  return codeforcesAPI<UserRatingChange[]>("user.rating", { handle });
}

/**
 * Fetch user's all submissions
 */
async function getUserSubmissions(handle: string): Promise<Submission[]> {
  return codeforcesAPI<Submission[]>("user.status", { handle });
}

/**
 * Fetch list of contests
 */
async function getContestList(): Promise<Contest[]> {
  return codeforcesAPI<Contest[]>("contest.list", {});
}

/**
 * Fetch contest standings with all problems
 */
async function getContestStandings(
  contestId: number
): Promise<{ contest: Contest; problems: ProblemInfo[] }> {
  const response = await codeforcesAPI<ContestStanding>("contest.standings", {
    contestId,
    from: 1,
    count: 1, // We only need problem info, not standings
  });

  return {
    contest: response.contest,
    problems: response.problems,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the maximum rating achieved by a user
 */
function getMaxRating(ratingHistory: UserRatingChange[]): number {
  if (ratingHistory.length === 0) return 0;
  return Math.max(...ratingHistory.map((r) => r.newRating));
}

/**
 * Check if a submission is an accepted verdict
 */
function isAccepted(submission: Submission): boolean {
  return submission.verdict === "OK";
}

/**
 * Check if a submission was during a contest
 */
function isDuringContest(
  submission: Submission,
  contestStartTime: number,
  contestDuration: number
): boolean {
  const submissionTime = submission.creationTimeSeconds;
  const contestEndTime = contestStartTime + contestDuration;
  return submissionTime >= contestStartTime && submissionTime <= contestEndTime;
}

/**
 * Get all successful submissions during a contest
 */
function getContestSolvedProblems(
  submissions: Submission[],
  contestId: number,
  contestStartTime: number,
  contestDuration: number
): Set<string> {
  const solved = new Set<string>();

  submissions.forEach((sub) => {
    if (
      sub.contestId === contestId &&
      isAccepted(sub) &&
      isDuringContest(sub, contestStartTime, contestDuration)
    ) {
      solved.add(`${sub.problem.contestId}-${sub.problem.index}`);
    }
  });

  return solved;
}

/**
 * Get submission history for a specific problem
 */
function getProblemSubmissions(
  submissions: Submission[],
  contestId: number,
  problemIndex: string
): Submission[] {
  return submissions.filter(
    (sub) => sub.contestId === contestId && sub.problem.index === problemIndex
  );
}

/**
 * Determine upsolve status for a problem
 */
function determineStatus(
  problemId: string,
  contestSolvedDuringContest: Set<string>,
  allSubmissions: Submission[],
  contestId: number,
  problemIndex: string,
  contestStartTime: number,
  contestDuration: number
): "not_attempted" | "attempted" | "upsolved" {
  // If solved during contest, not a candidate
  if (contestSolvedDuringContest.has(problemId)) {
    return "not_attempted"; // Will be filtered out, but for completeness
  }

  const submissions = getProblemSubmissions(allSubmissions, contestId, problemIndex);

  if (submissions.length === 0) {
    return "not_attempted";
  }

  const hasAccepted = submissions.some(isAccepted);

  if (hasAccepted) {
    return "upsolved";
  }

  return "attempted";
}

/**
 * Filter contests from the last 6 months
 */
function filterContestsLast6Months(contests: Contest[]): Contest[] {
  const sixMonthsAgo = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 60 * 60;
  return contests.filter((contest) => contest.startTimeSeconds > sixMonthsAgo);
}

/**
 * Remove duplicate problems (keeping the one with highest rating)
 */
function deduplicateProblems(problems: UpsolveProblem[]): UpsolveProblem[] {
  const seen = new Map<string, UpsolveProblem>();

  problems.forEach((problem) => {
    const key = `${problem.contestId}-${problem.index}`;
    const existing = seen.get(key);

    if (!existing || (problem.rating || 0) > (existing.rating || 0)) {
      seen.set(key, problem);
    }
  });

  return Array.from(seen.values());
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Fetch and analyze problems for upsolving
 * 
 * @param handle - Codeforces user handle
 * @returns Array of problems to upsolve, sorted by rating (ascending)
 */
export async function getUpsolveProblems(
  handle: string
): Promise<UpsolveProblem[]> {
  try {
    console.log(`Fetching upsolve problems for ${handle}...`);

    // Step 1: Get user's maximum rating
    const ratingHistory = await getUserRatingHistory(handle);
    const maxRating = getMaxRating(ratingHistory);
    console.log(`Max rating: ${maxRating}`);

    // Step 2: Get all user submissions
    const allSubmissions = await getUserSubmissions(handle);
    console.log(`Total submissions: ${allSubmissions.length}`);

    // Step 3: Get contests from last 6 months
    const allContests = await getContestList();
    const recentContests = filterContestsLast6Months(allContests);
    console.log(`Contests in last 6 months: ${recentContests.length}`);

    // Step 4: Collect all upsolve candidates
    const upsolveCandidates: UpsolveProblem[] = [];

    for (const contest of recentContests) {
      try {
        const { problems } = await getContestStandings(contest.id);
        
        // Get problems solved during contest
        const contestSolved = getContestSolvedProblems(
          allSubmissions,
          contest.id,
          contest.startTimeSeconds,
          contest.durationSeconds
        );

        // Evaluate each problem
        problems.forEach((problem) => {
          const problemId = `${problem.contestId}-${problem.index}`;

          // Skip if solved during contest
          if (contestSolved.has(problemId)) {
            return;
          }

          // Apply rating filter
          const problemRating = problem.rating || 0;
          if (problemRating > maxRating + 200) {
            return;
          }

          // Determine status
          const status = determineStatus(
            problemId,
            contestSolved,
            allSubmissions,
            contest.id,
            problem.index,
            contest.startTimeSeconds,
            contest.durationSeconds
          );

          // Only include attempted or upsolved problems
          if (status !== "not_attempted") {
            upsolveCandidates.push({
              contestId: problem.contestId,
              index: problem.index,
              name: problem.name,
              rating: problem.rating,
              tags: problem.tags,
              status,
            });
          }
        });
      } catch (error) {
        console.warn(`Failed to fetch standings for contest ${contest.id}:`, error);
        // Continue with next contest
      }
    }

    // Step 5: Deduplicate and sort
    const deduped = deduplicateProblems(upsolveCandidates);
    const sorted = deduped.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    console.log(`Found ${sorted.length} upsolve candidates`);
    return sorted;
  } catch (error) {
    console.error("Error in getUpsolveProblems:", error);
    throw error;
  }
}

/**
 * Clear the API cache (useful for testing or forcing refresh)
 */
export function clearCache(): void {
  apiCache.clear();
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// Usage:
const problems = await getUpsolveProblems("tourist");
console.log(problems);
// Output:
// [
//   {
//     contestId: 1234,
//     index: "A",
//     name: "Problem A",
//     rating: 1500,
//     tags: ["implementation", "math"],
//     status: "attempted"
//   },
//   ...
// ]
*/
