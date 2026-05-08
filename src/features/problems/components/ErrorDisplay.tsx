/**
 * Error Display Component
 * Shows different messages based on error type
 */

import { AppError, ErrorType } from "../types/errors";

interface ErrorDisplayProps {
  error: Error | null;
}

function getErrorContent(error: Error) {
  if (error instanceof AppError) {
    return getErrorContentByType(error.type, error.message);
  }

  // Fallback for generic errors
  return {
    title: "An Error Occurred",
    icon: "⚠️",
    message: error.message,
    detail: error.stack || error.message,
    className: "error-message error-generic",
    suggestion: "Please try again or contact support if the issue persists.",
  };
}

function getErrorContentByType(type: ErrorType, message: string) {
  const errorConfigs: Record<ErrorType, ReturnType<typeof createErrorConfig>> = {
    [ErrorType.CODEFORCES_API]: createErrorConfig(
      "🔗 Codeforces Server Issue",
      "Codeforces API is experiencing problems on their end. This is NOT an issue with our application.",
      message,
      "error-codeforces"
    ),

    [ErrorType.CODEFORCES_INVALID_USER]: createErrorConfig(
      "👤 User Not Found",
      "The Codeforces user could not be found. Please check the username and try again.",
      message,
      "error-codeforces"
    ),

    [ErrorType.CODEFORCES_RATE_LIMIT]: createErrorConfig(
      "⏱️ Rate Limited",
      "Codeforces API rate limit has been exceeded. Please wait a few moments and try again.",
      message,
      "error-codeforces-critical"
    ),

    [ErrorType.CODEFORCES_TIMEOUT]: createErrorConfig(
      "⏳ Request Timeout",
      "The request to Codeforces took too long. Their servers may be slow. Try again in a moment.",
      message,
      "error-codeforces"
    ),

    [ErrorType.NETWORK_ERROR]: createErrorConfig(
      "📡 Network Error",
      "Unable to reach Codeforces. Please check your internet connection.",
      message,
      "error-network"
    ),

    [ErrorType.APPLICATION_ERROR]: createErrorConfig(
      "⚙️ Application Error",
      "An error occurred while processing your request. This is likely a bug in our application.",
      message,
      "error-app"
    ),

    [ErrorType.CACHE_ERROR]: createErrorConfig(
      "💾 Cache Error",
      "An error occurred while managing cached data.",
      message,
      "error-cache"
    ),
  };

  return errorConfigs[type];
}

function createErrorConfig(title: string, mainMessage: string, detailMessage: string, className: string) {
  return {
    title,
    icon: getIconForTitle(title),
    message: mainMessage,
    detail: detailMessage,
    className: `error-message ${className}`,
    suggestion: getSuggestionForError(title),
  };
}

function getIconForTitle(title: string): string {
  if (title.includes("Codeforces")) return "🔗";
  if (title.includes("User")) return "👤";
  if (title.includes("Rate")) return "⏱️";
  if (title.includes("Timeout")) return "⏳";
  if (title.includes("Network")) return "📡";
  if (title.includes("Application")) return "⚙️";
  if (title.includes("Cache")) return "💾";
  return "⚠️";
}

function getSuggestionForError(title: string): string {
  if (title.includes("Server Issue")) return "Wait a few minutes and try again. Check if codeforces.com is working.";
  if (title.includes("User")) return "Try again with a different username.";
  if (title.includes("Rate")) return "Wait a minute and try again.";
  if (title.includes("Timeout")) return "Wait a moment and try again. Codeforces may be experiencing high load.";
  if (title.includes("Network")) return "Check your internet connection and try again.";
  if (title.includes("Codeforces")) return "This is a Codeforces issue, not our app. Try again later.";
  return "Please try again or contact support.";
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  const content = getErrorContent(error);

  return (
    <div className={content.className}>
      <div className="error-header">
        <span className="error-icon">{content.icon}</span>
        <strong className="error-title">{content.title}</strong>
      </div>
      
      <p className="error-main-message">{content.message}</p>
      
      {content.detail && (
        <details className="error-details">
          <summary>Technical details</summary>
          <pre className="error-detail-text">{content.detail}</pre>
        </details>
      )}
      
      {content.suggestion && (
        <p className="error-suggestion">{content.suggestion}</p>
      )}
    </div>
  );
}
