import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Swal from 'sweetalert2';
import { PageHeader } from '../../components/ui/PageHeader';
import { api, apiGet, getApiErrorMessage, getValidationErrors } from '../../services/api';

export function SettingsPage() {
  const [form, setForm] = useState({ app_name: '', timezone: '' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Record<string, string>>('/settings')
      .then((settings) => {
        setForm({
          app_name: String(settings.app_name ?? 'Inventory Admin Panel'),
          timezone: String(settings.timezone ?? 'UTC'),
        });
      })
      .catch(() => setForm({ app_name: 'Inventory Admin Panel', timezone: 'UTC' }))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    try {
      await api.put('/settings', { settings: form });
      Swal.fire('Saved', 'Settings updated successfully.', 'success');
    } catch (error) {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      }
      Swal.fire('Unable to save', getApiErrorMessage(error, 'Please check settings and try again.'), 'error');
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="card panel-card">
        <div className="card-header">
          <h3>Application Settings</h3>
          <span>{loading ? 'Loading...' : 'Ready'}</span>
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label">Application Name</label>
              <input className={`form-control ${fieldError(errors, 'settings.app_name') ? 'is-invalid' : ''}`} value={form.app_name} onChange={(event) => setForm({ ...form, app_name: event.target.value })} />
              {fieldError(errors, 'settings.app_name') && <div className="invalid-feedback">{fieldError(errors, 'settings.app_name')}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">Timezone</label>
              <input className={`form-control ${fieldError(errors, 'settings.timezone') ? 'is-invalid' : ''}`} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
              {fieldError(errors, 'settings.timezone') && <div className="invalid-feedback">{fieldError(errors, 'settings.timezone')}</div>}
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-success w-100"><i className="bi bi-check2 me-1" /> Save</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function fieldError(errors: Record<string, string[]>, field: string) {
  return errors[field]?.[0];
}
