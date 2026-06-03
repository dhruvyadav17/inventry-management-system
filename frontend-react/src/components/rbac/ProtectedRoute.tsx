import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppSelector } from '../../app/hooks';
import type { AuthUser } from '../../types';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAppSelector((state) => state.auth.token);
  return token ? children : <Navigate to="/login" replace />;
}

export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);
  if (canAccess(user, permission)) {
    return children;
  }
  return null;
}

export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);
  const allowed = canAccess(user, permission);

  if (allowed) {
    return children;
  }

  return (
    <div className="alert alert-warning">
      You do not have permission to view this page.
    </div>
  );
}

export function useCan(permission: string) {
  const user = useAppSelector((state) => state.auth.user);

  return canAccess(user, permission);
}

export function canAccess(user: AuthUser | null | undefined, permission: string) {
  return Boolean(user?.roles?.includes('admin') || user?.permissions?.includes(permission));
}
