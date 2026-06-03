import { NavLink } from 'react-router-dom';
import { useState } from 'react';

type SidebarBrandProps = {
  onNavigate?: () => void;
};

export function SidebarBrand({ onNavigate }: SidebarBrandProps) {
  const [logoMissing, setLogoMissing] = useState(false);

  return (
    <NavLink to="/dashboard" className="brand-link" onClick={onNavigate}>
      {!logoMissing && <img className="brand-logo" src="/logo.svg" alt="Inventory Admin" onError={() => setLogoMissing(true)} />}
      {logoMissing && (
        <span className="brand-fallback">
          <strong>Inventory</strong>
          <small>Admin Panel</small>
        </span>
      )}
    </NavLink>
  );
}
