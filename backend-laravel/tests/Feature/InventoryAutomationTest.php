<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Auth\Notifications\ResetPassword;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class InventoryAutomationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_login_rejects_bad_password_and_inactive_account(): void
    {
        Role::create(['name' => 'Admin', 'guard_name' => 'web', 'status' => 'active']);
        $inactive = User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => Hash::make('Password@123'),
            'status' => 'inactive',
        ]);
        $inactive->assignRole('Admin');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'Password@123',
        ])
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_forgot_password_can_generate_reset_link(): void
    {
        Notification::fake();
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'status' => 'active',
        ]);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'reset@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('success', true);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_shopkeeper_store_requires_an_active_shop_assignment(): void
    {
        $user = $this->shopkeeperUser(assignShop: false);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shopkeeper/products', [
                'name' => 'No Shop Product',
                'sku' => 'NO-SHOP-1',
                'category_name' => 'General',
                'purchase_price' => 10,
                'sale_price' => 12,
                'stock_quantity' => 1,
                'reorder_level' => 1,
                'unit' => 'pcs',
                'status' => 'active',
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_shopkeeper_listing_caps_large_per_page_requests(): void
    {
        $user = $this->shopkeeperUser();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/shopkeeper/products?per_page=1000')
            ->assertOk()
            ->assertJsonPath('data.meta.per_page', 100);
    }

    public function test_inventory_rejects_overselling_and_keeps_stock_unchanged(): void
    {
        [$user, $shop] = $this->shopkeeperUserWithShop();
        $productId = $this->product($shop->id, stock: 2);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shopkeeper/sales', [
                'product_id' => $productId,
                'sale_date' => now()->toDateString(),
                'quantity' => 3,
                'unit_price' => 50,
                'paid_amount' => 150,
                'payment_status' => 'paid',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false);

        $this->assertSame(2, DB::table('products')->where('id', $productId)->value('stock_quantity'));
        $this->assertDatabaseMissing('sales', ['shop_id' => $shop->id]);
    }

    public function test_inventory_rejects_paid_amount_greater_than_total(): void
    {
        [$user, $shop] = $this->shopkeeperUserWithShop();
        $productId = $this->product($shop->id, stock: 5);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shopkeeper/sales', [
                'product_id' => $productId,
                'sale_date' => now()->toDateString(),
                'quantity' => 2,
                'unit_price' => 50,
                'paid_amount' => 101,
                'payment_status' => 'paid',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false);

        $this->assertSame(5, DB::table('products')->where('id', $productId)->value('stock_quantity'));
    }

    public function test_shopkeeper_cannot_post_inventory_against_another_shop_product(): void
    {
        [$user] = $this->shopkeeperUserWithShop();
        $otherShop = Shop::create(['name' => 'Other Shop', 'code' => 'OTHER', 'status' => 'active']);
        $otherProductId = $this->product($otherShop->id, sku: 'OTHER-1', stock: 9);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shopkeeper/stock', [
                'product_id' => $otherProductId,
                'type' => 'out',
                'quantity' => 1,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('product_id');

        $this->assertSame(9, DB::table('products')->where('id', $otherProductId)->value('stock_quantity'));
    }

    public function test_shopkeeper_can_create_customer_with_address(): void
    {
        [$user] = $this->shopkeeperUserWithShop();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shopkeeper/customers', [
                'name' => 'Address Customer',
                'phone' => '9000001111',
                'email' => 'address.customer@example.com',
                'address' => 'Customer billing address',
                'opening_balance' => 100,
                'status' => 'active',
            ])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.address', 'Customer billing address');
    }

    public function test_unknown_or_read_only_shopkeeper_resources_are_rejected(): void
    {
        $user = $this->shopkeeperUser();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/shopkeeper/not-a-resource')
            ->assertNotFound()
            ->assertJsonPath('success', false);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shopkeeper/reports', [])
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    private function shopkeeperUser(bool $assignShop = true): User
    {
        [$user] = $this->shopkeeperUserWithShop($assignShop);

        return $user;
    }

    private function shopkeeperUserWithShop(bool $assignShop = true): array
    {
        Permission::firstOrCreate(['name' => 'shopkeeper.dashboard.view', 'guard_name' => 'web'], ['status' => 'active']);
        $role = Role::firstOrCreate(['name' => 'Shopkeeper', 'guard_name' => 'web'], ['status' => 'active']);
        $role->givePermissionTo('shopkeeper.dashboard.view');

        $shop = Shop::create([
            'name' => 'Automation Shop',
            'code' => 'AUTO-'.uniqid(),
            'status' => 'active',
        ]);

        $user = User::factory()->create(['status' => 'active']);
        $user->assignRole($role);

        if ($assignShop) {
            $user->shops()->attach($shop->id, ['is_primary' => true, 'status' => 'active']);
        }

        return [$user, $shop];
    }

    private function product(int $shopId, string $sku = 'AUTO-PROD-1', int $stock = 5): int
    {
        $categoryId = DB::table('categories')->insertGetId([
            'shop_id' => $shopId,
            'name' => 'Automation Category '.uniqid(),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('products')->insertGetId([
            'shop_id' => $shopId,
            'category_id' => $categoryId,
            'name' => 'Automation Product',
            'sku' => $sku,
            'purchase_price' => 30,
            'sale_price' => 50,
            'stock_quantity' => $stock,
            'reorder_level' => 2,
            'unit' => 'pcs',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
