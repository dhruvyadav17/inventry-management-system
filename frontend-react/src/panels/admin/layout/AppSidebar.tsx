import { useAppSelector } from '@app/hooks';
import { canAccess } from '@common/rbac/ProtectedRoute';
import { SidebarBrand } from '@common/layout/sidebar/SidebarBrand';
import { SidebarSection } from '@common/layout/sidebar/SidebarSection';
import type { SidebarMenuGroup } from '@common/layout/sidebar/sidebarTypes';
import { adminMenu } from '../adminConfig';

type AppSidebarProps = {
  brandTo?: string;
  menu?: SidebarMenuGroup[];
  onNavigate?: () => void;
};

export function AppSidebar({ brandTo, menu = adminMenu, onNavigate }: AppSidebarProps) {
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
    </aside>
  );
}
