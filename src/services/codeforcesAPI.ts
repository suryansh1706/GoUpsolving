/**
 * Codeforces API Service
 * Routes through Vercel serverless function to avoid CORS issues
 */

import { apiCache } from "./cache";
import type {
  UserRatingChange,
  Submission,
  Contest,
  ContestStanding,
  ProblemInfo,
} from "../types/codeforces";

// Use Vercel serverless API route instead of direct CORS calls
const API_BASE = "/api/codeforces";

/**
 * Generic API call with caching
 */
async function callAPI<T>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<T> {
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;

  // Check cache first
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  // Build query parameters
  const queryParams = new URLSearchParams({
    endpoint,
    ...Object.entries(params).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: String(value),
    }), {}),
  });

  try {
    const response = await fetch(`${API_BASE}?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();

    if (json.status !== "OK") {
      throw new Error(`Codeforces API error: ${json.comment}`);
    }

    apiCache.set(cacheKey, json.result);
    return json.result;
  } catch (error) {
    console.error(`Failed to fetch from Codeforces API: ${endpoint}`, error);
    throw error;
  }
}

export const codeforcesAPI = {
  /**
   * Get user's rating history
   */
  async getUserRatingHistory(handle: string): Promise<UserRatingChange[]> {
    return callAPI<UserRatingChange[]>("user.rating", { handle });
  },

  /**
   * Get user's all submissions
   */
  async getUserSubmissions(handle: string): Promise<Submission[]> {
    return callAPI<Submission[]>("user.status", { handle });
  },

  /**
   * Get list of all contests
   */
  async getContestList(): Promise<Contest[]> {
    return callAPI<Contest[]>("contest.list", {});
  },

  /**
   * Get contest standings with all problems
   */
  async getContestStandings(
    contestId: number
  ): Promise<{ contest: Contest; problems: ProblemInfo[] }> {
    const response = await callAPI<ContestStanding>("contest.standings", {
      contestId,
      from: 1,
      count: 1,
    });

    return {
      contest: response.contest,
      problems: response.problems,
    };
  },
};
