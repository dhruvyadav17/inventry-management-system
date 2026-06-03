<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AuthAndRbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_active_user_can_login_and_receive_standard_envelope(): void
    {
        $role = Role::create(['name' => 'admin', 'guard_name' => 'web', 'status' => 'active']);
        $user = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        $user->assignRole($role);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'email', 'roles']]]);
    }

    public function test_registration_creates_default_user_role_when_missing(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.roles.0', 'user');

        $this->assertDatabaseHas('roles', ['name' => 'user', 'guard_name' => 'web']);
    }

    public function test_shopkeeper_login_returns_shopkeeper_redirect_and_shop_assignments(): void
    {
        Permission::create(['name' => 'dashboard.view', 'guard_name' => 'web', 'status' => 'active']);
        $role = Role::create(['name' => 'Shopkeeper', 'guard_name' => 'web', 'status' => 'active']);
        $role->givePermissionTo('dashboard.view');
        $shop = Shop::create([
            'name' => 'Main Shop',
            'code' => 'MAIN',
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'email' => 'shopkeeper@example.com',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);
        $user->assignRole($role);
        $user->shops()->attach($shop->id, ['is_primary' => true, 'status' => 'active']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'shopkeeper@example.com',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('data.redirect_path', '/shopkeeper/dashboard')
            ->assertJsonPath('data.user.shops.0.code', 'MAIN')
            ->assertJsonPath('data.user.shops.0.is_primary', true);
    }

    public function test_user_index_requires_view_permission(): void
    {
        Permission::create(['name' => 'users.view', 'guard_name' => 'web', 'status' => 'active']);
        $allowedRole = Role::create(['name' => 'manager', 'guard_name' => 'web', 'status' => 'active']);
        $deniedRole = Role::create(['name' => 'limited', 'guard_name' => 'web', 'status' => 'active']);
        $allowedRole->givePermissionTo('users.view');

        $allowedUser = User::factory()->create(['status' => 'active']);
        $deniedUser = User::factory()->create(['status' => 'active']);
        $allowedUser->assignRole($allowedRole);
        $deniedUser->assignRole($deniedRole);

        $this->actingAs($deniedUser, 'sanctum')
            ->getJson('/api/v1/users')
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->actingAs($allowedUser, 'sanctum')
            ->getJson('/api/v1/users')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_rbac_options_returns_roles_and_permissions(): void
    {
        Permission::create(['name' => 'users.view', 'guard_name' => 'web', 'status' => 'active']);
        Permission::create(['name' => 'roles.view', 'guard_name' => 'web', 'status' => 'active']);
        Permission::create(['name' => 'dashboard.view', 'guard_name' => 'web', 'status' => 'active']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'web', 'status' => 'active']);
        $role->givePermissionTo(['users.view', 'roles.view']);

        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/options/rbac')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['roles', 'permissions']]);
    }

    public function test_user_index_can_filter_archived_records_with_pagination(): void
    {
        Permission::create(['name' => 'users.view', 'guard_name' => 'web', 'status' => 'active']);
        $role = Role::create(['name' => 'manager', 'guard_name' => 'web', 'status' => 'active']);
        $role->givePermissionTo('users.view');
        $viewer = User::factory()->create(['status' => 'active']);
        $viewer->assignRole($role);

        User::factory()->create(['name' => 'Active Person', 'status' => 'active']);
        $archivedUser = User::factory()->create(['name' => 'Archived Person', 'status' => 'active']);
        $archivedUser->delete();

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/v1/users?status=archived&per_page=10')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.data.0.status', 'archived')
            ->assertJsonPath('data.data.0.name', 'Archived Person');
    }

    public function test_activity_logs_use_standard_paginated_envelope(): void
    {
        Permission::create(['name' => 'logs.view', 'guard_name' => 'web', 'status' => 'active']);
        $role = Role::create(['name' => 'auditor', 'guard_name' => 'web', 'status' => 'active']);
        $role->givePermissionTo('logs.view');
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        Activity::create(['description' => 'User archived', 'log_name' => 'default']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/logs/activities?per_page=10')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['data', 'links', 'meta' => ['current_page', 'last_page', 'per_page', 'total']]]);
    }

    public function test_reports_endpoint_uses_reports_permission(): void
    {
        Permission::create(['name' => 'reports.view', 'guard_name' => 'web', 'status' => 'active']);
        $role = Role::create(['name' => 'report-viewer', 'guard_name' => 'web', 'status' => 'active']);
        $role->givePermissionTo('reports.view');
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['stats', 'recent_audits']]);
    }

    public function test_user_can_update_profile(): void
    {
        $user = User::factory()->create(['name' => 'Old Name', 'status' => 'active']);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/profile', ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'New Name');
    }

    public function test_user_can_change_password_with_hashing(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old-password'),
            'status' => 'active',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => 'old-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_settings_can_be_updated_with_validation(): void
    {
        Permission::create(['name' => 'settings.update', 'guard_name' => 'web', 'status' => 'active']);
        $role = Role::create(['name' => 'settings-manager', 'guard_name' => 'web', 'status' => 'active']);
        $role->givePermissionTo('settings.update');
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/settings', [
                'settings' => [
                    'app_name' => 'Inventory Ops',
                    'timezone' => 'Asia/Kolkata',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame('Inventory Ops', Setting::where('key', 'app_name')->value('value'));
    }

    public function test_audit_logs_use_standard_paginated_envelope(): void
    {
        Permission::create(['name' => 'logs.view', 'guard_name' => 'web', 'status' => 'active']);
        $role = Role::create(['name' => 'audit-viewer', 'guard_name' => 'web', 'status' => 'active']);
        $role->givePermissionTo('logs.view');
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        AuditLog::create(['action' => 'settings.updated']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/logs/audits?per_page=10')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['data', 'links', 'meta' => ['current_page', 'last_page', 'per_page', 'total']]]);
    }

    public function test_role_and_permission_crud_flow(): void
    {
        foreach (['roles.create', 'roles.view', 'roles.update', 'roles.delete', 'roles.restore', 'permissions.create', 'permissions.view', 'permissions.update', 'permissions.delete', 'permissions.restore'] as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web'], ['status' => 'active']);
        }

        $role = Role::create(['name' => 'rbac-admin', 'guard_name' => 'web', 'status' => 'active']);
        $role->givePermissionTo(Permission::pluck('name')->all());
        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        $permissionId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/permissions', ['name' => 'inventory.view', 'status' => 'active'])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->json('data.id');

        $roleId = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/roles', ['name' => 'inventory-manager', 'status' => 'active', 'permissions' => ['inventory.view']])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->json('data.id');

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/v1/roles/{$roleId}", ['name' => 'inventory-lead', 'status' => 'active', 'permissions' => ['inventory.view']])
            ->assertOk()
            ->assertJsonPath('data.name', 'inventory-lead');

        $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/roles/{$roleId}")->assertOk();
        $this->actingAs($user, 'sanctum')->getJson("/api/v1/roles/{$roleId}")->assertOk()->assertJsonPath('data.status', 'archived');
        $this->actingAs($user, 'sanctum')->postJson("/api/v1/roles/{$roleId}/restore")->assertOk();
        $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/permissions/{$permissionId}")->assertOk();
        $this->actingAs($user, 'sanctum')->postJson("/api/v1/permissions/{$permissionId}/restore")->assertOk();
    }
}
