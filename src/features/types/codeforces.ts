/**
 * Type definitions for Codeforces API and application
 */

export interface UserRatingChange {
  contestId: number;
  newRating: number;
}

export interface Submission {
  contestId: number;
  problem: ProblemInfo;
  verdict: string;
  author?: {
    participantType?: "CONTESTANT" | "PRACTICE" | "VIRTUAL" | "OUT_OF_COMPETITION" | "MANAGER";
  };
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
  startTimeSeconds?: number;
}

export interface UpsolveProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  status: "not_attempted" | "attempted";
}

export interface UseUpsolveProblemsResult {
  data: UpsolveProblem[] | null;
  loading: boolean;
  error: Error | null;
  refetch: (handle: string) => Promise<void>;
  stats: {
    total: number;
    attempted: number;
  };
}

export interface ProblemFilters {
  status: "all" | "not_attempted" | "attempted";
  minRating: number;
  maxRating: number;
  tags: string[];
}

export type SortOption = "recent" | "rating" | "status";
