import { useState } from 'react';
import type { FormEvent } from 'react';
import Swal from 'sweetalert2';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { PageHeader } from '@common/components/ui/PageHeader';
import { api, getApiErrorMessage, getValidationErrors, type ApiEnvelope } from '@common/services/api';
import type { AuthUser } from '@common/types';
import { setCredentials } from '@auth/authSlice';

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);
  const [name, setName] = useState(user?.name ?? '');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const { data } = await api.put<ApiEnvelope<AuthUser>>('/profile', { name });
      if (token) {
        dispatch(setCredentials({ token, user: data.data }));
      }
      Swal.fire('Saved', 'Profile updated successfully.', 'success');
    } catch (error) {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      }
      Swal.fire('Unable to save', getApiErrorMessage(error, 'Please check your profile and try again.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordErrors({});

    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordErrors({ password_confirmation: ['Password confirmation does not match.'] });
      setChangingPassword(false);
      return;
    }

    try {
      await api.post('/auth/change-password', passwordForm);
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      Swal.fire('Saved', 'Password changed successfully.', 'success');
    } catch (error) {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setPasswordErrors(validationErrors);
      }
      Swal.fire('Unable to change password', getApiErrorMessage(error, 'Please check the password fields and try again.'), 'error');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" />
      <div className="card">
        <div className="card-body">
          <form className="row g-3" onSubmit={submit}>
            <div className="col-md-6">
              <label className="form-label">Name</label>
              <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={name} onChange={(event) => setName(event.target.value)} required />
              {errors.name?.[0] && <div className="invalid-feedback">{errors.name[0]}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input className="form-control" value={user?.email ?? ''} readOnly />
            </div>
            <div className="col-md-3">
              <button className="btn btn-success w-100" disabled={saving}><i className="bi bi-check2 me-1" /> {saving ? 'Saving...' : 'Save Profile'}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="card mt-3">
        <div className="card-body">
          <form className="row g-3" onSubmit={changePassword}>
            <div className="col-md-4">
              <label className="form-label">Current Password</label>
              <input className={`form-control ${passwordErrors.current_password ? 'is-invalid' : ''}`} value={passwordForm.current_password} onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })} type="password" required />
              {passwordErrors.current_password?.[0] && <div className="invalid-feedback">{passwordErrors.current_password[0]}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">New Password</label>
              <input className={`form-control ${passwordErrors.password ? 'is-invalid' : ''}`} value={passwordForm.password} onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })} type="password" required />
              {passwordErrors.password?.[0] && <div className="invalid-feedback">{passwordErrors.password[0]}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label">Confirm New Password</label>
              <input className={`form-control ${passwordErrors.password_confirmation ? 'is-invalid' : ''}`} value={passwordForm.password_confirmation} onChange={(event) => setPasswordForm({ ...passwordForm, password_confirmation: event.target.value })} type="password" required />
              {passwordErrors.password_confirmation?.[0] && <div className="invalid-feedback">{passwordErrors.password_confirmation[0]}</div>}
            </div>
            <div className="col-md-3">
              <button className="btn btn-outline-primary w-100" disabled={changingPassword}><i className="bi bi-key me-1" /> {changingPassword ? 'Changing...' : 'Change Password'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
