import { useEffect, useMemo, useState } from 'react';
import { Panel } from '@common/components/dashboard/Panel';
import { EmptyTableRow } from '@common/components/ui/EmptyTableRow';
import { PageHeader } from '@common/components/ui/PageHeader';
import { apiPage, getApiErrorMessage, toRows, type LaravelPage } from '@common/services/api';
import { adminApi } from '../../adminConfig';

type LogType = 'activities' | 'audits';

type LogRow = {
  id: number;
  description?: string;
  action?: string;
  subject_type?: string;
  subject_id?: number;
  auditable_type?: string;
  auditable_id?: number;
  causer?: { name?: string; email?: string } | null;
  user?: { name?: string; email?: string } | null;
  properties?: unknown;
  old_values?: unknown;
  new_values?: unknown;
  created_at?: string;
};

const columnCount = 5;

export function LogsPage({ type }: { type: LogType }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [pagination, setPagination] = useState<LaravelPage<LogRow>['meta']>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const title = type === 'activities' ? 'Activity Logs' : 'Audit Logs';
  const endpoint = adminApi.logs[type];

  const subtitle = useMemo(() => `${pagination?.total ?? rows.length} records`, [pagination?.total, rows.length]);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setAppliedSearch('');
  }, [type]);

  useEffect(() => {
    load();
  }, [endpoint, page, appliedSearch]);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const payload = await apiPage<LogRow>(endpoint, { page, per_page: 25, search: appliedSearch || undefined });
      setRows(toRows(payload));
      setPagination(payload.meta);
    } catch (requestError) {
      setRows([]);
      setPagination(undefined);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  return (
    <>
      <PageHeader title={title} />

      <form className="resource-filters" onSubmit={applyFilters}>
        <input
          data-testid={`admin-${type}-search`}
          className="form-control"
          placeholder={type === 'activities' ? 'Search description' : 'Search action'}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button data-testid={`admin-${type}-apply-search`} className="btn btn-primary" type="submit">
          <i className="bi bi-search me-1" /> Search
        </button>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      <Panel title={`${title} List`} subtitle={subtitle}>
        <div className="table-responsive">
          <table className="table table-hover resource-table mb-0" data-testid={`admin-${type}-table`}>
            <thead>
              <tr>
                <th>ID</th>
                <th>{type === 'activities' ? 'Description' : 'Action'}</th>
                <th>Subject</th>
                <th>User</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyTableRow colSpan={columnCount} message="Loading API data..." />}
              {!loading && rows.length === 0 && <EmptyTableRow colSpan={columnCount} message="No records found." />}
              {rows.map((row) => (
                <tr key={`${type}-${row.id}`}>
                  <td data-label="ID"><span className="id-pill">#{row.id}</span></td>
                  <td data-label={type === 'activities' ? 'Description' : 'Action'} className="fw-semibold">{row.description ?? row.action ?? '-'}</td>
                  <td data-label="Subject">{subjectLabel(row)}</td>
                  <td data-label="User">{row.user?.name ?? row.user?.email ?? row.causer?.name ?? row.causer?.email ?? '-'}</td>
                  <td data-label="Date">{formatDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <span>Page {pagination?.current_page ?? page} of {pagination?.last_page ?? 1}</span>
          <div>
            <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(Math.max(1, page - 1))}>Previous</button>
            <button className="btn btn-outline-secondary btn-sm" disabled={loading || page >= (pagination?.last_page ?? 1)} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </Panel>
    </>
  );
}

function subjectLabel(row: LogRow) {
  const type = row.subject_type ?? row.auditable_type;
  const id = row.subject_id ?? row.auditable_id;

  if (!type && !id) {
    return '-';
  }

  const subject = type?.split('\\').pop() ?? 'Record';
  return id ? `${subject} #${id}` : subject;
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
