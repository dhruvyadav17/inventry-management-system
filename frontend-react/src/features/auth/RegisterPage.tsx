import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAppDispatch } from '@app/hooks';
import { api, getApiErrorMessage, getValidationErrors, type ApiEnvelope } from '@common/services/api';
import type { AuthUser } from '@common/types';
import { setCredentials } from './authSlice';

type AuthResponse = {
  token: string;
  token_type: string;
  user: AuthUser;
};

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: ['Password confirmation does not match.'] });
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/register', form);
      dispatch(setCredentials({ token: data.data.token, user: data.data.user }));
      navigate('/dashboard');
    } catch (error) {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      }
      Swal.fire('Registration failed', getApiErrorMessage(error, 'Please check the form and try again.'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-box card">
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Create Account</h1>
          <p className="text-secondary mb-4">Register a new inventory admin account.</p>
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              {errors.name?.[0] && <div className="invalid-feedback">{errors.name[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" required />
              {errors.email?.[0] && <div className="invalid-feedback">{errors.email[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input className={`form-control ${errors.password ? 'is-invalid' : ''}`} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} type="password" required />
              {errors.password?.[0] && <div className="invalid-feedback">{errors.password[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <input className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`} value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} type="password" required />
              {errors.password_confirmation?.[0] && <div className="invalid-feedback">{errors.password_confirmation[0]}</div>}
            </div>
            <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
            <div className="auth-links auth-links-center">
              <Link to="/login">Back to login</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
