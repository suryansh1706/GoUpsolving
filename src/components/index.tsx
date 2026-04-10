/**
 * Codeforces Upsolve Tracker - Main Container Component
 * 
 * Orchestrates the entire application:
 * - Manages user input and search
 * - Applies filters and sorting
 * - Renders all child components
 */

import React, { useState } from "react";
import { useUpsolveProblems } from "../hooks/useUpsolveProblems";
import type { UpsolveProblem, ProblemFilters } from "../types/codeforces";

// Child Components
import { SearchForm } from "./SearchForm";
import { ErrorDisplay } from "./ErrorDisplay";
import { StatsSection } from "./StatsSection";
import { FilterPanel } from "./FilterPanel";
import { ProblemsList } from "./ProblemsList";

/**
 * Applies status, rating, and tag filters to problems
 */
function filterProblems(
  problems: UpsolveProblem[],
  filters: ProblemFilters
): UpsolveProblem[] {
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
function sortProblems(
  problems: UpsolveProblem[],
  sortBy: "rating" | "name" | "status"
): UpsolveProblem[] {
  const sorted = [...problems];

  switch (sortBy) {
    case "rating":
      sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      break;

    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
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

/**
 * Main application component
 */
export function CodeforcesUpsolveTracker() {
  // ===== STATE =====
  const [handle, setHandle] = useState("");
  const [submittedHandle, setSubmittedHandle] = useState("");
  const [filters, setFilters] = useState<ProblemFilters>({
    status: "all",
    minRating: 0,
    maxRating: 3500,
    tags: [],
  });
  const [sortBy, setSortBy] = useState<"rating" | "name" | "status">("rating");

  // ===== DATA FETCHING =====
  const { data, loading, error, refetch, stats } = useUpsolveProblems(
    submittedHandle
  );

  // ===== EVENT HANDLERS =====
  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (handle.trim()) {
      setSubmittedHandle(handle);
      await refetch(handle);
    }
  };

  const handleRefresh = async () => {
    if (submittedHandle) {
      await refetch(submittedHandle);
    }
  };

  // ===== DERIVED STATE =====
  // Apply filters and sorting
  const filteredProblems = React.useMemo(() => {
    if (!data) return [];

    const filtered = filterProblems(data, filters);
    const sorted = sortProblems(filtered, sortBy);

    return sorted;
  }, [data, filters, sortBy]);

  // Extract all unique tags from problems
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    data?.forEach((problem) => {
      problem.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [data]);

  // ===== RENDER =====
  return (
    <div className="upsolve-tracker">
      {/* Header */}
      <header className="tracker-header">
        <h1>Codeforces Upsolve Tracker</h1>
        <p>Find problems you should upsolve based on your performance</p>
      </header>

      {/* Search */}
      <SearchForm
        handle={handle}
        onHandleChange={setHandle}
        onSearch={handleSearch}
        loading={loading}
      />

      {/* Error Display */}
      <ErrorDisplay error={error} />

      {/* Statistics */}
      {data && <StatsSection stats={stats} onRefresh={handleRefresh} />}

      {/* Filters */}
      {data && data.length > 0 && (
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          availableTags={availableTags}
        />
      )}

      {/* Problems List */}
      <ProblemsList
        problems={filteredProblems}
        isLoading={loading}
        hasData={!!data}
      />
    </div>
  );
}

export default CodeforcesUpsolveTracker;
