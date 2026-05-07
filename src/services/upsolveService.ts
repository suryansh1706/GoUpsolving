/**
 * Core Upsolve Problems Service
 * 
 * This service analyzes a Codeforces user's contest history and identifies
 * problems they should upsolve based on:
 * - Contests participated in (from rating history)
 * - Last 6 months of contests
 * - Problems not solved during contests
 * - Problems within index range (up to maxSolved + 1)
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
  filterContestsLast6Months,
  deduplicateProblems,
  getHighestProblemIndexReached,
  getNextProblemIndex,
  compareProblemIndices,
} from "../utils/problemAnalysis";

/**
 * Filters problems to include only those eligible for upsolving
 * @param problem - Problem to evaluate
 * @param contestSolved - Set of problems solved during contest
 * @param maxRating - User's maximum rating
 * @param maxIndexToShow - Maximum problem index to include
 * @returns true if problem should be included
 */
function isEligibleForUpsolving(
  problem: ProblemInfo,
  contestSolved: Set<string>,
  maxRating: number,
  maxIndexToShow: string | null
): boolean {
  const problemId = `${problem.contestId}-${problem.index}`;

  // Skip if already solved during contest
  if (contestSolved.has(problemId)) {
    console.log(`  ❌ ${problemId}: Already solved during contest`);
    return false;
  }

  // Skip if problem index exceeds max allowed
  if (maxIndexToShow) {
    const cmp = compareProblemIndices(problem.index, maxIndexToShow);
    if (cmp > 0) {
      console.log(`  ❌ ${problemId}: Index ${problem.index} > ${maxIndexToShow}`);
      return false;
    }
  }

  // Skip if problem rating is too high (rated problems only)
  if (problem.rating !== undefined && problem.rating > maxRating + 200) {
    console.log(`  ❌ ${problemId}: Rating ${problem.rating} > ${maxRating + 200}`);
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

  try {
    const { problems } = await codeforcesAPI.getContestStandings(contest.id);
    console.log(`  📋 Contest ${contest.id}: ${problems.length} problems`);

    // Determine which problems user solved during the contest
    const contestSolved = getContestSolvedProblems(
      allSubmissions,
      contest.id,
      contest.startTimeSeconds,
      contest.durationSeconds
    );
    console.log(`    ✓ Solved during contest: ${contestSolved.size}`);

    // Find the highest problem index user reached
    const highestReached = getHighestProblemIndexReached(
      allSubmissions,
      contest.id,
      contest.startTimeSeconds,
      contest.durationSeconds
    );
    console.log(`    ✓ Highest reached: ${highestReached}`);

    // Calculate the maximum index user should attempt (highest + 1)
    const maxIndexToShow = highestReached ? getNextProblemIndex(highestReached) : null;
    console.log(`    ✓ Max index to show: ${maxIndexToShow}`);

    // Evaluate each problem in the contest
    problems.forEach((problem) => {
      const problemId = `${problem.contestId}-${problem.index}`;

      // Check if problem is eligible for upsolving
      if (!isEligibleForUpsolving(problem, contestSolved, maxRating, maxIndexToShow)) {
        return;
      }

      // Determine current status of the problem
      const status = determineStatus(
        problemId,
        contestSolved,
        allSubmissions,
        contest.id,
        problem.index,
        contest.startTimeSeconds,
        contest.durationSeconds
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
      console.log(`    ✅ Added: ${problemId} (${status})`);
    });
  } catch (error) {
    // Gracefully skip contests that require authentication (private/gym contests)
    // These are expected and not errors - just skip them silently
    if (error instanceof AppError && error.message.includes("authenticated")) {
      console.log(`  ⏭️  Skipping contest ${contest.id} (requires authentication)`);
      return candidates;
    }
    
    // Log other errors
    console.warn(`⚠️  Failed to fetch standings for contest ${contest.id}:`, error);
  }

  console.log(`  📊 Contest ${contest.id} total candidates: ${candidates.length}\n`);
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
    console.log(`📊 Fetching upsolve problems for ${handle}...`);

    // ===== STEP 1: Fetch rating history =====
    const ratingHistory = await codeforcesAPI.getUserRatingHistory(handle);
    const maxRating = getMaxRating(ratingHistory);
    console.log(`⭐ Max rating: ${maxRating}`);

    // Extract contest IDs where user participated
    const participatedContestIds = new Set(ratingHistory.map((r) => r.contestId));
    console.log(`🏆 Contests participated in: ${participatedContestIds.size}`);

    // ===== STEP 2: Fetch all submissions =====
    const allSubmissions = await codeforcesAPI.getUserSubmissions(handle);
    console.log(`📝 Total submissions: ${allSubmissions.length}`);

    // ===== STEP 3: Filter recent contests =====
    const allContests = await codeforcesAPI.getContestList();
    // Try 6 months first, if no results try 12 months
    let recentContests = filterContestsLast6Months(allContests, 180);
    
    console.log(`📅 Total contests in 6 months: ${recentContests.length}`);
    
    // Debug: show date range
    if (recentContests.length > 0) {
      const earliestContest = new Date(recentContests[recentContests.length - 1].startTimeSeconds * 1000);
      const latestContest = new Date(recentContests[0].startTimeSeconds * 1000);
      console.log(`   Date range: ${earliestContest.toLocaleDateString()} to ${latestContest.toLocaleDateString()}`);
    }

    // Only keep recent contests that user participated in
    let participatedRecentContests = recentContests.filter((contest) =>
      participatedContestIds.has(contest.id)
    );
    console.log(`🎯 Recent contests participated in: ${participatedRecentContests.length}`);
    
    // Debug: if no recent contests, check if user has older contests
    if (participatedRecentContests.length === 0 && participatedContestIds.size > 0) {
      console.log(`⚠️  No contests in last 6 months. Trying 12 months...`);
      recentContests = filterContestsLast6Months(allContests, 365);
      participatedRecentContests = recentContests.filter((contest) =>
        participatedContestIds.has(contest.id)
      );
      console.log(`   Found ${participatedRecentContests.length} contests in last 12 months`);
    }

    // ===== STEP 4: Collect upsolve candidates from each contest =====
    const upsolveCandidates: UpsolveProblem[] = [];
    
    // Limit to first 20 contests to avoid overwhelming the API/function
    const maxContestsToProcess = Math.min(participatedRecentContests.length, 20);
    console.log(`🔄 Processing ${maxContestsToProcess} contests (max limit to prevent timeout)...`);

    for (let i = 0; i < maxContestsToProcess; i++) {
      const contest = participatedRecentContests[i];
      try {
        const contestProblems = await collectContestProblems(
          contest,
          allSubmissions,
          maxRating
        );
        upsolveCandidates.push(...contestProblems);
        
        // Add small delay between requests to prevent overwhelming the API
        if (i < maxContestsToProcess - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        // Log but continue - don't let one contest failure stop the whole process
        console.warn(`⚠️  Skipping contest ${contest.id}: ${error}`);
        continue;
      }
    }

    // ===== STEP 5: Deduplicate and sort =====
    const deduplicated = deduplicateProblems(upsolveCandidates);
    const sorted = deduplicated.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    console.log(`✅ Found ${sorted.length} upsolve problems`);
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
  console.log("🗑️  Cache cleared");
}
