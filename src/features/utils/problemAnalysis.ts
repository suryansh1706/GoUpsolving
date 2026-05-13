/**
 * Problem Analysis Utilities
 * 
 * Helper functions for analyzing Codeforces problems and user submissions.
 * Handles:
 * - Rating calculations
 * - Submission verification
 * - Contest-based filtering
 */

import type { Submission, UserRatingChange } from "../types/codeforces";

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
 * Gets all problems solved (AC) in a contest by the user
 * @param submissions - All user submissions
 * @param contestId - Contest ID to filter
 * @returns Set of problem IDs in format "contestId-index"
 */
export function getContestSolvedProblems(
  submissions: Submission[],
  contestId: number
): Set<string> {
  const solved = new Set<string>();

  submissions.forEach((sub) => {
    if (sub.contestId === contestId && isAccepted(sub)) {
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
  problemIndex: string
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

// ===== RATING CLASS FUNCTIONS =====

/**
 * Gets CSS class name for a problem rating
 * @param rating - Problem rating
 * @returns CSS class name (gray, green, cyan, blue, violet, orange, red, maroon)
 */
export function getRatingClass(rating: number): string {
  if (rating < 1200) return "gray";
  if (rating < 1400) return "green";
  if (rating < 1600) return "cyan";
  if (rating < 1900) return "blue";
  if (rating < 2200) return "violet";
  if (rating < 2400) return "orange";
  if (rating < 2600) return "red";
  return "maroon";
}

