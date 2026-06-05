<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Http\Resources\Common\UserResource;
use App\Models\User;
use App\Services\Admin\AdminUserService;
use App\Support\ApiResponse;
use App\Support\Concerns\BuildsListQueries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use BuildsListQueries;

    public function __construct(private readonly AdminUserService $users)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = User::withTrashed()->with('roles');
        $this->applyListQuery($query, $request, ['name', 'email', 'status'], ['id', 'name', 'email', 'status', 'created_at']);

        return ApiResponse::paginated(UserResource::collection($query->paginate($this->perPage($request))));
    }

    public function store(UserRequest $request): JsonResponse
    {
        return ApiResponse::success(new UserResource($this->users->create($request->validated(), $request)), 'User created', 201);
    }

    public function show(User $user): JsonResponse
    {
        return ApiResponse::success(new UserResource($user->load('roles', 'permissions')));
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        return ApiResponse::success(new UserResource($this->users->update($user, $request->validated(), $request)), 'User updated');
    }

    public function destroy(User $user): JsonResponse
    {
        $this->users->archive($user);

        return ApiResponse::success(null, 'User archived');
    }

    public function restore(int $id): JsonResponse
    {
        $this->users->restore($id);

        return ApiResponse::success(null, 'User restored from archive');
    }
}
