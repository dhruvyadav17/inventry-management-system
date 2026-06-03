export const PERMISSIONS = {
  dashboardView: 'dashboard.view',
  usersView: 'users.view',
  rolesView: 'roles.view',
  permissionsView: 'permissions.view',
  settingsView: 'settings.view',
  reportsView: 'reports.view',
  logsView: 'logs.view',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
