/**
 * Error Display Component
 */

interface ErrorDisplayProps {
  error: Error | null;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="error-message">
      <strong>Error:</strong> {error.message}
    </div>
  );
}
