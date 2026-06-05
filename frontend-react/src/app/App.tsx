import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RequirePermission } from '@common/rbac/ProtectedRoute';
import { PERMISSIONS } from '@common/rbac/permissions';

const AdminLayout = lazy(() => import('@admin/layout/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const ShopkeeperLayout = lazy(() => import('@shopkeeper/layout/ShopkeeperLayout').then((module) => ({ default: module.ShopkeeperLayout })));
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import('@admin/features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const LogsPage = lazy(() => import('@admin/features/logs/LogsPage').then((module) => ({ default: module.LogsPage })));
const ResourcePage = lazy(() => import('@admin/features/resources/ResourcePage').then((module) => ({ default: module.ResourcePage })));
const ProfilePage = lazy(() => import('@common/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const ReportsPage = lazy(() => import('@admin/features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import('@admin/features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const ShopkeeperDashboardPage = lazy(() => import('@shopkeeper/features/ShopkeeperDashboardPage').then((module) => ({ default: module.ShopkeeperDashboardPage })));
const ShopkeeperInventoryPage = lazy(() => import('@shopkeeper/features/ShopkeeperInventoryPage').then((module) => ({ default: module.ShopkeeperInventoryPage })));

function requirePermission(permission: string, element: ReactElement) {
  return <RequirePermission permission={permission}>{element}</RequirePermission>;
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="admin/dashboard" element={requirePermission(PERMISSIONS.dashboardView, <DashboardPage title="Admin Dashboard" />)} />
          <Route path="users" element={requirePermission(PERMISSIONS.usersView, <ResourcePage resource="users" />)} />
          <Route path="roles" element={requirePermission(PERMISSIONS.rolesView, <ResourcePage resource="roles" />)} />
          <Route path="permissions" element={requirePermission(PERMISSIONS.permissionsView, <ResourcePage resource="permissions" />)} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={requirePermission(PERMISSIONS.settingsView, <SettingsPage />)} />
          <Route path="reports" element={requirePermission(PERMISSIONS.reportsView, <ReportsPage />)} />
          <Route path="activity-logs" element={requirePermission(PERMISSIONS.logsView, <LogsPage type="activities" />)} />
          <Route path="audit-logs" element={requirePermission(PERMISSIONS.logsView, <LogsPage type="audits" />)} />
        </Route>
        <Route
          path="/shopkeeper"
          element={(
            <ProtectedRoute>
              <ShopkeeperLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<Navigate to="/shopkeeper/dashboard" replace />} />
          <Route path="dashboard" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperDashboardPage />)} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="products" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperInventoryPage resource="products" />)} />
          <Route path="stock" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperInventoryPage resource="stock" />)} />
          <Route path="purchases" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperInventoryPage resource="purchases" />)} />
          <Route path="sales" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperInventoryPage resource="sales" />)} />
          <Route path="customers" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperInventoryPage resource="customers" />)} />
          <Route path="suppliers" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperInventoryPage resource="suppliers" />)} />
          <Route path="returns" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperInventoryPage resource="returns" />)} />
          <Route path="reports" element={requirePermission(PERMISSIONS.shopkeeperDashboardView, <ShopkeeperInventoryPage resource="reports" />)} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function PageLoader() {
  return <div className="app-route-loader">Loading...</div>;
}
