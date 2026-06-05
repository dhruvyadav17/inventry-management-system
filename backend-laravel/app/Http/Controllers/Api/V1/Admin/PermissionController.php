<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PermissionRequest;
use App\Http\Resources\Admin\PermissionResource;
use App\Models\Permission;
use App\Services\Admin\AdminRbacService;
use App\Support\ApiResponse;
use App\Support\Concerns\BuildsListQueries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    use BuildsListQueries;

    public function __construct(private readonly AdminRbacService $rbac)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Permission::withTrashed();
        $this->applyListQuery($query, $request, ['name']);

        return ApiResponse::paginated(PermissionResource::collection($query->paginate($this->perPage($request))));
    }

    public function store(PermissionRequest $request): JsonResponse
    {
        $permission = $this->rbac->createPermission($request->validated());

        return ApiResponse::success(new PermissionResource($permission), 'Permission created', 201);
    }

    public function show(Permission $permission): JsonResponse
    {
        return ApiResponse::success(new PermissionResource($permission));
    }

    public function update(PermissionRequest $request, Permission $permission): JsonResponse
    {
        $permission = $this->rbac->updatePermission($permission, $request->validated());

        return ApiResponse::success(new PermissionResource($permission), 'Permission updated');
    }

    public function destroy(Permission $permission): JsonResponse
    {
        $this->rbac->archivePermission($permission);

        return ApiResponse::success(null, 'Permission archived');
    }

    public function restore(int $id): JsonResponse
    {
        $this->rbac->restorePermission($id);

        return ApiResponse::success(null, 'Permission restored from archive');
    }
}
