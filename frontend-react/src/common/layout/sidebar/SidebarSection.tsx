import { SidebarLink } from './SidebarLink';
import type { SidebarMenuGroup } from '@common/layout/sidebar/sidebarTypes';

type SidebarSectionProps = SidebarMenuGroup & {
  onNavigate?: () => void;
};

export function SidebarSection({ group, items, onNavigate }: SidebarSectionProps) {
  return (
    <section className="nav-section" aria-label={group}>
      <div className="nav-group">{group}</div>
      {items.map((item) => (
        <SidebarLink key={item.to} {...item} onNavigate={onNavigate} />
      ))}
    </section>
  );
}
