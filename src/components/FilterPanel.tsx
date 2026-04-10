/**
 * Filter Panel Component
 * 
 * Provides UI controls for filtering and sorting problems:
 * - Filter by status (All, Not Attempted, Attempted, Upsolved)
 * - Filter by rating range
 * - Sort by rating, name, or status
 * - Filter by tags
 */

import React from "react";
import type { ProblemFilters } from "../types/codeforces";

interface FilterPanelProps {
  filters: ProblemFilters;
  onFiltersChange: (filters: ProblemFilters) => void;
  sortBy: "rating" | "name" | "status";
  onSortChange: (sort: "rating" | "name" | "status") => void;
  availableTags: string[];
}

export function FilterPanel({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  availableTags,
}: FilterPanelProps) {
  // ===== Status Filter =====
  const renderStatusFilter = () => (
    <div className="filter-group">
      <label>Status:</label>
      <select
        value={filters.status}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            status: e.target.value as ProblemFilters["status"],
          })
        }
      >
        <option value="all">All</option>
        <option value="not_attempted">Not Attempted</option>
        <option value="attempted">Attempted</option>
        <option value="upsolved">Upsolved</option>
      </select>
    </div>
  );

  // ===== Rating Range Filter =====
  const renderRatingFilter = () => (
    <div className="filter-group">
      <label>Rating Range:</label>
      <input
        type="number"
        value={filters.minRating}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            minRating: Math.max(0, parseInt(e.target.value) || 0),
          })
        }
        placeholder="Min"
        className="filter-input"
        min="0"
      />
      <span>-</span>
      <input
        type="number"
        value={filters.maxRating}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            maxRating: Math.max(
              filters.minRating,
              parseInt(e.target.value) || 3500
            ),
          })
        }
        placeholder="Max"
        className="filter-input"
        min={filters.minRating}
      />
    </div>
  );

  // ===== Sort By Filter =====
  const renderSortFilter = () => (
    <div className="filter-group">
      <label>Sort By:</label>
      <select value={sortBy} onChange={(e) => onSortChange(e.target.value as any)}>
        <option value="rating">Rating (Low to High)</option>
        <option value="name">Problem Name</option>
        <option value="status">Status</option>
      </select>
    </div>
  );

  // ===== Tags Filter =====
  const renderTagsFilter = () => {
    if (availableTags.length === 0) return null;

    return (
      <div className="filter-group">
        <label>Tags:</label>
        <div className="tag-filter">
          {availableTags.map((tag: string) => (
            <label key={tag} className="tag-checkbox">
              <input
                type="checkbox"
                checked={filters.tags.includes(tag)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onFiltersChange({
                      ...filters,
                      tags: [...filters.tags, tag],
                    });
                  } else {
                    onFiltersChange({
                      ...filters,
                      tags: filters.tags.filter((t) => t !== tag),
                    });
                  }
                }}
              />
              {tag}
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="filters-section">
      {renderStatusFilter()}
      {renderRatingFilter()}
      {renderSortFilter()}
      {renderTagsFilter()}
    </section>
  );
}
