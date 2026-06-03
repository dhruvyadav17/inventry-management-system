import type { ResourceName } from '../../types';

type ResourceConfig = {
  title: string;
  singular: string;
  columnCount: number;
};

export const resourceConfig: Record<ResourceName, ResourceConfig> = {
  users: {
    title: 'Users',
    singular: 'User',
    columnCount: 6,
  },
  roles: {
    title: 'Roles',
    singular: 'Role',
    columnCount: 5,
  },
  permissions: {
    title: 'Permissions',
    singular: 'Permission',
    columnCount: 4,
  },
};

export function getResourceConfig(resource: ResourceName) {
  return resourceConfig[resource];
}
