import { useMemo } from 'react';
import type { FormEvent } from 'react';
import type { ResourceName, ResourceRecord, Status } from '@common/types';

export type ResourceFormState = {
  id: number;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  status: Status;
  roles: string[];
  permissions: string[];
};

type ResourceFormProps = {
  resource: ResourceName;
  singular: string;
  form: ResourceFormState;
  errors: Record<string, string[]>;
  roleOptions: ResourceRecord[];
  permissionOptions: ResourceRecord[];
  onCancel: () => void;
  onChange: (form: ResourceFormState) => void;
  onSubmit: (event: FormEvent) => void;
};

export const emptyResourceForm: ResourceFormState = {
  id: 0,
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  status: 'active',
  roles: [],
  permissions: [],
};

function errorFor(errors: Record<string, string[]>, field: string) {
  return errors[field]?.[0];
}

export function ResourceForm({ resource, singular, form, errors, roleOptions, permissionOptions, onCancel, onChange, onSubmit }: ResourceFormProps) {
  const permissionGroups = useMemo(() => groupPermissions(permissionOptions), [permissionOptions]);

  function toggleList(field: 'roles' | 'permissions', value: string) {
    const selected = form[field].includes(value)
      ? form[field].filter((item) => item !== value)
      : [...form[field], value];
    onChange({ ...form, [field]: selected });
  }

  function togglePermissionGroup(values: string[]) {
    const allSelected = values.every((value) => form.permissions.includes(value));
    const next = allSelected
      ? form.permissions.filter((value) => !values.includes(value))
      : Array.from(new Set([...form.permissions, ...values]));
    onChange({ ...form, permissions: next });
  }

  return (
    <form className="resource-form" onSubmit={onSubmit}>
      <div className="modal-header">
        <div>
          <h5 className="modal-title">{form.id ? `Edit ${singular}` : `Create ${singular}`}</h5>
          <small className="text-secondary">Validated through Laravel Form Requests</small>
        </div>
        <button type="button" className="btn-close" aria-label="Close" onClick={onCancel} />
      </div>
      <div className="modal-body">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label">Name</label>
            <input className={`form-control ${errorFor(errors, 'name') ? 'is-invalid' : ''}`} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} required />
            {errorFor(errors, 'name') && <div className="invalid-feedback">{errorFor(errors, 'name')}</div>}
          </div>
          {resource === 'users' && (
            <>
              <div className="col-md-3">
                <label className="form-label">Email</label>
                <input className={`form-control ${errorFor(errors, 'email') ? 'is-invalid' : ''}`} type="email" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} required />
                {errorFor(errors, 'email') && <div className="invalid-feedback">{errorFor(errors, 'email')}</div>}
              </div>
              <div className="col-md-2">
                <label className="form-label">Password</label>
                <input className={`form-control ${errorFor(errors, 'password') ? 'is-invalid' : ''}`} type="password" value={form.password} onChange={(e) => onChange({ ...form, password: e.target.value, password_confirmation: e.target.value })} required={!form.id} />
                {errorFor(errors, 'password') && <div className="invalid-feedback">{errorFor(errors, 'password')}</div>}
              </div>
              <div className="col-md-3">
                <label className="form-label">Roles</label>
                <div className={`check-list ${errorFor(errors, 'roles') ? 'is-invalid-box' : ''}`}>
                  {roleOptions.map((role) => (
                    <label className="check-item" key={role.id}>
                      <input type="checkbox" checked={form.roles.includes(role.name)} onChange={() => toggleList('roles', role.name)} />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
                {errorFor(errors, 'roles') && <div className="invalid-feedback d-block">{errorFor(errors, 'roles')}</div>}
              </div>
            </>
          )}
          {resource === 'roles' && (
            <div className="col-md-5">
              <label className="form-label">Permissions</label>
              <div className={`permission-groups ${errorFor(errors, 'permissions') ? 'is-invalid-box' : ''}`}>
                {permissionGroups.map((group) => (
                  <div className="permission-group" key={group.name}>
                    <button type="button" onClick={() => togglePermissionGroup(group.values)}>{group.name}</button>
                    <div>
                      {group.items.map((permission) => (
                        <label className="check-item" key={permission.id}>
                          <input type="checkbox" checked={form.permissions.includes(permission.name)} onChange={() => toggleList('permissions', permission.name)} />
                          <span>{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {errorFor(errors, 'permissions') && <div className="invalid-feedback d-block">{errorFor(errors, 'permissions')}</div>}
            </div>
          )}
          <div className="col-md-2">
            <label className="form-label">Status</label>
            <select className={`form-select ${errorFor(errors, 'status') ? 'is-invalid' : ''}`} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as Status })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {errorFor(errors, 'status') && <div className="invalid-feedback">{errorFor(errors, 'status')}</div>}
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-success"><i className="bi bi-check2 me-1" /> Save</button>
      </div>
    </form>
  );
}

function groupPermissions(permissions: ResourceRecord[]) {
  const groups = permissions.reduce<Record<string, ResourceRecord[]>>((carry, permission) => {
    const group = permission.name.split('.')[0] || 'general';
    carry[group] = [...(carry[group] ?? []), permission];
    return carry;
  }, {});

  return Object.entries(groups).map(([name, items]) => ({
    name,
    items,
    values: items.map((item) => item.name),
  }));
}
