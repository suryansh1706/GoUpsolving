/**
 * Custom Error Types for Better Error Handling
 */

export enum ErrorType {
  CODEFORCES_API = "CODEFORCES_API",
  CODEFORCES_INVALID_USER = "CODEFORCES_INVALID_USER",
  CODEFORCES_RATE_LIMIT = "CODEFORCES_RATE_LIMIT",
  CODEFORCES_TIMEOUT = "CODEFORCES_TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  APPLICATION_ERROR = "APPLICATION_ERROR",
  CACHE_ERROR = "CACHE_ERROR",
}

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = "AppError";
  }

  isCodeforcesError(): boolean {
    return this.type.startsWith("CODEFORCES");
  }

  isNetworkError(): boolean {
    return this.type === ErrorType.NETWORK_ERROR;
  }

  isApplicationError(): boolean {
    return this.type === ErrorType.APPLICATION_ERROR;
  }
}

/**
 * Helper function to determine error type and message
 */
export function categorizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Codeforces API errors
    if (message.includes("codeforces")) {
      if (message.includes("not found") || message.includes("no such")) {
        return new AppError(
          ErrorType.CODEFORCES_INVALID_USER,
          "User not found on Codeforces",
          message
        );
      }
      if (message.includes("rate limit") || message.includes("too many")) {
        return new AppError(
          ErrorType.CODEFORCES_RATE_LIMIT,
          "Codeforces API rate limit exceeded. Please wait a moment and try again.",
          message
        );
      }
      if (message.includes("timeout")) {
        return new AppError(
          ErrorType.CODEFORCES_TIMEOUT,
          "Codeforces API request timed out. Please try again.",
          message
        );
      }
      return new AppError(
        ErrorType.CODEFORCES_API,
        `Codeforces API error: ${message}`,
        message
      );
    }

    // Network errors
    if (message.includes("fetch") || message.includes("network")) {
      return new AppError(
        ErrorType.NETWORK_ERROR,
        "Network error. Please check your internet connection.",
        message
      );
    }

    // Default to application error
    return new AppError(
      ErrorType.APPLICATION_ERROR,
      message,
      error.stack
    );
  }

  // Unknown error
  return new AppError(
    ErrorType.APPLICATION_ERROR,
    "An unexpected error occurred",
    String(error)
  );
}
