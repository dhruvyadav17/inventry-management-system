import { NavLink } from 'react-router-dom';
import type { AuthUser } from '@common/types';

type ProfileMenuProps = {
  user: AuthUser | null;
  onLogout: () => void;
  profilePath: string;
};

export function ProfileMenu({ user, onLogout, profilePath }: ProfileMenuProps) {
  const initial = user?.name?.slice(0, 1) ?? 'A';

  return (
    <div className="profile-menu">
      <button className="profile-trigger" title="Profile" aria-label="Profile menu">
        <i className="bi bi-person-circle" />
        <span className="profile-online" />
      </button>
      <div className="profile-dropdown">
        <div className="profile-dropdown-head">
          <div className="profile-avatar">{initial}</div>
          <div>
            <strong>{user?.name ?? 'Admin User'}</strong>
            <small>{user?.email ?? 'admin@example.com'}</small>
          </div>
        </div>
        <div className="profile-role">
          <span>Role</span>
          <strong>{user?.roles?.[0] ?? 'admin'}</strong>
        </div>
        <NavLink to={profilePath} className="profile-link"><i className="bi bi-person" /> Profile</NavLink>
        <button className="profile-link danger" onClick={onLogout}><i className="bi bi-box-arrow-right" /> Logout</button>
      </div>
    </div>
  );
}
