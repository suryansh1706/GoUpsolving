/**
 * Codeforces Upsolve Tracker - Presentational Component
 * 
 * Displays the UI based on provided props
 */

import React from "react";
import type { UpsolveProblem, ProblemFilters } from "../types/codeforces";

// Child Components
import { SearchForm } from "./SearchForm";
import { ErrorDisplay } from "./ErrorDisplay";
import { StatsSection } from "./StatsSection";
import { FilterPanel } from "./FilterPanel";
import { ProblemsList } from "./ProblemsList";

interface CodeforcesUpsolveTrackerViewProps {
  // Input state
  handle: string;
  onHandleChange: (handle: string) => void;

  // Data
  data: UpsolveProblem[] | null;
  loading: boolean;
  error: Error | null;
  stats: {
    total: number;
    attempted: number;
    upsolved: number;
  };

  // Filters and sorting
  filters: ProblemFilters;
  onFiltersChange: (filters: ProblemFilters) => void;
  sortBy: "rating" | "status";
  onSortChange: (sortBy: "rating" | "status") => void;

  // Derived data
  filteredProblems: UpsolveProblem[];
  availableTags: string[];

  // Event handlers
  onSearch: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function CodeforcesUpsolveTrackerView({
  handle,
  onHandleChange,
  data,
  loading,
  error,
  stats,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  filteredProblems,
  availableTags,
  onSearch,
  onRefresh,
}: CodeforcesUpsolveTrackerViewProps) {
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
        onHandleChange={onHandleChange}
        onSearch={onSearch}
        loading={loading}
      />

      {/* Error Display */}
      <ErrorDisplay error={error} />

      {/* Statistics */}
      {data && <StatsSection stats={stats} onRefresh={onRefresh} />}

      {/* Filters */}
      {data && data.length > 0 && (
        <FilterPanel
          filters={filters}
          onFiltersChange={onFiltersChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
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
