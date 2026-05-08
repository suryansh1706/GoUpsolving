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

export function useUpsolveProblems(initialHandle?: string): UseUpsolveProblemsResult {
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
