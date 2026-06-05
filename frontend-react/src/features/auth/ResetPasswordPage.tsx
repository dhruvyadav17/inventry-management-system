import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, getApiErrorMessage, getValidationErrors } from '@common/services/api';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') ?? '', [searchParams]);
  const initialToken = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [form, setForm] = useState({ email: initialEmail, token: initialToken, password: '', password_confirmation: '' });
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
      await api.post('/auth/reset-password', form);
      await Swal.fire('Password reset', 'You can now sign in with the new password.', 'success');
      navigate('/login');
    } catch (error) {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      }
      Swal.fire('Unable to reset password', getApiErrorMessage(error, 'Please check the reset details and try again.'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-box card">
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Reset Password</h1>
          <p className="text-secondary mb-4">Set a new password using your reset token.</p>
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" required />
              {errors.email?.[0] && <div className="invalid-feedback">{errors.email[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Reset Token</label>
              <input className={`form-control ${errors.token ? 'is-invalid' : ''}`} value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} required />
              {errors.token?.[0] && <div className="invalid-feedback">{errors.token[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input className={`form-control ${errors.password ? 'is-invalid' : ''}`} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} type="password" required />
              {errors.password?.[0] && <div className="invalid-feedback">{errors.password[0]}</div>}
            </div>
            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <input className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`} value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} type="password" required />
              {errors.password_confirmation?.[0] && <div className="invalid-feedback">{errors.password_confirmation[0]}</div>}
            </div>
            <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            <div className="auth-links auth-links-center">
              <Link to="/login">Back to login</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
