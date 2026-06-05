import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, getApiErrorMessage, getValidationErrors } from '@common/services/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await api.post('/auth/forgot-password', { email });
      Swal.fire('Request sent', 'Password reset link sent if the email exists.', 'success');
    } catch (error) {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      }
      Swal.fire('Unable to send reset link', getApiErrorMessage(error, 'Please check the email and try again.'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-box card">
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Forgot Password</h1>
          <p className="text-secondary mb-4">Enter your email to receive a reset link.</p>
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
              {errors.email?.[0] && <div className="invalid-feedback">{errors.email[0]}</div>}
            </div>
            <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            <div className="auth-links auth-links-center">
              <Link to="/login">Back to login</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
