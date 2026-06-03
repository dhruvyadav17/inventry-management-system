import { NavLink } from 'react-router-dom';
import type { SidebarMenuLink } from './sidebarMenu';

type SidebarLinkProps = SidebarMenuLink & {
  onNavigate?: () => void;
};

export function SidebarLink({ to, icon, label, onNavigate }: SidebarLinkProps) {
  return (
    <NavLink key={to} to={to} className="nav-link" onClick={onNavigate}>
      <span className="nav-icon"><i className={`bi ${icon}`} /></span>
      <span className="nav-text">{label}</span>
    </NavLink>
  );
}
