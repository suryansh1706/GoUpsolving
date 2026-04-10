/**
 * Problem Analysis Utilities
 * 
 * Helper functions for analyzing Codeforces problems and user submissions.
 * Handles:
 * - Rating calculations
 * - Submission verification
 * - Problem indexing and sorting
 * - Contest-based filtering
 */

import type { Submission, UpsolveProblem, UserRatingChange } from "../types/codeforces";

// ===== RATING FUNCTIONS =====

/**
 * Gets the maximum rating achieved by a user
 * @param ratingHistory - User's rating change history
 * @returns Maximum rating, or 0 if no history
 */
export function getMaxRating(ratingHistory: UserRatingChange[]): number {
  if (ratingHistory.length === 0) return 0;
  return Math.max(...ratingHistory.map((r) => r.newRating));
}

/**
 * Gets the rating difficulty class for UI styling
 * @param rating - Problem rating
 * @returns CSS class name (easy, medium, hard, veryhard, extreme)
 */
export function getRatingClass(rating: number): string {
  if (rating < 1200) return "easy";
  if (rating < 1600) return "medium";
  if (rating < 2000) return "hard";
  if (rating < 2400) return "veryhard";
  return "extreme";
}

// ===== SUBMISSION FUNCTIONS =====

/**
 * Checks if a submission was accepted (AC)
 * @param submission - Submission to check
 * @returns true if verdict is "OK"
 */
export function isAccepted(submission: Submission): boolean {
  return submission.verdict === "OK";
}

/**
 * Checks if a submission was made during a contest
 * @param submission - Submission to check
 * @param contestStartTime - Contest start time (unix timestamp)
 * @param contestDuration - Contest duration in seconds
 * @returns true if submission was during contest window
 */
export function isDuringContest(
  submission: Submission,
  contestStartTime: number,
  contestDuration: number
): boolean {
  const submissionTime = submission.creationTimeSeconds;
  const contestEndTime = contestStartTime + contestDuration;
  return submissionTime >= contestStartTime && submissionTime <= contestEndTime;
}

/**
 * Gets all problems solved (AC) during a contest by the user
 * @param submissions - All user submissions
 * @param contestId - Contest ID to filter
 * @param contestStartTime - Contest start time
 * @param contestDuration - Contest duration in seconds
 * @returns Set of problem IDs in format "contestId-index"
 */
export function getContestSolvedProblems(
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
 * Gets all submissions for a specific problem by the user
 * @param submissions - All user submissions
 * @param contestId - Contest ID
 * @param problemIndex - Problem index (e.g., "A", "B", "1", etc.)
 * @returns Array of submissions for that problem
 */
export function getProblemSubmissions(
  submissions: Submission[],
  contestId: number,
  problemIndex: string
): Submission[] {
  return submissions.filter(
    (sub) => sub.contestId === contestId && sub.problem.index === problemIndex
  );
}

/**
 * Determines the upsolve status of a problem
 * @returns "not_attempted" if no submissions, "attempted" if tried but no AC,
 *          "upsolved" if AC after the contest ended
 */
export function determineStatus(
  problemId: string,
  contestSolvedDuringContest: Set<string>,
  allSubmissions: Submission[],
  contestId: number,
  problemIndex: string,
  contestStartTime: number,
  contestDuration: number
): "not_attempted" | "attempted" | "upsolved" {
  if (contestSolvedDuringContest.has(problemId)) {
    return "not_attempted";
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

// ===== PROBLEM INDEX FUNCTIONS =====

/**
 * Gets the highest problem index the user reached (solved or attempted) in a contest
 * @param submissions - All user submissions
 * @param contestId - Contest ID
 * @param contestStartTime - Contest start time
 * @param contestDuration - Contest duration in seconds
 * @returns Highest index reached (e.g., "C", "5"), or null if none
 */
export function getHighestProblemIndexReached(
  submissions: Submission[],
  contestId: number,
  contestStartTime: number,
  contestDuration: number
): string | null {
  const indices = submissions
    .filter(
      (sub) =>
        sub.contestId === contestId &&
        isDuringContest(sub, contestStartTime, contestDuration)
    )
    .map((sub) => sub.problem.index);

  if (indices.length === 0) return null;

  // Sort indices and return the highest
  return indices.sort((a, b) => compareProblemIndices(a, b)).reverse()[0];
}

/**
 * Gets the next problem index after the given one
 * E.g., "A" -> "B", "C" -> "D", "1" -> "2"
 * @param index - Current problem index
 * @returns Next index, or index + "1" for complex indices
 */
export function getNextProblemIndex(index: string): string {
  // Numeric indices: increment
  if (/^\d+$/.test(index)) {
    return String(parseInt(index, 10) + 1);
  }

  // Single letter: get next letter
  if (index.length === 1 && /^[A-Z]$/.test(index)) {
    return String.fromCharCode(index.charCodeAt(0) + 1);
  }

  // Complex indices: append "1"
  return index + "1";
}

/**
 * Compares two problem indices for sorting
 * Handles both numeric (1, 2, 3) and letter (A, B, C) indices
 * @param a - First index
 * @param b - Second index
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareProblemIndices(a: string, b: string): number {
  // Try numeric comparison first
  const aNum = parseInt(a, 10);
  const bNum = parseInt(b, 10);

  if (!isNaN(aNum) && !isNaN(bNum)) {
    return aNum - bNum;
  }

  // Fall back to lexicographic comparison
  return a.localeCompare(b);
}

// ===== FILTERING FUNCTIONS =====

/**
 * Filters contests to only those from the last 6 months
 * @param contests - All contests
 * @returns Contests from the last 6 months
 */
export function filterContestsLast6Months(contests: any[]): any[] {
  const sixMonthsAgo = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 60 * 60;
  return contests.filter((contest) => contest.startTimeSeconds > sixMonthsAgo);
}

/**
 * Removes duplicate problems, keeping the one with highest rating
 * @param problems - Array of problems (may contain duplicates)
 * @returns Deduplicated array
 */
export function deduplicateProblems(
  problems: UpsolveProblem[]
): UpsolveProblem[] {
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
