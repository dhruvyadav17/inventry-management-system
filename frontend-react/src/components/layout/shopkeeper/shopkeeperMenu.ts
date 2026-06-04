import { PERMISSIONS } from '../../../rbac/permissions';
import type { SidebarMenuGroup } from '../admin/sidebarMenu';

export const shopkeeperMenu: SidebarMenuGroup[] = [
  {
    group: 'Workspace',
    items: [
      { to: '/shopkeeper/dashboard', icon: 'bi-speedometer2', label: 'Dashboard', permission: PERMISSIONS.shopkeeperDashboardView },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { to: '/shopkeeper/products', icon: 'bi-box-seam', label: 'Products', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: '/shopkeeper/stock', icon: 'bi-arrow-left-right', label: 'Stock Movement', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: '/shopkeeper/purchases', icon: 'bi-bag-plus', label: 'Purchases', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: '/shopkeeper/sales', icon: 'bi-receipt', label: 'Sales Billing', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: '/shopkeeper/returns', icon: 'bi-arrow-counterclockwise', label: 'Returns', permission: PERMISSIONS.shopkeeperDashboardView },
    ],
  },
  {
    group: 'Business',
    items: [
      { to: '/shopkeeper/customers', icon: 'bi-person-lines-fill', label: 'Customers', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: '/shopkeeper/suppliers', icon: 'bi-truck', label: 'Suppliers', permission: PERMISSIONS.shopkeeperDashboardView },
      { to: '/shopkeeper/reports', icon: 'bi-graph-up-arrow', label: 'Reports', permission: PERMISSIONS.shopkeeperDashboardView },
    ],
  },
];
