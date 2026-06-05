import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@common/services/api';
import type { ResourceRecord } from '@common/types';
import { adminApi } from '../../adminConfig';

type RbacOptions = {
  roles: ResourceRecord[];
  permissions: ResourceRecord[];
};

export function useResourceOptions() {
  const [roles, setRoles] = useState<ResourceRecord[]>([]);
  const [permissions, setPermissions] = useState<ResourceRecord[]>([]);

  const loadOptions = useCallback(() => {
    apiGet<RbacOptions>(adminApi.rbacOptions)
      .then((options) => {
        setRoles(options.roles ?? []);
        setPermissions(options.permissions ?? []);
      })
      .catch(() => {
        setRoles([]);
        setPermissions([]);
      });
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  return { roles, permissions, loadOptions };
}
