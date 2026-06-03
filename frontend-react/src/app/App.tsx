import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute, RequirePermission } from '../components/rbac/ProtectedRoute';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LogsPage } from '../features/logs/LogsPage';
import { ResourcePage } from '../features/resources/ResourcePage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { PERMISSIONS } from '../rbac/permissions';

function requirePermission(permission: string, element: ReactElement) {
  return <RequirePermission permission={permission}>{element}</RequirePermission>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={(
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={requirePermission(PERMISSIONS.dashboardView, <DashboardPage />)} />
        <Route path="users" element={requirePermission(PERMISSIONS.usersView, <ResourcePage resource="users" />)} />
        <Route path="roles" element={requirePermission(PERMISSIONS.rolesView, <ResourcePage resource="roles" />)} />
        <Route path="permissions" element={requirePermission(PERMISSIONS.permissionsView, <ResourcePage resource="permissions" />)} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={requirePermission(PERMISSIONS.settingsView, <SettingsPage />)} />
        <Route path="reports" element={requirePermission(PERMISSIONS.reportsView, <ReportsPage />)} />
        <Route path="activity-logs" element={requirePermission(PERMISSIONS.logsView, <LogsPage type="activities" />)} />
        <Route path="audit-logs" element={requirePermission(PERMISSIONS.logsView, <LogsPage type="audits" />)} />
      </Route>
    </Routes>
  );
}
