/**
 * Statistics Cards Component
 */

interface StatsSectionProps {
  stats: {
    total: number;
    attempted: number;
    upsolved: number;
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
      <div className="stat-card">
        <span className="stat-label">Upsolved</span>
        <span className="stat-value">{stats.upsolved}</span>
      </div>
      <button onClick={onRefresh} className="refresh-button">
        Refresh Data
      </button>
    </section>
  );
}
