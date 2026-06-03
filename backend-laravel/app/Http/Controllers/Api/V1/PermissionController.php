<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PermissionRequest;
use App\Http\Resources\PermissionResource;
use App\Models\Permission;
use App\Support\AdminCache;
use App\Support\ApiResponse;
use App\Support\Concerns\BuildsListQueries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    use BuildsListQueries;

    public function index(Request $request): JsonResponse
    {
        $query = Permission::withTrashed();
        $this->applyListQuery($query, $request, ['name']);

        return ApiResponse::paginated(PermissionResource::collection($query->paginate($this->perPage($request))));
    }

    public function store(PermissionRequest $request): JsonResponse
    {
        $permission = Permission::create($request->validated() + ['guard_name' => 'web']);
        AdminCache::clearRbac();

        return ApiResponse::success(new PermissionResource($permission), 'Permission created', 201);
    }

    public function show(Permission $permission): JsonResponse
    {
        return ApiResponse::success(new PermissionResource($permission));
    }

    public function update(PermissionRequest $request, Permission $permission): JsonResponse
    {
        $permission->update($request->validated());
        AdminCache::clearRbac();

        return ApiResponse::success(new PermissionResource($permission), 'Permission updated');
    }

    public function destroy(Permission $permission): JsonResponse
    {
        $permission->delete();
        AdminCache::clearRbac();

        return ApiResponse::success(null, 'Permission archived');
    }

    public function restore(int $id): JsonResponse
    {
        Permission::onlyTrashed()->findOrFail($id)->restore();
        AdminCache::clearRbac();

        return ApiResponse::success(null, 'Permission restored from archive');
    }
}
