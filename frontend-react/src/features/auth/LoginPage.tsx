import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAppDispatch } from '../../app/hooks';
import { api, getApiErrorMessage, type ApiEnvelope } from '../../services/api';
import type { AuthUser } from '../../types';
import { setCredentials } from './authSlice';

type LoginResponse = {
  token: string;
  token_type: string;
  user: AuthUser;
};

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post<ApiEnvelope<LoginResponse>>('/auth/login', { email, password, remember: true });
      dispatch(setCredentials({ token: data.data.token, user: data.data.user }));
      navigate('/dashboard');
    } catch (error) {
      Swal.fire('Login failed', getApiErrorMessage(error, 'Please check your credentials and account status.'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-box card">
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Inventory Admin</h1>
          <p className="text-secondary mb-4">Sign in to manage users, roles, and permissions.</p>
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
            <div className="auth-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to="/register">Create account</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
