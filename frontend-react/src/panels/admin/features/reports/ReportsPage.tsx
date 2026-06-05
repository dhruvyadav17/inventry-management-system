import { Panel } from '@common/components/dashboard/Panel';
import { MetricCard } from '@common/components/dashboard/MetricCard';
import { PageHeader } from '@common/components/ui/PageHeader';
import { useApiQuery } from '@common/hooks/useApiQuery';
import { adminApi } from '../../adminConfig';

type ReportStats = {
  stats?: Record<string, number>;
  recent_audits?: Array<{ id: number; action?: string; created_at?: string }>;
};

export function ReportsPage() {
  const { data } = useApiQuery<ReportStats>(adminApi.reports, { stats: {} });
  const stats = data.stats ?? {};
  const recentAudits = data.recent_audits ?? [];

  return (
    <>
      <PageHeader title="Reports" />
      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-xl-3"><MetricCard label="Total Users" value={stats.users ?? 0} icon="bi-people" tone="primary" /></div>
        <div className="col-sm-6 col-xl-3"><MetricCard label="Active Users" value={stats.active_users ?? 0} icon="bi-person-check" tone="success" /></div>
        <div className="col-sm-6 col-xl-3"><MetricCard label="Roles" value={stats.roles ?? 0} icon="bi-shield-lock" tone="info" /></div>
        <div className="col-sm-6 col-xl-3"><MetricCard label="Permissions" value={stats.permissions ?? 0} icon="bi-key" tone="warning" /></div>
      </div>
      <Panel title="Admin Activity Report" subtitle={`${recentAudits.length} entries`}>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>ID</th><th>Action</th><th>Date</th></tr></thead>
            <tbody>
              {recentAudits.length === 0 && <tr><td colSpan={3} className="empty-cell">No audit entries yet.</td></tr>}
              {recentAudits.map((audit) => (
                <tr key={audit.id}>
                  <td><span className="id-pill">#{audit.id}</span></td>
                  <td className="fw-semibold">{audit.action ?? 'Activity'}</td>
                  <td>{audit.created_at ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
