/**
 * problems they should upsolve based on:
 * - Contests participated in (from rating history)
 * - Problems not solved in contests
 * - Problems with rating <= (maxRating + 200) if rated
 */

import { codeforcesAPI } from "./codeforcesAPI";
import type { UpsolveProblem, Submission, ProblemInfo } from "../types/codeforces";
import { AppError } from "../types/errors";
import { getMaxRating, getContestSolvedProblems, determineStatus } from "../utils/problemAnalysis";

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
  contestId: number,
  contestSubmissions: Submission[],
  maxRating: number,
  problems: ProblemInfo[]
): Promise<UpsolveProblem[]> {
  const candidates: UpsolveProblem[] = [];

  try {
    if (problems.length === 0) {
      return candidates;
    }

    // Determine which problems user solved in the contest
    const contestSolved = getContestSolvedProblems(
      contestSubmissions,
      contestId
    );

    // Evaluate each problem in the contest
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
        contestId,
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
    // Only log truly unexpected errors
    if (error instanceof AppError) {
      console.error(`Error fetching contest ${contestId}: ${error.message}`);
    }
  }

  return candidates;
}

/**
 * Collects problems from multiple contests in small batches.
 * @param contestIds - Contest IDs to fetch problems from
 * @param allSubmissions - All user submissions
 * @param maxRating - User's maximum rating
 * @returns Array of upsolve problems
 */
async function collectProblemsFromMultipleContests(
  contestIds: number[],
  submissionsByContest: Map<number, Submission[]>,
  maxRating: number,
  problemsetByContest: Map<number, ProblemInfo[]>
): Promise<UpsolveProblem[]> {
  const results: UpsolveProblem[] = [];
  const CONCURRENCY = 5; // Fetch 5 contests at a time
  
  // Process contests in small batches
  for (let i = 0; i < contestIds.length; i += CONCURRENCY) {
    const batch = contestIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((contestId) => collectContestProblems(
        contestId,
        submissionsByContest.get(contestId) || [],
        maxRating,
        problemsetByContest.get(contestId) || []
      ))
    );

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const contestProblems = result.value;
        results.push(...contestProblems);
      } else if (result.reason instanceof AppError && result.reason.type === "CODEFORCES_RATE_LIMIT") {
        console.warn(`Rate limited on contest ${batch[index]}`);
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
export async function getUpsolveProblems(handle: string): Promise<UpsolveProblem[]> {
  try {
    const trimmedHandle = handle.trim();
    
    // Fetch all data in parallel (independent requests)
    const [ratingHistory, allSubmissions, contestList] = await Promise.all([
      codeforcesAPI.getUserRatingHistory(trimmedHandle),
      codeforcesAPI.getUserSubmissions(trimmedHandle),
      codeforcesAPI.getContestList(), // get literally all contests
    ]);
    
    const maxRating = getMaxRating(ratingHistory);
    
    // Pre-filter contest list once: keep only contests not older than the rolling 6-month window.
    const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
    const sixMonthsAgoSeconds = Math.floor((Date.now() - SIX_MONTHS_MS) / 1000);

    // fetch all existing contests of last 6 months and keep IDs for quick lookup
    const eligibleContestIds = new Set<number>(); contestList.forEach((contest) => {
      if (contest.startTimeSeconds !== undefined && contest.startTimeSeconds >= sixMonthsAgoSeconds) {
        eligibleContestIds.add(contest.id);
      }
    });

    // Step 1: contests participated in (restricted to already-filtered eligible contests)
    const recentRatedContestIds = new Set<number>(); ratingHistory.forEach((r) => {
      if (eligibleContestIds.has(r.contestId)) {
        recentRatedContestIds.add(r.contestId);
      }
    });
    
    // Step 2: collect submissions only for participated contests
    const recentSubmissions = allSubmissions.filter((s) => recentRatedContestIds.has(s.contestId));
    
    // Pre-filter submissions by contest ID for faster lookups (avoid re-filtering 100+ times)
    // submissionsByContest = {contest id: [submissions]}
    const submissionsByContest = new Map<number, Submission[]>();
    recentSubmissions.forEach((submission) => {
      if (!submissionsByContest.has(submission.contestId)) {
        submissionsByContest.set(submission.contestId, []);
      }
      submissionsByContest.get(submission.contestId)!.push(submission);
    });
    
    const participatedContestIds = Array.from(recentRatedContestIds);

    // Fetch the global problemset once and group problems by contest.
    const allProblems = await codeforcesAPI.getProblemsetProblems();

    // problemsetByContest = {contest id: [all problems]}
    const problemsetByContest = new Map<number, ProblemInfo[]>();
    allProblems.forEach((problem) => {
      if (!problemsetByContest.has(problem.contestId)) {
        problemsetByContest.set(problem.contestId, []);
      }
      problemsetByContest.get(problem.contestId)!.push(problem);
    });

    const upsolveCandidates = await collectProblemsFromMultipleContests(
      participatedContestIds,
      submissionsByContest,
      maxRating,
      problemsetByContest
    );

    const sorted = upsolveCandidates.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    return sorted;
  } catch (error) {
    console.error("Fatal error in getUpsolveProblems:", error);
    throw error;
  }
}

