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

  // Skip if problem rating is too high (rated problems only)
  if (problem.rating !== undefined && problem.rating > maxRating + 200) {
    return false;
  }

  return true;
}

/**
 * Processes problems from a single contest and collects upsolve candidates
 * @param contest - Contest to process
 * @param allSubmissions - All user submissions
 * @param maxRating - User's maximum rating
 * @returns Array of upsolve problem candidates
 */
async function collectContestProblems(
  contest: Contest,
  allSubmissions: Submission[],
  maxRating: number
): Promise<UpsolveProblem[]> {
  const candidates: UpsolveProblem[] = [];

  // Skip contests that haven't finished yet - standings aren't available
  if (contest.phase !== "FINISHED") {
    return candidates;
  }

  // Skip practice/special contests that don't have standings (GYM, ICPC, etc)
  if (contest.type && contest.type !== "CF" && contest.type !== "IOI") {
    return candidates;
  }

  try {
    const { problems } = await codeforcesAPI.getContestStandings(contest.id);

    // Determine which problems user solved in the contest
    const contestSolved = getContestSolvedProblems(
      allSubmissions,
      contest.id
    );

    // Evaluate each problem in the contest
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

    });
  } catch (error) {
    // HTTP 400 means standings aren't available (expected for some contests)
    if (error instanceof AppError && error.message.includes("HTTP 400")) {
      return candidates;
    }

    // Gracefully skip contests that require authentication (private/gym contests)
    if (error instanceof AppError && error.message.includes("authenticated")) {
      return candidates;
    }
    
    // Only log unexpected errors
    console.error(`❌ Unexpected error fetching contest ${contest.id}:`, error);
  }

  return candidates;
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

    // Extract contest IDs where user participated
    const participatedContestIds = new Set(ratingHistory.map((r) => r.contestId));

    // ===== STEP 2: Fetch all submissions =====
    const allSubmissions = await codeforcesAPI.getUserSubmissions(handle);

    // ===== STEP 3: Fetch all contests and filter to those participated in =====
    const allContests = await codeforcesAPI.getContestList();
    
    // Only keep contests that user participated in
    const participatedContests = allContests.filter((contest) =>
      participatedContestIds.has(contest.id)
    );

    // ===== STEP 4: Collect problems to consider for upsolving from each contest =====
    const upsolveCandidates: UpsolveProblem[] = [];

    for (const [index, contest] of participatedContests.entries()) {
      try {
        const contestProblems = await collectContestProblems(
          contest,
          allSubmissions,
          maxRating
        );
        upsolveCandidates.push(...contestProblems);
        
        // Add small delay between requests to prevent overwhelming the API
        if (index < participatedContests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        // Log but continue - don't let one contest failure stop the whole process
        console.warn(`⚠️  Skipping contest ${contest.id}: ${error}`);
        continue;
      }
    }

    // ===== STEP 5: Filter and sort =====
    // Show all problems not solved during contest (attempted or not attempted)
    const filtered = upsolveCandidates.filter(problem => problem.status === "attempted" || problem.status === "not_attempted");
    const sorted = filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    return sorted;
  } catch (error) {
    console.error("❌ Error in getUpsolveProblems:", error);
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
