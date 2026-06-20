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
import type { ProblemFilters } from "../types/codeforces";
import { filterProblems, sortProblems } from "../utils/problemFiltering";
import { CodeforcesUpsolveTrackerView } from "./CodeforcesUpsolveTrackerView";

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
  const [sortBy, setSortBy] = useState<"rating" | "status">("rating");

  // ===== DATA FETCHING =====

  // data is problems that should be upsolved, not all problems
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
    <CodeforcesUpsolveTrackerView
      handle={handle}
      onHandleChange={setHandle}
      data={data}
      loading={loading}
      error={error}
      stats={stats}
      filters={filters}
      onFiltersChange={setFilters}
      sortBy={sortBy}
      onSortChange={setSortBy}
      filteredProblems={filteredProblems}
      availableTags={availableTags}
      onSearch={handleSearch}
      onRefresh={handleRefresh}
    />
  );
}

export default CodeforcesUpsolveTracker;
