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

    console.log(`    📋 Contest ${contest.id} has ${problems.length} problems`);

    // Determine which problems user solved in the contest
    const contestSolved = getContestSolvedProblems(
      allSubmissions,
      contest.id
    );
    console.log(`    ✅ User solved ${contestSolved.size} problems in contest ${contest.id}`);

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

    console.log(`    ➕ Added ${includedCount}/${problems.length} problems from contest ${contest.id}`);

  } catch (error) {
    // Only log truly unexpected errors
    if (error instanceof AppError) {
      console.error(`    ❌ Error fetching contest ${contest.id}: ${error.message}`);
    }
  }

  return candidates;
}

/**
 * Fetches problems from multiple contests with concurrency limit
 * @param contests - Contests to fetch problems from
 * @param allSubmissions - All user submissions
 * @param maxRating - User's maximum rating
 * @param concurrencyLimit - Max number of simultaneous requests
 * @returns Array of upsolve problems
 */
async function collectProblemsFromMultipleContests(
  contests: Contest[],
  allSubmissions: Submission[],
  maxRating: number,
  concurrencyLimit: number = 5
): Promise<UpsolveProblem[]> {
  const results: UpsolveProblem[] = [];
  
  // Process contests in batches to maintain concurrency limit
  for (let i = 0; i < contests.length; i += concurrencyLimit) {
    const batch = contests.slice(i, i + concurrencyLimit);
    
    const batchResults = await Promise.allSettled(
      batch.map((contest) => collectContestProblems(contest, allSubmissions, maxRating))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const contestProblems = result.value;
        if (contestProblems.length > 0) {
          console.log(`  ✅ Contest ${batch[index].id}: ${contestProblems.length} upsolve candidates`);
        } else {
          console.log(`  ⏭️  Contest ${batch[index].id}: no standings available or all solved`);
        }
        results.push(...contestProblems);
      } else {
        console.error(`  ❌ Error fetching contest ${batch[index].id}: ${result.reason}`);
      }
    });
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
    console.log(`📊 Fetching rating history for ${handle}...`);
    const ratingHistory = await codeforcesAPI.getUserRatingHistory(handle);
    const maxRating = getMaxRating(ratingHistory);
    console.log(`✅ Found rating history: ${ratingHistory.length} contests, max rating: ${maxRating}`);

    // Extract contest IDs where user participated
    const participatedContestIds = new Set(ratingHistory.map((r) => r.contestId));
    console.log(`✅ User participated in ${participatedContestIds.size} contests`);

    // ===== STEP 2: Fetch all submissions =====
    console.log(`📝 Fetching all submissions...`);
    const allSubmissions = await codeforcesAPI.getUserSubmissions(handle);
    console.log(`✅ Found ${allSubmissions.length} total submissions`);

    // ===== STEP 3: Fetch all contests and filter to those participated in =====
    console.log(`🎯 Fetching all contests...`);
    const allContests = await codeforcesAPI.getContestList();
    console.log(`✅ Found ${allContests.length} total contests`);
    
    // Only keep contests that user participated in
    const participatedContests = allContests.filter((contest) =>
      participatedContestIds.has(contest.id)
    );
    console.log(`✅ Filtered to ${participatedContests.length} participated contests`);

    // ===== STEP 4: Collect problems from each contest (in parallel, 5 at a time) =====
    console.log(`🔍 Collecting problems from each contest...`);
    const upsolveCandidates = await collectProblemsFromMultipleContests(
      participatedContests,
      allSubmissions,
      maxRating,
      5 // Fetch 5 contests simultaneously
    );

    console.log(`✅ Collected ${upsolveCandidates.length} total upsolve candidates`);

    // ===== STEP 5: Filter and sort =====
    console.log(`🔎 Filtering problems by status...`);
    const filtered = upsolveCandidates.filter(problem => 
      problem.status === "attempted" || problem.status === "not_attempted"
    );
    console.log(`  ✅ After status filter: ${filtered.length} problems`);

    // Debug: show status distribution
    const statusCounts = {
      attempted: upsolveCandidates.filter(p => p.status === "attempted").length,
      not_attempted: upsolveCandidates.filter(p => p.status === "not_attempted").length,
    };
    console.log(`  📊 Status breakdown:`, statusCounts);

    const sorted = filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    console.log(`✅ Final result: ${sorted.length} problems to upsolve`);

    if (sorted.length === 0) {
      console.warn(`⚠️  No problems found! This could mean:`);
      console.warn(`    - All problems in participated contests were already solved`);
      console.warn(`    - Contests don't have available standings (HTTP 400)`);
      console.warn(`    - Check API responses above for details`);
    }

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
