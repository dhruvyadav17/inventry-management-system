<?php

namespace App\Services\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Support\AdminCache;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AdminOptionService
{
    public function rbac(): array
    {
        try {
            return Cache::remember(AdminCache::OPTIONS, AdminCache::ttl('options'), fn () => $this->activeRbacOptions());
        } catch (Throwable) {
            return $this->activeRbacOptions();
        }
    }

    private function activeRbacOptions(): array
    {
        return [
            'roles' => $this->optionRows(Role::query(), 'roles'),
            'permissions' => $this->optionRows(Permission::query(), 'permissions'),
        ];
    }

    private function optionRows($query, string $table)
    {
        $hasStatus = Schema::hasColumn($table, 'status');

        if ($hasStatus) {
            $query->where('status', 'active');
        }

        $columns = $hasStatus ? ['id', 'name', 'status'] : ['id', 'name'];

        return $query
            ->orderBy('name')
            ->get($columns)
            ->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'status' => $row->status ?? 'active',
            ])
            ->values();
    }
}
