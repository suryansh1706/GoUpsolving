/**
 * Problem Card Component
 */

import { useState } from "react";
import type { UpsolveProblem } from "../types/codeforces";
import { getRatingClass } from "../utils/problemAnalysis";

interface ProblemCardProps {
  problem: UpsolveProblem;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  const [showTags, setShowTags] = useState(false);
  const codeforcesUrl = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;

  const openProblem = () => {
    window.open(codeforcesUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      className={`problem-card status-${problem.status}`}
      role="link"
      tabIndex={0}
      onClick={openProblem}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProblem();
        }
      }}
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

      <div className="problem-actions">
        {problem.tags.length > 0 && (
          <button
            type="button"
            className="tags-toggle"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setShowTags((current) => !current);
            }}
            aria-expanded={showTags}
          >
            {showTags ? "Hide tags" : "View tags"}
          </button>
        )}
      </div>

      {showTags && problem.tags.length > 0 && (
        <div className="problem-tags">
          {problem.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
