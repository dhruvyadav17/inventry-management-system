import { MetricCard } from '@common/components/dashboard/MetricCard';
import { Panel } from '@common/components/dashboard/Panel';
import { PageHeader } from '@common/components/ui/PageHeader';
import { useApiQuery } from '@common/hooks/useApiQuery';
import { adminApi } from '../../adminConfig';

type Stats = {
  stats?: Record<string, number>;
  recent_audits?: Array<{ id: number; action?: string; created_at?: string }>;
};

export function DashboardPage({ title = 'Dashboard' }: { title?: string }) {
  const { data } = useApiQuery<Stats>(adminApi.dashboard, { stats: {} });

  const stats = data.stats ?? {};
  const recentAudits = data.recent_audits ?? [];
  const cards = [
    { value: stats.users ?? 0, label: 'Total Users', icon: 'bi-people', tone: 'primary' },
    { value: stats.active_users ?? 0, label: 'Active Users', icon: 'bi-person-check', tone: 'success' },
    { value: stats.roles ?? 0, label: 'Roles', icon: 'bi-shield-lock', tone: 'info' },
    { value: stats.permissions ?? 0, label: 'Permissions', icon: 'bi-key', tone: 'warning' },
    { value: stats.deleted_users ?? 0, label: 'Archived Users', icon: 'bi-archive', tone: 'danger' },
  ];

  return (
    <>
      <PageHeader title={title} />

      <div className="row g-3 mb-3 dashboard-metrics">
        {cards.map((card) => (
          <div className="col-sm-6 col-xl" key={card.label}>
            <MetricCard {...card} />
          </div>
        ))}
      </div>

      <Panel title="Recent Audits">
        <div className="audit-list">
          {recentAudits.length === 0 && <div className="empty-inline">No audit entries yet.</div>}
          {recentAudits.slice(0, 8).map((audit) => (
            <div className="audit-item" key={audit.id}>
              <span>#{audit.id}</span>
              <strong>{audit.action ?? 'Activity'}</strong>
              <small>{audit.created_at ?? '-'}</small>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
