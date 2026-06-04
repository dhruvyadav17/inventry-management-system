import { useAppSelector } from '../../../app/hooks';
import { canAccess } from '../../rbac/ProtectedRoute';
import { SidebarBrand } from '../sidebar/SidebarBrand';
import { SidebarSection } from '../sidebar/SidebarSection';
import { SidebarUserCard } from '../sidebar/SidebarUserCard';
import { sidebarMenu, type SidebarMenuGroup } from './sidebarMenu';

type AppSidebarProps = {
  brandTo?: string;
  menu?: SidebarMenuGroup[];
  onNavigate?: () => void;
};

export function AppSidebar({ brandTo, menu = sidebarMenu, onNavigate }: AppSidebarProps) {
  const user = useAppSelector((state) => state.auth.user);
  const visibleGroups = menu
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccess(user, item.permission)) }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="app-sidebar">
      <SidebarBrand to={brandTo} onNavigate={onNavigate} />

      <nav className="nav-sidebar">
        {visibleGroups.map((group) => (
          <SidebarSection key={group.group} {...group} onNavigate={onNavigate} />
        ))}
      </nav>

      <SidebarUserCard user={user} />
    </aside>
  );
}
