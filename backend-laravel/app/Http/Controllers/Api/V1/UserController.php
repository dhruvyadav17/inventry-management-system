<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\AdminCache;
use App\Support\ApiResponse;
use App\Support\Concerns\BuildsListQueries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use BuildsListQueries;

    public function index(Request $request): JsonResponse
    {
        $query = User::withTrashed()->with('roles');
        $this->applyListQuery($query, $request, ['name', 'email', 'status'], ['id', 'name', 'email', 'status', 'created_at']);

        return ApiResponse::paginated(UserResource::collection($query->paginate($this->perPage($request))));
    }

    public function store(UserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $roles = $data['roles'] ?? [];
        unset($data['roles']);

        if ($request->hasFile('profile_photo')) {
            $data['profile_photo'] = $request->file('profile_photo')->store('profiles', 'public');
        }

        $user = User::create($data);
        $user->syncRoles($roles);
        AdminCache::clearDashboard();

        return ApiResponse::success(new UserResource($user->load('roles')), 'User created', 201);
    }

    public function show(User $user): JsonResponse
    {
        return ApiResponse::success(new UserResource($user->load('roles', 'permissions')));
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();
        $roles = $data['roles'] ?? null;
        unset($data['roles']);

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        if ($request->hasFile('profile_photo')) {
            $data['profile_photo'] = $request->file('profile_photo')->store('profiles', 'public');
        }

        $user->update($data);

        if (is_array($roles)) {
            $user->syncRoles($roles);
        }
        AdminCache::clearDashboard();

        return ApiResponse::success(new UserResource($user->load('roles')), 'User updated');
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();
        AdminCache::clearDashboard();

        return ApiResponse::success(null, 'User archived');
    }

    public function restore(int $id): JsonResponse
    {
        User::onlyTrashed()->findOrFail($id)->restore();
        AdminCache::clearDashboard();

        return ApiResponse::success(null, 'User restored from archive');
    }
}
