<?php

namespace App\Services\Admin;

use App\Models\User;
use App\Support\AdminCache;
use Illuminate\Http\Request;

class AdminUserService
{
    public function create(array $data, Request $request): User
    {
        $roles = $data['roles'] ?? [];
        unset($data['roles']);

        $data = $this->withProfilePhoto($data, $request);
        $user = User::create($data);
        $user->syncRoles($roles);
        AdminCache::clearDashboard();

        return $user->load('roles');
    }

    public function update(User $user, array $data, Request $request): User
    {
        $roles = $data['roles'] ?? null;
        unset($data['roles']);

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $user->update($this->withProfilePhoto($data, $request));

        if (is_array($roles)) {
            $user->syncRoles($roles);
        }

        AdminCache::clearDashboard();

        return $user->load('roles');
    }

    public function archive(User $user): void
    {
        $user->delete();
        AdminCache::clearDashboard();
    }

    public function restore(int $id): void
    {
        User::onlyTrashed()->findOrFail($id)->restore();
        AdminCache::clearDashboard();
    }

    private function withProfilePhoto(array $data, Request $request): array
    {
        if ($request->hasFile('profile_photo')) {
            $data['profile_photo'] = $request->file('profile_photo')->store('profiles', 'public');
        }

        return $data;
    }
}
