import { useState } from 'react';
import type { FormEvent } from 'react';
import Swal from 'sweetalert2';
import { Panel } from '@common/components/dashboard/Panel';
import { Can, useCan } from '@common/rbac/ProtectedRoute';
import { EmptyTableRow } from '@common/components/ui/EmptyTableRow';
import { IconButton } from '@common/components/ui/IconButton';
import { PageHeader } from '@common/components/ui/PageHeader';
import { StatusBadge } from '@common/components/ui/StatusBadge';
import { api, getApiErrorMessage, getValidationErrors } from '@common/services/api';
import type { ResourceName } from '@common/types';
import { emptyResourceForm, ResourceForm } from './ResourceForm';
import { ResourceFilters } from './ResourceFilters';
import { useResourceOptions } from './useResourceOptions';
import { useResourceRecords } from './useResourceRecords';

export function ResourcePage({ resource }: { resource: ResourceName }) {
  const [form, setForm] = useState(emptyResourceForm);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [formOpen, setFormOpen] = useState(false);
  const {
    applyFilters,
    endpoint,
    error,
    load,
    loading,
    page,
    pagination,
    perPage,
    rows,
    search,
    setPage,
    setPerPage,
    setSearch,
    setStatus,
    sort,
    sortBy,
    sortDir,
    status,
    title,
    config,
  } = useResourceRecords(resource);
  const { roles, permissions, loadOptions } = useResourceOptions();
  const canRestore = useCan(`${resource}.restore`);
  const canUpdate = useCan(`${resource}.update`);
  const canDelete = useCan(`${resource}.delete`);
  const columnCount = config.columnCount;

  async function save(event: FormEvent) {
    event.preventDefault();
    setFormErrors({});
    const payload = {
      name: form.name,
      status: form.status,
      ...(resource === 'users' ? { email: form.email, password: form.password, password_confirmation: form.password_confirmation, roles: form.roles } : {}),
      ...(resource === 'roles' ? { permissions: form.permissions } : {}),
    };

    try {
      if (form.id) {
        await api.put(`${endpoint}/${form.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setForm(emptyResourceForm);
      setFormOpen(false);
      await load();
      loadOptions();
      Swal.fire('Saved', `${config.singular} saved successfully.`, 'success');
    } catch (error) {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setFormErrors(validationErrors);
      }
      Swal.fire('Unable to save', getApiErrorMessage(error, 'Please check the form and try again.'), 'error');
    }
  }

  async function remove(id: number) {
    const confirm = await Swal.fire({ title: 'Archive record?', text: 'This record will move to archived list.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Archive' });
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      await load();
    } catch (error) {
      Swal.fire('Unable to delete', getApiErrorMessage(error), 'error');
    }
  }

  async function restore(id: number) {
    try {
      await api.post(`${endpoint}/${id}/restore`);
      await load();
    } catch (error) {
      Swal.fire('Unable to restore', getApiErrorMessage(error), 'error');
    }
  }

  function openCreateForm() {
    loadOptions();
    setForm(emptyResourceForm);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEditForm(row: typeof rows[number]) {
    loadOptions();
    setFormErrors({});
    setForm({ ...emptyResourceForm, id: row.id, name: row.name, email: row.email ?? '', status: row.status, roles: row.roles ?? [], permissions: row.permissions ?? [] });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setForm(emptyResourceForm);
    setFormErrors({});
  }

  return (
    <>
      <PageHeader
        title={title}
        action={(
          <Can permission={`${resource}.create`}>
            <button data-testid={`admin-${resource}-new`} className="btn btn-primary" onClick={openCreateForm}>
              <i className="bi bi-plus-lg me-1" /> New
            </button>
          </Can>
        )}
      />

      {formOpen && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal admin-modal d-block" tabIndex={-1} role="dialog" aria-modal="true" data-testid={`admin-${resource}-modal`}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <ResourceForm resource={resource} singular={config.singular} form={form} errors={formErrors} roleOptions={roles} permissionOptions={permissions} onCancel={closeForm} onChange={(value) => { setForm(value); setFormErrors({}); }} onSubmit={save} />
              </div>
            </div>
          </div>
        </>
      )}

      <ResourceFilters search={search} status={status} perPage={perPage} onPerPageChange={setPerPage} onSearchChange={setSearch} onStatusChange={setStatus} onApply={applyFilters} />

      {error && <div className="alert alert-danger">{error}</div>}

      <Panel title={`${title} List`} subtitle={`${pagination?.total ?? rows.length} records`}>
        <div className="table-responsive">
          <table className="table table-hover resource-table mb-0" data-testid={`admin-${resource}-table`}>
            <thead>
              <tr>
                <th><button className="table-sort" onClick={() => sort('id')}>ID {sortBy === 'id' && <i className={`bi bi-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} />}</button></th>
                <th><button className="table-sort" onClick={() => sort('name')}>Name {sortBy === 'name' && <i className={`bi bi-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} />}</button></th>
                {resource === 'users' && <th><button className="table-sort" onClick={() => sort('email')}>Email {sortBy === 'email' && <i className={`bi bi-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} />}</button></th>}
                {resource !== 'permissions' && <th>{resource === 'users' ? 'Roles' : 'Permissions'}</th>}
                <th><button className="table-sort" onClick={() => sort('status')}>Status {sortBy === 'status' && <i className={`bi bi-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} />}</button></th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyTableRow colSpan={columnCount} message="Loading API data..." />}
              {!loading && rows.length === 0 && <EmptyTableRow colSpan={columnCount} message="No records found." />}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="ID"><span className="id-pill">#{row.id}</span></td>
                  <td className="fw-semibold" data-label="Name">{row.name}</td>
                  {resource === 'users' && <td data-label="Email">{row.email}</td>}
                  {resource !== 'permissions' && (
                    <td data-label={resource === 'users' ? 'Roles' : 'Permissions'}>
                      {(resource === 'users' ? row.roles : row.permissions)?.slice(0, 3).map((item) => <span className="tag-pill" key={item}>{item}</span>) ?? <span className="text-secondary">-</span>}
                    </td>
                  )}
                  <td data-label="Status"><StatusBadge status={row.status} /></td>
                  <td className="text-end" data-label="Actions">
                    {row.status === 'archived' ? (
                      canRestore ? (
                        <button className="btn btn-outline-success btn-sm" onClick={() => restore(row.id)}><i className="bi bi-arrow-counterclockwise me-1" /> Restore</button>
                      ) : (
                        <span className="text-secondary small">Archived</span>
                      )
                    ) : (
                      canUpdate || canDelete ? (
                        <>
                        <Can permission={`${resource}.update`}>
                          <IconButton icon="bi-pencil" className="me-1" title="Edit" aria-label={`Edit ${row.name}`} data-testid={`admin-${resource}-edit-${row.id}`} onClick={() => openEditForm(row)} />
                        </Can>
                        <Can permission={`${resource}.delete`}>
                          <IconButton icon="bi-archive" tone="danger" title="Archive" aria-label={`Archive ${row.name}`} data-testid={`admin-${resource}-archive-${row.id}`} onClick={() => remove(row.id)} />
                        </Can>
                        </>
                      ) : (
                        <span className="text-secondary small">No actions</span>
                      )
                    )}
                  </td>
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
