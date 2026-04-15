/**
 * Codeforces API Service
 * Routes through Vercel serverless function to avoid CORS issues
 */

import { apiCache } from "./cache";
import { AppError, ErrorType, categorizeError } from "../types/errors";
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
      const statusMessage = getStatusMessage(response.status);
      throw new AppError(
        ErrorType.CODEFORCES_API,
        `Codeforces API error: ${statusMessage} (Status ${response.status})`,
        `Failed to fetch from endpoint: ${endpoint}`
      );
    }

    const json = await response.json();

    if (json.status !== "OK") {
      // Check if it's a user not found error
      const comment = json.comment || "";
      if (comment.toLowerCase().includes("not found") || comment.toLowerCase().includes("no such")) {
        throw new AppError(
          ErrorType.CODEFORCES_INVALID_USER,
          `User not found: ${comment}`,
          json.comment
        );
      }

      throw new AppError(
        ErrorType.CODEFORCES_API,
        `Codeforces API error: ${json.comment || "Unknown error"}`,
        json.comment
      );
    }

    apiCache.set(cacheKey, json.result);
    return json.result;
  } catch (error) {
    if (error instanceof AppError) {
      console.error(`❌ Codeforces API Error (${endpoint}):`, error.message);
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error(`❌ Network Error (${endpoint}):`, error.message);
      throw new AppError(
        ErrorType.NETWORK_ERROR,
        "Network error: Unable to reach Codeforces API. Please check your internet connection.",
        error.message
      );
    }

    const appError = categorizeError(error);
    console.error(`❌ Error (${endpoint}):`, appError.message);
    throw appError;
  }
}

/**
 * Get user-friendly message for HTTP status codes
 */
function getStatusMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    429: "Too Many Requests - Rate Limited",
    500: "Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return messages[status] || "Unknown Error";
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
