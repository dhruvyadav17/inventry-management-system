import { PERMISSIONS } from '@common/rbac/permissions';
import type { SidebarMenuGroup } from '@common/layout/sidebar/sidebarTypes';

export const shopkeeperPaths = {
  dashboard: '/shopkeeper/dashboard',
  products: '/shopkeeper/products',
  stock: '/shopkeeper/stock',
  purchases: '/shopkeeper/purchases',
  sales: '/shopkeeper/sales',
  customers: '/shopkeeper/customers',
  suppliers: '/shopkeeper/suppliers',
  returns: '/shopkeeper/returns',
  reports: '/shopkeeper/reports',
  profile: '/shopkeeper/profile',
};

export const shopkeeperApi = {
  dashboard: '/shopkeeper/dashboard',
  options: '/shopkeeper/options',
  resources: {
    products: '/shopkeeper/products',
    stock: '/shopkeeper/stock',
    purchases: '/shopkeeper/purchases',
    sales: '/shopkeeper/sales',
    customers: '/shopkeeper/customers',
    suppliers: '/shopkeeper/suppliers',
    returns: '/shopkeeper/returns',
    reports: '/shopkeeper/reports',
  },
};

export const shopkeeperQuickActions = [
  { name: 'Add Product', icon: 'bi-plus-square', path: shopkeeperPaths.products },
  { name: 'Stock In', icon: 'bi-box-arrow-in-down', path: shopkeeperPaths.stock },
  { name: 'Create Bill', icon: 'bi-receipt-cutoff', path: shopkeeperPaths.sales },
  { name: 'Purchase Entry', icon: 'bi-bag-plus', path: shopkeeperPaths.purchases },
];

export const shopkeeperMenu: SidebarMenuGroup[] = [
  {
    group: 'Workspace',
    items: [
      { to: shopkeeperPaths.dashboard, icon: 'bi-speedometer2', label: 'Dashboard', permission: PERMISSIONS.shopkeeperDashboardView },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { to: shopkeeperPaths.products, icon: 'bi-box-seam', label: 'Products', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: shopkeeperPaths.stock, icon: 'bi-arrow-left-right', label: 'Stock Movement', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: shopkeeperPaths.purchases, icon: 'bi-bag-plus', label: 'Purchases', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: shopkeeperPaths.sales, icon: 'bi-receipt', label: 'Sales Billing', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: shopkeeperPaths.returns, icon: 'bi-arrow-counterclockwise', label: 'Returns', permission: PERMISSIONS.shopkeeperDashboardView },
    ],
  },
  {
    group: 'Business',
    items: [
      { to: shopkeeperPaths.customers, icon: 'bi-person-lines-fill', label: 'Customers', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: shopkeeperPaths.suppliers, icon: 'bi-truck', label: 'Suppliers', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: shopkeeperPaths.reports, icon: 'bi-graph-up-arrow', label: 'Reports', permission: PERMISSIONS.shopkeeperDashboardView },
    ],
  },
];
