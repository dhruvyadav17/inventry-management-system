<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Support\AdminCache;
use App\Support\ApiResponse;
use App\Support\Concerns\BuildsListQueries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    use BuildsListQueries;

    public function index(Request $request): JsonResponse
    {
        $query = Role::withTrashed()->with('permissions');
        $this->applyListQuery($query, $request, ['name']);

        return ApiResponse::paginated(RoleResource::collection($query->paginate($this->perPage($request))));
    }

    public function store(RoleRequest $request): JsonResponse
    {
        $role = Role::create($request->safe()->only(['name', 'status']) + ['guard_name' => 'web']);
        $role->syncPermissions($request->input('permissions', []));
        AdminCache::clearRbac();

        return ApiResponse::success(new RoleResource($role->load('permissions')), 'Role created', 201);
    }

    public function show(Role $role): JsonResponse
    {
        return ApiResponse::success(new RoleResource($role->load('permissions')));
    }

    public function update(RoleRequest $request, Role $role): JsonResponse
    {
        $role->update($request->safe()->only(['name', 'status']));
        $role->syncPermissions($request->input('permissions', []));
        AdminCache::clearRbac();

        return ApiResponse::success(new RoleResource($role->load('permissions')), 'Role updated');
    }

    public function destroy(Role $role): JsonResponse
    {
        $role->delete();
        AdminCache::clearRbac();

        return ApiResponse::success(null, 'Role archived');
    }

    public function restore(int $id): JsonResponse
    {
        Role::onlyTrashed()->findOrFail($id)->restore();
        AdminCache::clearRbac();

        return ApiResponse::success(null, 'Role restored from archive');
    }
}
