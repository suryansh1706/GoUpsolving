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

    // ===== STEP 4: Collect problems to consider for upsolving from each contest =====
    const upsolveCandidates: UpsolveProblem[] = [];
    console.log(`🔍 Collecting problems from each contest...`);

    for (const [index, contest] of participatedContests.entries()) {
      try {
        const contestProblems = await collectContestProblems(
          contest,
          allSubmissions,
          maxRating
        );
        if (contestProblems.length > 0) {
          console.log(`  ✅ Contest ${contest.id}: ${contestProblems.length} upsolve candidates`);
        } else {
          console.log(`  ⏭️  Contest ${contest.id}: no standings available or all solved`);
        }
        upsolveCandidates.push(...contestProblems);
        
        // Add small delay between requests to prevent overwhelming the API
        if (index < participatedContests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Error fetching contest ${contest.id}: ${error}`);
        continue;
      }
    }

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
      upsolved: upsolveCandidates.filter(p => p.status === "upsolved").length,
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
