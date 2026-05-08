import type { UpsolveProblem, ProblemFilters } from "../types/codeforces";

/**
 * Applies status, rating, and tag filters to problems
 */
export function filterProblems(problems: UpsolveProblem[], filters: ProblemFilters): UpsolveProblem[] {
  return problems.filter((problem) => {
    // Filter by status
    if (filters.status !== "all" && problem.status !== filters.status) {
      return false;
    }

    // Filter by rating range
    const rating = problem.rating || 0;
    if (rating < filters.minRating || rating > filters.maxRating) {
      return false;
    }

    // Filter by tags (include if problem has ANY of the selected tags)
    if (
      filters.tags.length > 0 &&
      !filters.tags.some((tag) => problem.tags.includes(tag))
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Sorts problems by the specified criterion
 */
export function sortProblems(problems: UpsolveProblem[], sortBy: "rating" | "status"): UpsolveProblem[] {
  const sorted = [...problems];

  switch (sortBy) {
    case "rating":
      sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      break;
    
    case "status":
      const statusOrder: Record<string, number> = {
        not_attempted: 0,
        attempted: 1,
        upsolved: 2,
      };
      sorted.sort(
        (a, b) =>
          (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
      );
      break;
  }

  return sorted;
}
