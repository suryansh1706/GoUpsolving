/**
 * Statistics Cards Component
 */

interface StatsSectionProps {
  stats: {
    total: number;
    attempted: number;
  };
  onRefresh: () => Promise<void>;
}

export function StatsSection({
  stats,
  onRefresh,
}: StatsSectionProps) {
  return (
    <section className="stats-section">
      <div className="stat-card">
        <span className="stat-label">Total Problems</span>
        <span className="stat-value">{stats.total}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Attempted</span>
        <span className="stat-value">{stats.attempted}</span>
      </div>
      <button onClick={onRefresh} className="refresh-button">
        Refresh Data
      </button>
    </section>
  );
}
