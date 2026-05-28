/**
 * problems they should upsolve based on:
 * - Contests participated in (from rating history)
 * - Problems not solved in contests
 * - Problems with rating <= (maxRating + 200) if rated
 */

import { codeforcesAPI } from "./codeforcesAPI";
import { apiCache } from "./cache";
import type { UpsolveProblem, Contest, Submission, ProblemInfo } from "../types/codeforces";
import { AppError } from "../types/errors";
import {
  getMaxRating,
  getContestSolvedProblems,
  determineStatus,
} from "../utils/problemAnalysis";

/**
 * Filters problems to include only those eligible for upsolving
 * @param problem - Problem to evaluate
 * @param contestSolved - Set of problems solved during contest
 * @param maxRating - User's maximum rating
 * @returns true if problem should be included
 */
function isEligibleForUpsolving(
  problem: ProblemInfo,
  contestSolved: Set<string>,
  maxRating: number
): boolean {
  const problemId = `${problem.contestId}-${problem.index}`;

  // Skip if already solved during contest
  if (contestSolved.has(problemId)) {
    return false;
  }

  // Skip if problem rating is not defined
  if (problem.rating === undefined) {
    return false;
  }

  // Skip if problem rating is too high
  if (problem.rating > maxRating + 200) {
    return false;
  }

  return true;
}

async function collectContestProblems(
  contest: Contest,
  allSubmissions: Submission[],
  maxRating: number
): Promise<UpsolveProblem[]> {
  const candidates: UpsolveProblem[] = [];

  try {
    const response = await codeforcesAPI.getContestStandings(contest.id);
    const { problems } = response;

    // If standings are unavailable, getContestStandings returns empty array (no error thrown)
    if (!problems || problems.length === 0) {
      return candidates;
    }

    // Determine which problems user solved in the contest
    const contestSolved = getContestSolvedProblems(
      allSubmissions,
      contest.id
    );

    // Evaluate each problem in the contest
    let includedCount = 0;
    problems.forEach((problem) => {
      const problemId = `${problem.contestId}-${problem.index}`;

      // Check if problem is eligible for upsolving
      if (!isEligibleForUpsolving(problem, contestSolved, maxRating)) {
        return;
      }

      // Determine current status of the problem
      const status = determineStatus(
        problemId,
        contestSolved,
        allSubmissions,
        contest.id,
        problem.index
      );

      // Add to candidates list
      candidates.push({
        contestId: problem.contestId,
        index: problem.index,
        name: problem.name,
        rating: problem.rating,
        tags: problem.tags,
        status,
      });
      includedCount++;
    });

  } catch (error) {
    // Only log truly unexpected errors
    if (error instanceof AppError) {
      console.error(`    ❌ Error fetching contest ${contest.id}: ${error.message}`);
    }
  }

  return candidates;
}

/**
 * Fetches problems from multiple contests with rate limit protection
 * @param contests - Contests to fetch problems from
 * @param allSubmissions - All user submissions
 * @param maxRating - User's maximum rating
 * @returns Array of upsolve problems
 */
async function collectProblemsFromMultipleContests(
  contests: Contest[],
  allSubmissions: Submission[],
  maxRating: number
): Promise<UpsolveProblem[]> {
  const results: UpsolveProblem[] = [];
  const CONCURRENCY = 5; // Fetch 5 contests at a time (sweet spot: fast without rate limits)
  
  // Process contests in small batches
  for (let i = 0; i < contests.length; i += CONCURRENCY) {
    const batch = contests.slice(i, i + CONCURRENCY);
    
    const batchResults = await Promise.allSettled(
      batch.map((contest) => collectContestProblems(contest, allSubmissions, maxRating))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const contestProblems = result.value;
        results.push(...contestProblems);
      } else if (result.reason instanceof AppError && result.reason.type === "CODEFORCES_RATE_LIMIT") {
        console.warn(`⚠️  Rate limited on contest ${batch[index].id}`);
      }
    });
    
    // Small delay between batches (be nice to the API)
    if (i + CONCURRENCY < contests.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return results;
}

/**
 * Fetches and analyzes upsolve problems for a given user
 * 
 * @param handle - Codeforces user handle
 * @returns Array of problems to upsolve, sorted by rating
 * @throws Error if unable to fetch user data
 */
export async function getUpsolveProblems(
  handle: string
): Promise<UpsolveProblem[]> {
  try {
    // ===== STEP 1: Fetch rating history =====
    const ratingHistory = await codeforcesAPI.getUserRatingHistory(handle);
    const maxRating = getMaxRating(ratingHistory);

    // Fetch all submissions and contests
    const allSubmissions = await codeforcesAPI.getUserSubmissions(handle);
    const allContests = await codeforcesAPI.getContestList();
    
    // Only keep contests from last 6 months
    const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
    const recentContestIds = new Set(
      ratingHistory
        .filter((r) => (r.ratingUpdateTimeSeconds * 1000) > sixMonthsAgo)
        .map((r) => r.contestId)
    );
    
    const participatedContests = allContests.filter((contest) =>
      recentContestIds.has(contest.id)
    );

    const upsolveCandidates = await collectProblemsFromMultipleContests(
      participatedContests,
      allSubmissions,
      maxRating
    );

    const filtered = upsolveCandidates.filter(problem => 
      problem.status === "attempted" || problem.status === "not_attempted"
    );

    const sorted = filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    return sorted;
  } catch (error) {
    console.error("❌ Fatal error in getUpsolveProblems:", error);
    throw error;
  }
}

/**
 * Clears the API response cache
 * Useful for forcing a refresh of data
 */
export function clearCache(): void {
  apiCache.clear();
}
