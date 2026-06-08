<?php

namespace App\Services\Admin;

use App\Services\AuditLogger;
use App\Models\User;
use App\Support\AdminCache;
use Illuminate\Http\Request;

class AdminUserService
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function create(array $data, Request $request): User
    {
        $roles = $data['roles'] ?? [];
        unset($data['roles']);

        $data = $this->withProfilePhoto($data, $request);
        $user = User::create($data);
        $user->syncRoles($roles);
        AdminCache::clearDashboard();
        $this->audit->record('users.created', $user, null, null, $user->fresh()->load('roles')->toArray());

        return $user->load('roles');
    }

    public function update(User $user, array $data, Request $request): User
    {
        $roles = $data['roles'] ?? null;
        unset($data['roles']);

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $oldValues = $user->load('roles')->toArray();
        $user->update($this->withProfilePhoto($data, $request));

        if (is_array($roles)) {
            $user->syncRoles($roles);
        }

        AdminCache::clearDashboard();
        $this->audit->record('users.updated', $user, null, $oldValues, $user->fresh()->load('roles')->toArray());

        return $user->load('roles');
    }

    public function archive(User $user): void
    {
        $oldValues = $user->load('roles')->toArray();
        $user->delete();
        AdminCache::clearDashboard();
        $this->audit->record('users.archived', $user, null, $oldValues, $user->fresh()->toArray());
    }

    public function restore(int $id): void
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $oldValues = $user->toArray();
        $user->restore();
        AdminCache::clearDashboard();
        $this->audit->record('users.restored', $user, null, $oldValues, $user->fresh()->toArray());
    }

    private function withProfilePhoto(array $data, Request $request): array
    {
        if ($request->hasFile('profile_photo')) {
            $data['profile_photo'] = $request->file('profile_photo')->store('profiles', 'public');
        }

        return $data;
    }
}
