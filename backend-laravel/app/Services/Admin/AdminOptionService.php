<?php

namespace App\Services\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Support\AdminCache;
use Illuminate\Support\Facades\Cache;

class AdminOptionService
{
    public function rbac(): array
    {
        return Cache::remember(AdminCache::OPTIONS, AdminCache::ttl('options'), fn () => [
            'roles' => Role::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
            'permissions' => Permission::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
        ]);
    }
}
