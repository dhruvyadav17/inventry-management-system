type ResourceFiltersProps = {
  search: string;
  status: string;
  perPage: number;
  onPerPageChange: (value: number) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onApply: () => void;
};

export function ResourceFilters({ search, status, perPage, onPerPageChange, onSearchChange, onStatusChange, onApply }: ResourceFiltersProps) {
  return (
    <div className="card panel-card mb-3">
      <div className="card-body">
        <div className="row g-2 resource-filters">
          <div className="col-md-4">
            <input className="form-control" placeholder="Search" value={search} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
          <div className="col-md-3">
            <select className="form-select" value={status} onChange={(e) => onStatusChange(e.target.value)}>
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={perPage} onChange={(e) => onPerPageChange(Number(e.target.value))}>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-outline-primary w-100" title="Apply filters" aria-label="Apply filters" onClick={onApply}><i className="bi bi-search" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
