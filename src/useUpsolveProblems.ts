/**
 * React Hook for Codeforces Upsolve Problems
 * 
 * Provides a clean React hook interface to fetch and manage upsolve problem data
 */

import { useState, useCallback, useEffect } from "react";
import { getUpsolveProblems, clearCache } from "./codesforces-upsolve-service";
import { AppError, categorizeError } from "./types/errors";
import type { UpsolveProblem } from "./codesforces-upsolve-service";

interface UseUpsolveProblemsState {
  data: UpsolveProblem[] | null;
  loading: boolean;
  error: Error | null;
}

interface UseUpsolveProblemsResult extends UseUpsolveProblemsState {
  refetch: (handle: string) => Promise<void>;
  clearCachedData: () => void;
  stats: {
    total: number;
    attempted: number;
    upsolved: number;
  };
}

/**
 * Custom React hook to fetch and manage upsolve problems
 * 
 * @example
 * const { data, loading, error, refetch, stats } = useUpsolveProblems("tourist");
 * 
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * 
 * return (
 *   <div>
 *     <p>Found {stats.total} problems ({stats.attempted} attempted, {stats.upsolved} upsolved)</p>
 *     {data?.map(problem => (
 *       <div key={`${problem.contestId}-${problem.index}`}>
 *         <h3>{problem.name}</h3>
 *         <p>Rating: {problem.rating}</p>
 *         <p>Status: {problem.status}</p>
 *       </div>
 *     ))}
 *   </div>
 * );
 */
export function useUpsolveProblems(
  initialHandle?: string
): UseUpsolveProblemsResult {
  const [state, setState] = useState<UseUpsolveProblemsState>({
    data: null,
    loading: !!initialHandle,
    error: null,
  });

  const fetchProblems = useCallback(async (handle: string) => {
    if (!handle.trim()) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const problems = await getUpsolveProblems(handle);
      setState({
        data: problems,
        loading: false,
        error: null,
      });
    } catch (err) {
      const error = err instanceof AppError ? err : categorizeError(err);
      setState({
        data: null,
        loading: false,
        error,
      });
    }
  }, []);

  // Fetch on mount if initialHandle is provided
  useEffect(() => {
    if (initialHandle) {
      fetchProblems(initialHandle);
    }
  }, [initialHandle, fetchProblems]);

  // Calculate statistics
  const stats = {
    total: state.data?.length ?? 0,
    attempted: state.data?.filter((p) => p.status === "attempted").length ?? 0,
    upsolved: state.data?.filter((p) => p.status === "upsolved").length ?? 0,
  };

  return {
    ...state,
    refetch: fetchProblems,
    clearCachedData: clearCache,
    stats,
  };
}

// ============================================================================
// Example Component Usage
// ============================================================================

/*
import React, { useState } from "react";
import { useUpsolveProblems } from "./useUpsolveProblems";

export function CodeforcesUpsolveViewer() {
  const [handle, setHandle] = useState("");
  const { data, loading, error, refetch, stats } = useUpsolveProblems();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await refetch(handle);
  };

  return (
    <div className="container">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Enter Codeforces handle..."
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </form>

      {error && <div className="error">Error: {error.message}</div>}

      {data && (
        <div>
          <div className="stats">
            <p>Total Problems: {stats.total}</p>
            <p>Attempted: {stats.attempted}</p>
            <p>Upsolved: {stats.upsolved}</p>
          </div>

          <div className="problems-list">
            {data.map((problem) => (
              <div key={`${problem.contestId}-${problem.index}`} className="problem-card">
                <h3>{problem.name}</h3>
                <p>Problem: {problem.index}</p>
                <p>Rating: {problem.rating || "N/A"}</p>
                <p>Tags: {problem.tags.join(", ")}</p>
                <span className={`status status-${problem.status}`}>
                  {problem.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
*/
