/**
 * Type definitions for Codeforces API and application
 */

export interface UserRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export interface Submission {
  id: number;
  contestId: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: ProblemInfo;
  author: {
    contestId: number;
    members: Array<{ handle: string }>;
    participantType: string;
    ghost: boolean;
    startTimeSeconds: number;
  };
  programmingLanguage: string;
  verdict: string;
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

export interface ProblemInfo {
  contestId: number;
  index: string;
  name: string;
  type: string;
  points: number;
  rating?: number;
  tags: string[];
}

export interface Contest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds: number;
}

export interface ContestStanding {
  contest: Contest;
  problems: ProblemInfo[];
  rows: Array<{
    party: {
      contestId: number;
      members: Array<{ handle: string }>;
      participantType: string;
      ghost: boolean;
      startTimeSeconds: number;
    };
    rank: number;
    points: number;
    penalty: number;
    successfulHackCount: number;
    unsuccessfulHackCount: number;
    problemResults: Array<{
      points: number;
      penalty: number;
      rejectedAttemptCount: number;
      type: string;
      bestSubmissionTimeSeconds: number;
    }>;
  }>;
}

export interface UpsolveProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  status: "not_attempted" | "attempted" | "upsolved";
  points?: number;
  solvedAt?: number;
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
