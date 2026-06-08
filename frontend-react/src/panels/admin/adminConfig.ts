import { PERMISSIONS } from '@common/rbac/permissions';
import type { SidebarMenuGroup } from '@common/layout/sidebar/sidebarTypes';
import type { ResourceName } from '@common/types';

export const adminPaths = {
  dashboard: '/dashboard',
  adminDashboard: '/admin/dashboard',
  users: '/users',
  roles: '/roles',
  permissions: '/permissions',
  reports: '/reports',
  settings: '/settings',
  activityLogs: '/activity-logs',
  auditLogs: '/audit-logs',
};

export const adminApi = {
  dashboard: '/dashboard',
  reports: '/reports',
  settings: '/settings',
  rbacOptions: '/options/rbac',
  resources: {
    users: '/users',
    roles: '/roles',
    permissions: '/permissions',
  } satisfies Record<ResourceName, string>,
  logs: {
    activities: '/logs/activities',
    audits: '/logs/audits',
  },
};

export const adminMenu: SidebarMenuGroup[] = [
  {
    group: 'Overview',
    items: [
      { to: adminPaths.dashboard, icon: 'bi-speedometer2', label: 'Dashboard', permission: PERMISSIONS.dashboardView },
    ],
  },
  {
    group: 'Access Control',
    items: [
      { to: adminPaths.users, icon: 'bi-people', label: 'Users', permission: PERMISSIONS.usersView },
      { to: adminPaths.roles, icon: 'bi-shield-lock', label: 'Roles', permission: PERMISSIONS.rolesView },
      { to: adminPaths.permissions, icon: 'bi-key', label: 'Permissions', permission: PERMISSIONS.permissionsView },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: adminPaths.reports, icon: 'bi-graph-up', label: 'Reports', permission: PERMISSIONS.reportsView },
      { to: adminPaths.settings, icon: 'bi-sliders', label: 'Settings', permission: PERMISSIONS.settingsView },
      { to: adminPaths.activityLogs, icon: 'bi-activity', label: 'Activity Logs', permission: PERMISSIONS.logsView },
      { to: adminPaths.auditLogs, icon: 'bi-journal-text', label: 'Audit Logs', permission: PERMISSIONS.logsView },
    ],
  },
];

export type AdminResourceConfig = {
  title: string;
  singular: string;
  columnCount: number;
  endpoint: string;
};

export const adminResourceConfig: Record<ResourceName, AdminResourceConfig> = {
  users: {
    title: 'Users',
    singular: 'User',
    columnCount: 6,
    endpoint: adminApi.resources.users,
  },
  roles: {
    title: 'Roles',
    singular: 'Role',
    columnCount: 5,
    endpoint: adminApi.resources.roles,
  },
  permissions: {
    title: 'Permissions',
    singular: 'Permission',
    columnCount: 4,
    endpoint: adminApi.resources.permissions,
  },
};
