import { PERMISSIONS } from '../../../rbac/permissions';

export type SidebarMenuLink = {
  to: string;
  icon: string;
  label: string;
  permission: string;
};

export type SidebarMenuGroup = {
  group: string;
  items: SidebarMenuLink[];
};

export const sidebarMenu: SidebarMenuGroup[] = [
  {
    group: 'Overview',
    items: [
      { to: '/dashboard', icon: 'bi-speedometer2', label: 'Dashboard', permission: PERMISSIONS.dashboardView },
    ],
  },
  {
    group: 'Access Control',
    items: [
      { to: '/users', icon: 'bi-people', label: 'Users', permission: PERMISSIONS.usersView },
      { to: '/roles', icon: 'bi-shield-lock', label: 'Roles', permission: PERMISSIONS.rolesView },
      { to: '/permissions', icon: 'bi-key', label: 'Permissions', permission: PERMISSIONS.permissionsView },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/reports', icon: 'bi-graph-up', label: 'Reports', permission: PERMISSIONS.reportsView },
      { to: '/settings', icon: 'bi-sliders', label: 'Settings', permission: PERMISSIONS.settingsView },
      { to: '/activity-logs', icon: 'bi-activity', label: 'Activity Logs', permission: PERMISSIONS.logsView },
      { to: '/audit-logs', icon: 'bi-journal-text', label: 'Audit Logs', permission: PERMISSIONS.logsView },
    ],
  },
];
