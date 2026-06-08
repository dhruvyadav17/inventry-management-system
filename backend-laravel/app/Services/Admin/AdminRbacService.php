<?php

namespace App\Services\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditLogger;
use App\Support\AdminCache;

class AdminRbacService
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function createRole(array $data, array $permissions): Role
    {
        $role = Role::create($data + ['guard_name' => 'web']);
        $role->syncPermissions($permissions);
        AdminCache::clearRbac();
        $this->audit->record('roles.created', $role, null, null, $role->fresh()->load('permissions')->toArray());

        return $role->load('permissions');
    }

    public function updateRole(Role $role, array $data, array $permissions): Role
    {
        $oldValues = $role->load('permissions')->toArray();
        $role->update($data);
        $role->syncPermissions($permissions);
        AdminCache::clearRbac();
        $this->audit->record('roles.updated', $role, null, $oldValues, $role->fresh()->load('permissions')->toArray());

        return $role->load('permissions');
    }

    public function archiveRole(Role $role): void
    {
        $oldValues = $role->load('permissions')->toArray();
        $role->delete();
        AdminCache::clearRbac();
        $this->audit->record('roles.archived', $role, null, $oldValues, $role->toArray());
    }

    public function restoreRole(int $id): void
    {
        $role = Role::onlyTrashed()->findOrFail($id);
        $oldValues = $role->toArray();
        $role->restore();
        AdminCache::clearRbac();
        $this->audit->record('roles.restored', $role, null, $oldValues, $role->fresh()->toArray());
    }

    public function createPermission(array $data): Permission
    {
        $permission = Permission::create($data + ['guard_name' => 'web']);
        AdminCache::clearRbac();
        $this->audit->record('permissions.created', $permission, null, null, $permission->fresh()->toArray());

        return $permission;
    }

    public function updatePermission(Permission $permission, array $data): Permission
    {
        $oldValues = $permission->toArray();
        $permission->update($data);
        AdminCache::clearRbac();
        $this->audit->record('permissions.updated', $permission, null, $oldValues, $permission->fresh()->toArray());

        return $permission;
    }

    public function archivePermission(Permission $permission): void
    {
        $oldValues = $permission->toArray();
        $permission->delete();
        AdminCache::clearRbac();
        $this->audit->record('permissions.archived', $permission, null, $oldValues, $permission->toArray());
    }

    public function restorePermission(int $id): void
    {
        $permission = Permission::onlyTrashed()->findOrFail($id);
        $oldValues = $permission->toArray();
        $permission->restore();
        AdminCache::clearRbac();
        $this->audit->record('permissions.restored', $permission, null, $oldValues, $permission->fresh()->toArray());
    }
}
