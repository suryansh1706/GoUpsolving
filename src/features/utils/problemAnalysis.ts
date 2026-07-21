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
 * Gets all problems solved (AC) in a contest by the user
 * @param submissions - All user submissions
 * @returns Set of problem IDs in format "contestId-index"
 */
export function getContestSolvedProblems(submissions: Submission[]): Set<string> {
  const solved = new Set<string>();

  submissions.forEach((sub) => {
    const participantType = sub.author?.participantType;
    const isContestParticipation =
      participantType === undefined ||
      participantType === "CONTESTANT" ||
      participantType === "VIRTUAL" ||
      participantType === "OUT_OF_COMPETITION";

    if (isContestParticipation && sub.verdict === "OK") {
      solved.add(`${sub.problem.contestId}-${sub.problem.index}`);
    }
  });

  return solved;
}

/**
 * Determines the upsolve status of a problem
 * @returns "not_attempted" if no submissions, "attempted" if tried but no AC
 */
export function determineStatus(
  contestSubmissions: Submission[],
  contestId: number,
  problemIndex: string
): "not_attempted" | "attempted" {
  return contestSubmissions.some(
    (submission) =>
      submission.contestId === contestId &&
      submission.problem.index === problemIndex
  )
    ? "attempted"
    : "not_attempted";
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

