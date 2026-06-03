<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'dashboard.view',
            'users.view', 'users.create', 'users.update', 'users.delete', 'users.restore',
            'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'roles.restore',
            'permissions.view', 'permissions.create', 'permissions.update', 'permissions.delete', 'permissions.restore',
            'settings.view', 'settings.update',
            'logs.view',
            'reports.view',
        ];
        $deprecatedPermissions = [
            'notifications.view',
            'files.manage',
            'impersonation.use',
        ];

        Permission::withTrashed()->whereIn('name', $deprecatedPermissions)->forceDelete();

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission, 'guard_name' => 'web'],
                ['status' => 'active']
            );
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web'], ['status' => 'active']);
        $userRole = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web'], ['status' => 'active']);

        $adminRole->syncPermissions($permissions);
        $userRole->syncPermissions(['dashboard.view']);

        User::updateOrCreate([
            'email' => env('ADMIN_EMAIL', 'admin@example.com'),
        ], [
            'name' => env('ADMIN_NAME', 'Admin User'),
            'password' => Hash::make(env('ADMIN_PASSWORD', 'Admin@123456')),
            'status' => 'active',
        ])->assignRole($adminRole);

        foreach (range(1, 10) as $index) {
            User::updateOrCreate([
                'email' => "demo{$index}@example.com",
            ], [
                'name' => "Demo User {$index}",
                'password' => Hash::make('Demo@123456'),
                'status' => 'active',
            ])->assignRole($userRole);
        }

        Setting::updateOrCreate(['key' => 'app_name'], ['value' => 'Inventory Admin Panel']);
        Setting::updateOrCreate(['key' => 'timezone'], ['value' => config('app.timezone')]);
    }
}
