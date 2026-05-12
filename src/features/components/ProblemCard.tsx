/**
 * Problem Card Component
 */

import type { UpsolveProblem } from "../types/codeforces";
import { getRatingClass } from "../utils/problemAnalysis";

interface ProblemCardProps {
  problem: UpsolveProblem;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  const codeforcesUrl = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;

  return (
    <a
      href={codeforcesUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`problem-card status-${problem.status}`}
    >
      <div className="problem-header">
        <h3 className="problem-name">{problem.name}</h3>
        <span className={`status-badge status-${problem.status}`}>
          {problem.status}
        </span>
      </div>

      <div className="problem-meta">
        <span className="problem-id">
          Contest {problem.contestId} · Problem {problem.index}
        </span>
        {problem.rating && (
          <span
            className={`problem-rating rating-${getRatingClass(
              problem.rating
            )}`}
          >
            {problem.rating}
          </span>
        )}
      </div>

      {problem.tags.length > 0 && (
        <div className="problem-tags">
          {problem.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
