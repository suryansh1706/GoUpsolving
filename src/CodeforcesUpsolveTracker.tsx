/**
 * Example: Codeforces Upsolve Tracker Component
 * 
 * This component demonstrates how to use the useUpsolveProblems hook
 * to display and manage upsolve recommendations for a Codeforces user.
 */

import React, { useState } from "react";
import { useUpsolveProblems } from "./useUpsolveProblems";
import type { UpsolveProblem } from "./codesforces-upsolve-service";

interface ProblemFilters {
  status: "all" | "attempted" | "upsolved";
  minRating: number;
  maxRating: number;
  tags: string[];
}

/**
 * Main component for viewing and filtering upsolve problems
 */
export function CodeforcesUpsolveTracker() {
  const [handle, setHandle] = useState("");
  const [submittedHandle, setSubmittedHandle] = useState("");
  const [filters, setFilters] = useState<ProblemFilters>({
    status: "attempted",
    minRating: 0,
    maxRating: 3500,
    tags: [],
  });
  const [sortBy, setSortBy] = useState<"rating" | "name" | "status">("rating");

  const { data, loading, error, refetch, stats } = useUpsolveProblems(
    submittedHandle
  );

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

  // Filter and sort problems
  const filteredProblems = React.useMemo(() => {
    if (!data) return [];

    return data
      .filter((problem) => {
        // Filter by status
        if (filters.status !== "all" && problem.status !== filters.status) {
          return false;
        }

        // Filter by rating
        const rating = problem.rating || 0;
        if (rating < filters.minRating || rating > filters.maxRating) {
          return false;
        }

        // Filter by tags
        if (
          filters.tags.length > 0 &&
          !filters.tags.some((tag) => problem.tags.includes(tag))
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "rating":
            return (a.rating || 0) - (b.rating || 0);
          case "name":
            return a.name.localeCompare(b.name);
          case "status":
            const statusOrder: Record<string, number> = { attempted: 0, upsolved: 1 };
            return (
              (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
            );
          default:
            return 0;
        }
      });
  }, [data, filters, sortBy]);

  // Extract all unique tags for filter options
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    data?.forEach((problem) => {
      problem.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [data]);

  return (
    <div className="upsolve-tracker">
      <header className="tracker-header">
        <h1>Codeforces Upsolve Tracker</h1>
        <p>Find problems you should upsolve based on your performance</p>
      </header>

      {/* Search Form */}
      <section className="search-section">
        <form onSubmit={handleSearch}>
          <div className="input-group">
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Enter your Codeforces handle..."
              className="search-input"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !handle.trim()}
              className="search-button"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error.message}
          </div>
        )}
      </section>

      {/* Statistics */}
      {data && (
        <section className="stats-section">
          <div className="stat-card">
            <span className="stat-label">Total Problems</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Attempted</span>
            <span className="stat-value">{stats.attempted}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Upsolved</span>
            <span className="stat-value">{stats.upsolved}</span>
          </div>
          <button onClick={handleRefresh} className="refresh-button">
            Refresh Data
          </button>
        </section>
      )}

      {/* Filters and Sort */}
      {data && data.length > 0 && (
        <section className="filters-section">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as ProblemFilters["status"],
                })
              }
            >
              <option value="all">All</option>
              <option value="attempted">Attempted</option>
              <option value="upsolved">Upsolved</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Rating Range:</label>
            <input
              type="number"
              value={filters.minRating}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  minRating: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
              placeholder="Min"
              className="filter-input"
              min="0"
            />
            <span>-</span>
            <input
              type="number"
              value={filters.maxRating}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  maxRating: Math.max(
                    filters.minRating,
                    parseInt(e.target.value) || 3500
                  ),
                })
              }
              placeholder="Max"
              className="filter-input"
              min={filters.minRating}
            />
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "rating" | "name" | "status")
              }
            >
              <option value="rating">Rating (Low to High)</option>
              <option value="name">Problem Name</option>
              <option value="status">Status</option>
            </select>
          </div>

          {availableTags.length > 0 && (
            <div className="filter-group">
              <label>Tags:</label>
              <div className="tag-filter">
                {availableTags.map((tag: string) => (
                  <label key={tag} className="tag-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({
                            ...filters,
                            tags: [...filters.tags, tag],
                          });
                        } else {
                          setFilters({
                            ...filters,
                            tags: filters.tags.filter((t) => t !== tag),
                          });
                        }
                      }}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Problems List */}
      <section className="problems-section">
        {filteredProblems.length > 0 ? (
          <div className="problems-list">
            {filteredProblems.map((problem) => (
              <ProblemCard key={`${problem.contestId}-${problem.index}`} problem={problem} />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="no-results">
            No problems match your filters. Try adjusting your criteria.
          </div>
        ) : data && data.length === 0 ? (
          <div className="no-results">
            No upsolve problems found. Great job! You've already solved or attempted all recent problems.
          </div>
        ) : null}
      </section>
    </div>
  );
}

/**
 * Individual problem card component
 */
function ProblemCard({ problem }: { problem: UpsolveProblem }) {
  const codeforcesUrl = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;

  return (
    <a
      href={codeforcesUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`problem-card status-${problem.status}`}
    >
      <div className="problem-header">
        <h3 className="problem-name">{problem.name}</h3>
        <span className={`status-badge status-${problem.status}`}>
          {problem.status}
        </span>
      </div>

      <div className="problem-meta">
        <span className="problem-id">
          Contest {problem.contestId} · Problem {problem.index}
        </span>
        {problem.rating && (
          <span className={`problem-rating rating-${getRatingClass(problem.rating)}`}>
            {problem.rating}
          </span>
        )}
      </div>

      {problem.tags.length > 0 && (
        <div className="problem-tags">
          {problem.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

/**
 * Helper function to determine rating difficulty class
 */
function getRatingClass(rating: number): string {
  if (rating < 1200) return "easy";
  if (rating < 1600) return "medium";
  if (rating < 2000) return "hard";
  if (rating < 2400) return "veryhard";
  return "extreme";
}

export default CodeforcesUpsolveTracker;
