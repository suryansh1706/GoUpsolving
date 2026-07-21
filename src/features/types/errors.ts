/**
 * Custom Error Types for Better Error Handling
 */

export enum ErrorType {
  CODEFORCES_API = "CODEFORCES_API",
  CODEFORCES_INVALID_USER = "CODEFORCES_INVALID_USER",
  CODEFORCES_RATE_LIMIT = "CODEFORCES_RATE_LIMIT",
  CODEFORCES_TIMEOUT = "CODEFORCES_TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
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
}
