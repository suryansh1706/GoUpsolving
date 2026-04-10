/**
 * Problems List Component
 */

import React from "react";
import { ProblemCard } from "./ProblemCard";
import type { UpsolveProblem } from "../types/codeforces";

interface ProblemsListProps {
  problems: UpsolveProblem[];
  isLoading: boolean;
  hasData: boolean;
}

export function ProblemsList({
  problems,
  isLoading,
  hasData,
}: ProblemsListProps) {
  return (
    <section className="problems-section">
      {problems.length > 0 ? (
        <div className="problems-list">
          {problems.map((problem) => (
            <ProblemCard
              key={`${problem.contestId}-${problem.index}`}
              problem={problem}
            />
          ))}
        </div>
      ) : hasData && problems.length === 0 ? (
        <div className="no-results">
          No problems match your filters. Try adjusting your criteria.
        </div>
      ) : hasData ? (
        <div className="no-results">
          No upsolve problems found. Great job! You've already solved or
          attempted all recent problems.
        </div>
      ) : null}
    </section>
  );
}
