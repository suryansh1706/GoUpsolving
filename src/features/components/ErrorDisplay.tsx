/**
 * Error Display Component - Minimal
 * Shows error messages without styling
 */

import { AppError } from "../types/errors";

interface ErrorDisplayProps {
  error: Error | null;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  const message = error instanceof AppError ? error.message : error.message;

  return (
    <div style={{ padding: "1rem", backgroundColor: "#fee", color: "#c00", borderRadius: "4px" }}>
      <p>{message}</p>
    </div>
  );
}
