/**
 * Codeforces API Client Service
 * 
 * This service calls our Vercel proxy (/api/codeforces) which then
 * calls the actual Codeforces API. This avoids CORS issues.
 * 
 * Responses are cached for 5 minutes.
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

const API_PROXY = "/api/codeforces"; // Our Vercel serverless proxy

/**
 * HTTP Status Code Messages
 * Helps users understand what went wrong at a glance
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests - Rate Limited",
  500: "Codeforces Server Error - Their servers are having issues",
  502: "Bad Gateway - Unable to reach Codeforces",
  503: "Service Unavailable - Codeforces is temporarily down",
  504: "Gateway Timeout - Codeforces servers not responding",
};

/**
 * Get a user-friendly message for an HTTP status code
 */
function getStatusMessage(status: number): string {
  return HTTP_STATUS_MESSAGES[status] || "Unknown Error";
}

/**
 * Check if a Codeforces error message indicates "user not found"
 */
function isUserNotFoundError(comment: string): boolean {
  const lowerComment = comment.toLowerCase();
  return lowerComment.includes("not found") || lowerComment.includes("no such");
}

/**
 * Make an API call to our Vercel proxy
 * 
 * @param endpoint - Codeforces API endpoint (e.g., "user.rating")
 * @param params - Query parameters to pass
 * @returns The API response data
 * @throws AppError if the request fails
 */
async function callAPI<T>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<T> {
  // --- STEP 1: Check Cache ---
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  
  if (apiCache.has(cacheKey)) {
    console.log(`📦 Cache hit: ${endpoint}`);
    return apiCache.get(cacheKey);
  }

  // --- STEP 2: Build Request ---
  const queryParams = new URLSearchParams({
    endpoint,
    ...Object.entries(params).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: String(value),
    }), {}),
  });

  console.log(`🌐 Calling: ${endpoint}`);

  try {
    // --- STEP 3: Make Request ---
    const response = await fetch(`${API_PROXY}?${queryParams.toString()}`);

    // --- STEP 4: Check HTTP Status ---
    if (!response.ok) {
      const statusMessage = getStatusMessage(response.status);
      throw new AppError(
        ErrorType.CODEFORCES_API,
        `Codeforces API error: ${statusMessage} (Status ${response.status})`,
        `Failed to fetch from endpoint: ${endpoint}`
      );
    }

    // --- STEP 5: Parse Response ---
    const json = await response.json();

    // --- STEP 6: Check Codeforces Response Status ---
    if (json.status !== "OK") {
      const comment = json.comment || "";

      // Special case: user not found
      if (isUserNotFoundError(comment)) {
        throw new AppError(
          ErrorType.CODEFORCES_INVALID_USER,
          `User not found: ${comment}`,
          json.comment
        );
      }

      // General Codeforces API error
      throw new AppError(
        ErrorType.CODEFORCES_API,
        `Codeforces API error: ${comment || "Unknown error"}`,
        json.comment
      );
    }

    // --- STEP 7: Cache and Return ---
    apiCache.set(cacheKey, json.result);
    console.log(`✅ Success: ${endpoint}`);
    return json.result;

  } catch (error) {
    // --- ERROR HANDLING ---

    // Already an AppError - just throw it
    if (error instanceof AppError) {
      console.error(`❌ ${error.type}: ${error.message}`);
      throw error;
    }

    // Network/fetch error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error(`❌ Network Error: ${error.message}`);
      throw new AppError(
        ErrorType.NETWORK_ERROR,
        "Network error: Unable to reach Codeforces API. Please check your internet connection.",
        error.message
      );
    }

    // Unknown error - categorize it
    const appError = categorizeError(error);
    console.error(`❌ ${appError.type}: ${appError.message}`);
    throw appError;
  }
}

/**
 * Public API Methods
 */
export const codeforcesAPI = {
  /**
   * Get user's rating change history
   * Shows how their rating changed across contests
   */
  async getUserRatingHistory(handle: string): Promise<UserRatingChange[]> {
    return callAPI<UserRatingChange[]>("user.rating", { handle });
  },

  /**
   * Get all user submissions (accepted and attempted)
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
   * Get contest standings and problem information
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
      problems: response.problems,
    };
  },
};
