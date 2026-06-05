<?php

namespace App\Services\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Support\AdminCache;

class AdminRbacService
{
    public function createRole(array $data, array $permissions): Role
    {
        $role = Role::create($data + ['guard_name' => 'web']);
        $role->syncPermissions($permissions);
        AdminCache::clearRbac();

        return $role->load('permissions');
    }

    public function updateRole(Role $role, array $data, array $permissions): Role
    {
        $role->update($data);
        $role->syncPermissions($permissions);
        AdminCache::clearRbac();

        return $role->load('permissions');
    }

    public function archiveRole(Role $role): void
    {
        $role->delete();
        AdminCache::clearRbac();
    }

    public function restoreRole(int $id): void
    {
        Role::onlyTrashed()->findOrFail($id)->restore();
        AdminCache::clearRbac();
    }

    public function createPermission(array $data): Permission
    {
        $permission = Permission::create($data + ['guard_name' => 'web']);
        AdminCache::clearRbac();

        return $permission;
    }

    public function updatePermission(Permission $permission, array $data): Permission
    {
        $permission->update($data);
        AdminCache::clearRbac();

        return $permission;
    }

    public function archivePermission(Permission $permission): void
    {
        $permission->delete();
        AdminCache::clearRbac();
    }

    public function restorePermission(int $id): void
    {
        Permission::onlyTrashed()->findOrFail($id)->restore();
        AdminCache::clearRbac();
    }
}
