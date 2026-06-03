import { useEffect, useState } from 'react';
import { apiGet } from '../../services/api';
import type { ResourceRecord } from '../../types';

type RbacOptions = {
  roles: ResourceRecord[];
  permissions: ResourceRecord[];
};

export function useResourceOptions() {
  const [roles, setRoles] = useState<ResourceRecord[]>([]);
  const [permissions, setPermissions] = useState<ResourceRecord[]>([]);

  useEffect(() => {
    apiGet<RbacOptions>('/options/rbac')
      .then((options) => {
        setRoles(options.roles ?? []);
        setPermissions(options.permissions ?? []);
      })
      .catch(() => {
        setRoles([]);
        setPermissions([]);
      });
  }, []);

  return { roles, permissions };
}
