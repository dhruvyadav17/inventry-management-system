import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { clearCredentials } from '@auth/authSlice';
import { api } from '@common/services/api';
import { HeaderStatusStrip } from '@common/layout/header/HeaderStatusStrip';
import { NotificationMenu } from '@common/layout/header/NotificationMenu';
import { ProfileMenu } from '@common/layout/header/ProfileMenu';

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();

  async function logout() {
    await api.post('/auth/logout').catch(() => null);
    dispatch(clearCredentials());
    navigate('/login');
  }

  return (
    <header className="content-header">
      <div className="header-left">
        <button className="icon-btn menu-toggle" title="Menu" onClick={onMenuClick}><i className="bi bi-list" /></button>
      </div>
      <HeaderStatusStrip />
      <div className="top-actions">
        <NotificationMenu />
        <ProfileMenu user={user} onLogout={logout} profilePath="/profile" />
      </div>
    </header>
  );
}
