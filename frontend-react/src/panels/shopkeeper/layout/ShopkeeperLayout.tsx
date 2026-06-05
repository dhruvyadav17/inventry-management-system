import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { clearCredentials } from '@auth/authSlice';
import { api } from '@common/services/api';
import { ProfileMenu } from '@common/layout/header/ProfileMenu';
import { SidebarLink } from '@common/layout/sidebar/SidebarLink';
import { shopkeeperMenu, shopkeeperPaths } from '../shopkeeperConfig';

export function ShopkeeperLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const primaryShop = user?.shops?.find((shop) => shop.is_primary) ?? user?.shops?.[0];

  async function logout() {
    await api.post('/auth/logout').catch(() => null);
    dispatch(clearCredentials());
    navigate('/login');
  }

  return (
    <div className={`shopkeeper-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="shopkeeper-rail">
        <div className="shopkeeper-brand">
          <span><i className="bi bi-shop" /></span>
          <div>
            <strong>Inventory</strong>
            <small>{primaryShop?.name ?? 'Shopkeeper Panel'}</small>
          </div>
        </div>
        <nav className="shopkeeper-nav">
          {shopkeeperMenu.flatMap((group) => group.items).map((item) => (
            <SidebarLink key={item.to} {...item} onNavigate={() => setSidebarOpen(false)} />
          ))}
        </nav>
      </aside>
      <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
      <main className="shopkeeper-main">
        <header className="shopkeeper-topbar">
          <button className="icon-btn menu-toggle" title="Menu" onClick={() => setSidebarOpen(true)}><i className="bi bi-list" /></button>
          <div className="shopkeeper-search">
            <i className="bi bi-search" />
            <span>Search product, invoice, customer</span>
          </div>
          <div className="shopkeeper-actions">
            <Link className="shop-action-btn primary" to={shopkeeperPaths.sales}><i className="bi bi-receipt" /> New Sale</Link>
            <ProfileMenu user={user} onLogout={logout} profilePath={shopkeeperPaths.profile} />
          </div>
        </header>
        <div className="shopkeeper-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
