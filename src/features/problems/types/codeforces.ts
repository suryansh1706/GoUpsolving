/**
 * Type definitions for Codeforces API and application
 */

export interface UserRatingChange {
  contestId: number;
  contestName: string;
  newRating: number;
  oldRating: number;
  ratingUpdateTimeSeconds: number;
}

export interface Submission {
  contestId: number;
  creationTimeSeconds: number;
  problem: ProblemInfo;
  verdict: string;
}

export interface ProblemInfo {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}

export interface Contest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  relativeTimeSeconds: number;
}

export interface ContestStanding {
  contest: Contest;
  problems: ProblemInfo[];
}

export interface UpsolveProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  status: "not_attempted" | "attempted" | "upsolved";
}

export interface UseUpsolveProblemsResult {
  data: UpsolveProblem[] | null;
  loading: boolean;
  error: Error | null;
  refetch: (handle: string) => Promise<void>;
  clearCachedData: () => void;
  stats: {
    total: number;
    attempted: number;
    upsolved: number;
  };
}

export interface ProblemFilters {
  status: "all" | "not_attempted" | "attempted" | "upsolved";
  minRating: number;
  maxRating: number;
  tags: string[];
}
