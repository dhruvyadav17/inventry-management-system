import type { AuthUser } from '../../../types';

type SidebarUserCardProps = {
  user?: AuthUser | null;
};

export function SidebarUserCard({ user }: SidebarUserCardProps) {
  const initial = user?.name?.slice(0, 1) ?? 'A';
  const role = user?.roles?.[0] ?? 'admin';

  return (
    <div className="sidebar-user">
      <div className="sidebar-user-avatar">{initial}</div>
      <div className="sidebar-user-meta">
        <strong>{user?.name ?? 'Admin User'}</strong>
        <span>{role}</span>
      </div>
    </div>
  );
}
