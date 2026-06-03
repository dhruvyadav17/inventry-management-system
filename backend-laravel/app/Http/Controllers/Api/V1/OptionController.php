<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Support\AdminCache;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class OptionController extends Controller
{
    public function rbac(): JsonResponse
    {
        $options = Cache::remember(AdminCache::OPTIONS, AdminCache::ttl('options'), fn () => [
            'roles' => Role::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
            'permissions' => Permission::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
        ]);

        return ApiResponse::success($options);
    }
}
