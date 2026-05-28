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
  contestSubmissions: Submission[],
  maxRating: number
): boolean {
  const problemId = `${problem.contestId}-${problem.index}`;

  // Skip if already solved during contest
  if (contestSolved.has(problemId)) {
    return false;
  }

  // Skip if solved later as well (e.g., practice AC after contest)
  const solvedLater = contestSubmissions.some(
    (submission) =>
      submission.problem.contestId === problem.contestId &&
      submission.problem.index === problem.index &&
      submission.verdict === "OK"
  );
  if (solvedLater) {
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
  contestSubmissions: Submission[],
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
      contestSubmissions,
      contest.id
    );

    // Evaluate each problem in the contest
    let includedCount = 0;
    problems.forEach((problem) => {
      const problemId = `${problem.contestId}-${problem.index}`;

      // Check if problem is eligible for upsolving
      if (!isEligibleForUpsolving(problem, contestSolved, contestSubmissions, maxRating)) {
        return;
      }

      // Determine current status of the problem
      const status = determineStatus(
        problemId,
        contestSolved,
        contestSubmissions,
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
      console.error(`Error fetching contest ${contest.id}: ${error.message}`);
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
  submissionsByContest: Map<number, Submission[]>,
  maxRating: number
): Promise<UpsolveProblem[]> {
  const results: UpsolveProblem[] = [];
  const CONCURRENCY = 5; // Fetch 5 contests at a time
  
  // Process contests in small batches
  for (let i = 0; i < contests.length; i += CONCURRENCY) {
    const batch = contests.slice(i, i + CONCURRENCY);
    
    const batchResults = await Promise.allSettled(
      batch.map((contest) => collectContestProblems(contest, submissionsByContest.get(contest.id) || [], maxRating))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const contestProblems = result.value;
        results.push(...contestProblems);
      } else if (result.reason instanceof AppError && result.reason.type === "CODEFORCES_RATE_LIMIT") {
        console.warn(`Rate limited on contest ${batch[index].id}`);
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
    // Trim whitespace from handle
    const trimmedHandle = handle.trim();
    
    // Fetch all data in parallel (independent requests)
    const [ratingHistory, allSubmissions, contestList] = await Promise.all([
      codeforcesAPI.getUserRatingHistory(trimmedHandle),
      codeforcesAPI.getUserSubmissions(trimmedHandle),
      codeforcesAPI.getContestList(),
    ]);
    
    const maxRating = getMaxRating(ratingHistory);
    
    // Calculate last-6-month cutoff using calendar months (not fixed 30-day blocks)
    const sixMonthsAgoDate = new Date();
    sixMonthsAgoDate.setUTCMonth(sixMonthsAgoDate.getUTCMonth() - 6);
    const sixMonthsAgoMs = sixMonthsAgoDate.getTime();
    const sixMonthsAgoSeconds = Math.floor(sixMonthsAgoMs / 1000);
    
    // Build contest-start lookup and only keep contests that officially started in last 6 months
    const recentContestsById = new Map<number, Contest>();
    contestList.forEach((contest) => {
      if (
        contest.startTimeSeconds !== undefined &&
        contest.startTimeSeconds >= sixMonthsAgoSeconds
      ) {
        recentContestsById.set(contest.id, contest);
      }
    });

    // Step 1: contests participated in last 6 months (from rating history)
    const participatedContestIdSet = new Set<number>();

    ratingHistory
      .filter((r) => (r.ratingUpdateTimeSeconds * 1000) > sixMonthsAgoMs)
      .forEach((r) => participatedContestIdSet.add(r.contestId));

    // Enforce strict contest-date gating: exclude any contest older than 6 months
    const recentContestIds = new Set<number>(
      Array.from(participatedContestIdSet).filter((contestId) =>
        recentContestsById.has(contestId)
      )
    );
    
    // Step 2: collect submissions only for participated contests
    const recentSubmissions = allSubmissions.filter(
      (s) => recentContestIds.has(s.contestId)
    );
    
    // Pre-filter submissions by contest ID for faster lookups (avoid re-filtering 100+ times)
    const submissionsByContest = new Map<number, Submission[]>();
    recentSubmissions.forEach((submission) => {
      if (!submissionsByContest.has(submission.contestId)) {
        submissionsByContest.set(submission.contestId, []);
      }
      submissionsByContest.get(submission.contestId)!.push(submission);
    });
    
    // Use canonical contest metadata from contest.list
    const participatedContests = Array.from(recentContestIds)
      .map((contestId) => recentContestsById.get(contestId))
      .filter((contest): contest is Contest => contest !== undefined);

    const upsolveCandidates = await collectProblemsFromMultipleContests(
      participatedContests,
      submissionsByContest,
      maxRating
    );

    const filtered = upsolveCandidates.filter(problem => 
      problem.status === "attempted" || problem.status === "not_attempted"
    );

    const sorted = filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    return sorted;
  } catch (error) {
    console.error("Fatal error in getUpsolveProblems:", error);
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
