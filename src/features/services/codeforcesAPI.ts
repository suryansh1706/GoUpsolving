/**
 * Codeforces API Client Service
 *
 * Calls the Codeforces API directly from the browser (no server proxy).
 * This avoids Cloudflare bot-detection which blocks server-side requests
 * from Vercel datacenter IPs.
 *
 * Browser requests work because:
 * 1. The user's browser already has a valid Cloudflare clearance cookie
 *    from visiting codeforces.com normally.
 * 2. CF API supports CORS for GET requests — no proxy needed.
 *
 * Responses are cached in-memory for 5 minutes.
 */

import { apiCache } from "./cache";
import { AppError, ErrorType } from "../types/errors";
import type {
  UserRatingChange,
  Submission,
  Contest,
  ContestStanding,
  ProblemInfo,
} from "../types/codeforces";

const CF_API = "https://codeforces.com/api";
const REQUEST_TIMEOUT = 15000;

/**
 * Make a direct GET request to the Codeforces API from the browser.
 * Uses fetch with an AbortController timeout.
 */
async function callAPI<T>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<T> {
  // --- Cache check ---
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  // --- Build URL ---
  const url = new URL(`${CF_API}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  // --- Fetch with timeout ---
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      // These headers make the request look more like a real browser visit,
      // which helps pass Cloudflare checks in case cookies aren't present.
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      throw new AppError(
        ErrorType.CODEFORCES_TIMEOUT,
        "Request timed out. Codeforces may be slow — try again.",
        String(err)
      );
    }
    throw new AppError(
      ErrorType.NETWORK_ERROR,
      "Network error: unable to reach Codeforces. Check your internet connection.",
      String(err)
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // --- Check HTTP status ---
  if (!response.ok) {
    // 403 most likely means Cloudflare blocked the request.
    // In that case, surface a clear message instead of a generic API error.
    if (response.status === 403) {
      throw new AppError(
        ErrorType.CODEFORCES_API,
        "Codeforces blocked the request (Cloudflare 403). " +
          "Please open codeforces.com in this browser tab first, then try again.",
        `HTTP 403 for ${endpoint}`
      );
    }
    if (response.status === 429) {
      throw new AppError(
        ErrorType.CODEFORCES_RATE_LIMIT,
        "Codeforces rate limit hit. Wait a minute and try again.",
        `HTTP 429 for ${endpoint}`
      );
    }
    throw new AppError(
      ErrorType.CODEFORCES_API,
      `Codeforces returned HTTP ${response.status} for ${endpoint}`,
      await response.text().catch(() => "")
    );
  }

  // --- Parse JSON ---
  let json: any;
  try {
    json = await response.json();
  } catch (parseErr) {
    const preview = (await response.text().catch(() => "")).slice(0, 300);
    // If we got HTML back it's almost certainly a Cloudflare challenge page.
    const isCloudflare =
      preview.includes("cloudflare") || preview.startsWith("<!DOCTYPE");
    throw new AppError(
      ErrorType.CODEFORCES_API,
      isCloudflare
        ? "Cloudflare is blocking the API request. Open codeforces.com in this tab first, then retry."
        : `Could not parse Codeforces response as JSON. Preview: ${preview.slice(0, 100)}`,
      String(parseErr)
    );
  }

  // --- Check CF response status ---
  if (json.status !== "OK") {
    const comment: string = json.comment || "";
    if (/not found|no such/i.test(comment)) {
      throw new AppError(
        ErrorType.CODEFORCES_INVALID_USER,
        `User not found: ${comment}`,
        comment
      );
    }
    throw new AppError(
      ErrorType.CODEFORCES_API,
      `Codeforces API error: ${comment || "Unknown error"}`,
      comment
    );
  }

  // --- Cache and return ---
  apiCache.set(cacheKey, json.result);
  return json.result as T;
}

/**
 * Public API methods — same interface as before, no changes needed in callers.
 */
export const codeforcesAPI = {
  async getUserRatingHistory(handle: string): Promise<UserRatingChange[]> {
    return callAPI<UserRatingChange[]>("user.rating", { handle });
  },

  async getUserSubmissions(handle: string): Promise<Submission[]> {
    return callAPI<Submission[]>("user.status", { handle });
  },

  async getContestList(): Promise<Contest[]> {
    return callAPI<Contest[]>("contest.list", {});
  },

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