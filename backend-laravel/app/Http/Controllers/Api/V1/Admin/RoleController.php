<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RoleRequest;
use App\Http\Resources\Admin\RoleResource;
use App\Models\Role;
use App\Services\Admin\AdminRbacService;
use App\Support\ApiResponse;
use App\Support\Concerns\BuildsListQueries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    use BuildsListQueries;

    public function __construct(private readonly AdminRbacService $rbac)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Role::withTrashed()->with('permissions');
        $this->applyListQuery($query, $request, ['name']);

        return ApiResponse::paginated(RoleResource::collection($query->paginate($this->perPage($request))));
    }

    public function store(RoleRequest $request): JsonResponse
    {
        $role = $this->rbac->createRole($request->safe()->only(['name', 'status']), $request->input('permissions', []));

        return ApiResponse::success(new RoleResource($role), 'Role created', 201);
    }

    public function show(Role $role): JsonResponse
    {
        return ApiResponse::success(new RoleResource($role->load('permissions')));
    }

    public function update(RoleRequest $request, Role $role): JsonResponse
    {
        $role = $this->rbac->updateRole($role, $request->safe()->only(['name', 'status']), $request->input('permissions', []));

        return ApiResponse::success(new RoleResource($role), 'Role updated');
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->rbac->archiveRole($role);

        return ApiResponse::success(null, 'Role archived');
    }

    public function restore(int $id): JsonResponse
    {
        $this->rbac->restoreRole($id);

        return ApiResponse::success(null, 'Role restored from archive');
    }
}
