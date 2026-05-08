/**
 * Search Form Component
 */

import React from "react";

interface SearchFormProps {
  handle: string;
  onHandleChange: (value: string) => void;
  onSearch: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
}

export function SearchForm({
  handle,
  onHandleChange,
  onSearch,
  loading,
}: SearchFormProps) {
  return (
    <section className="search-section">
      <form onSubmit={onSearch}>
        <div className="input-group">
          <input
            type="text"
            value={handle}
            onChange={(e) => onHandleChange(e.target.value)}
            placeholder="Enter your Codeforces handle..."
            className="search-input"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !handle.trim()}
            className="search-button"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
      </form>
    </section>
  );
}
