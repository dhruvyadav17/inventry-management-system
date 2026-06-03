import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <AppSidebar onNavigate={() => setSidebarOpen(false)} />
      <button className="sidebar-backdrop" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
      <main className="app-main">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className="content-wrapper">
          <Outlet />
        </div>
        <AppFooter />
      </main>
    </div>
  );
}
