<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
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
            'shops.view', 'shops.create', 'shops.update', 'shops.delete', 'shops.restore',
            'shopkeeper.dashboard.view',
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

        $adminRole = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web'], ['status' => 'active']);
        $legacyAdminRole = Role::where('name', 'admin')->where('guard_name', 'web')->first();
        $shopkeeperRole = Role::firstOrCreate(['name' => 'Shopkeeper', 'guard_name' => 'web'], ['status' => 'active']);
        $userRole = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web'], ['status' => 'active']);

        $adminRole->syncPermissions($permissions);
        $legacyAdminRole?->syncPermissions($permissions);
        $shopkeeperRole->syncPermissions(['dashboard.view', 'shopkeeper.dashboard.view']);
        $userRole->syncPermissions(['dashboard.view']);

        $demoShop = Shop::firstOrCreate([
            'code' => 'MAIN',
        ], [
            'name' => 'Main Shop',
            'email' => 'shop@example.com',
            'phone' => '9999999999',
            'address' => 'Default business location',
            'status' => 'active',
        ]);

        $admin = User::updateOrCreate([
            'email' => env('ADMIN_EMAIL', 'admin@example.com'),
        ], [
            'name' => env('ADMIN_NAME', 'Admin User'),
            'password' => Hash::make(env('ADMIN_PASSWORD', 'Admin@123456')),
            'status' => 'active',
        ])->assignRole($adminRole);
        $admin->shops()->syncWithoutDetaching([$demoShop->id => ['is_primary' => true, 'status' => 'active']]);

        $shopkeeper = User::updateOrCreate([
            'email' => env('SHOPKEEPER_EMAIL', 'shopkeeper@example.com'),
        ], [
            'name' => env('SHOPKEEPER_NAME', 'Demo Shopkeeper'),
            'password' => Hash::make(env('SHOPKEEPER_PASSWORD', 'Shopkeeper@123456')),
            'status' => 'active',
        ]);
        $shopkeeper->assignRole($shopkeeperRole);
        $shopkeeper->shops()->syncWithoutDetaching([$demoShop->id => ['is_primary' => true, 'status' => 'active']]);

        $this->seedInventory($demoShop->id);

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

    private function seedInventory(int $shopId): void
    {
        $categories = [
            'Grocery',
            'Beverages',
            'Personal Care',
            'Household',
        ];
        $categoryIds = [];

        foreach ($categories as $category) {
            DB::table('categories')->updateOrInsert(
                ['shop_id' => $shopId, 'name' => $category],
                ['status' => 'active', 'updated_at' => now(), 'created_at' => now()]
            );
            $categoryIds[$category] = DB::table('categories')->where('shop_id', $shopId)->where('name', $category)->value('id');
        }

        $suppliers = [
            ['name' => 'Metro Wholesale', 'phone' => '9000011111'],
            ['name' => 'Freshline Distributors', 'phone' => '9000022222'],
            ['name' => 'Daily Essentials Supply', 'phone' => '9000033333'],
        ];
        $supplierIds = [];

        foreach ($suppliers as $supplier) {
            DB::table('suppliers')->updateOrInsert(
                ['shop_id' => $shopId, 'name' => $supplier['name']],
                $supplier + ['status' => 'active', 'updated_at' => now(), 'created_at' => now()]
            );
            $supplierIds[$supplier['name']] = DB::table('suppliers')->where('shop_id', $shopId)->where('name', $supplier['name'])->value('id');
        }

        $customers = [
            ['name' => 'Walk-in Customer', 'phone' => ''],
            ['name' => 'Amit Retail', 'phone' => '9111111111'],
            ['name' => 'Neha Stores', 'phone' => '9222222222'],
        ];

        foreach ($customers as $customer) {
            DB::table('customers')->updateOrInsert(
                ['shop_id' => $shopId, 'name' => $customer['name']],
                $customer + ['opening_balance' => 0, 'status' => 'active', 'updated_at' => now(), 'created_at' => now()]
            );
        }

        $products = [
            ['name' => 'Premium Rice 25kg', 'sku' => 'PR-25', 'category' => 'Grocery', 'supplier' => 'Metro Wholesale', 'purchase_price' => 1120, 'sale_price' => 1280, 'stock_quantity' => 18, 'reorder_level' => 8, 'unit' => 'bag'],
            ['name' => 'Cooking Oil 1L', 'sku' => 'CO-1L', 'category' => 'Grocery', 'supplier' => 'Freshline Distributors', 'purchase_price' => 126, 'sale_price' => 148, 'stock_quantity' => 6, 'reorder_level' => 10, 'unit' => 'bottle'],
            ['name' => 'Sugar 5kg', 'sku' => 'SG-5', 'category' => 'Grocery', 'supplier' => 'Metro Wholesale', 'purchase_price' => 210, 'sale_price' => 245, 'stock_quantity' => 0, 'reorder_level' => 6, 'unit' => 'pack'],
            ['name' => 'Tea Pack 500g', 'sku' => 'TP-500', 'category' => 'Beverages', 'supplier' => 'Daily Essentials Supply', 'purchase_price' => 155, 'sale_price' => 190, 'stock_quantity' => 31, 'reorder_level' => 8, 'unit' => 'pack'],
            ['name' => 'Toothpaste 200g', 'sku' => 'TT-200', 'category' => 'Personal Care', 'supplier' => 'Daily Essentials Supply', 'purchase_price' => 82, 'sale_price' => 105, 'stock_quantity' => 14, 'reorder_level' => 7, 'unit' => 'pcs'],
            ['name' => 'Detergent Powder 1kg', 'sku' => 'DP-1', 'category' => 'Household', 'supplier' => 'Freshline Distributors', 'purchase_price' => 94, 'sale_price' => 118, 'stock_quantity' => 22, 'reorder_level' => 9, 'unit' => 'pack'],
        ];

        foreach ($products as $product) {
            DB::table('products')->updateOrInsert(
                ['shop_id' => $shopId, 'sku' => $product['sku']],
                [
                    'category_id' => $categoryIds[$product['category']],
                    'supplier_id' => $supplierIds[$product['supplier']],
                    'name' => $product['name'],
                    'barcode' => $product['sku'].'-BAR',
                    'purchase_price' => $product['purchase_price'],
                    'sale_price' => $product['sale_price'],
                    'stock_quantity' => $product['stock_quantity'],
                    'reorder_level' => $product['reorder_level'],
                    'unit' => $product['unit'],
                    'status' => 'active',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        $riceId = DB::table('products')->where('shop_id', $shopId)->where('sku', 'PR-25')->value('id');
        $oilId = DB::table('products')->where('shop_id', $shopId)->where('sku', 'CO-1L')->value('id');
        $customerId = DB::table('customers')->where('shop_id', $shopId)->where('name', 'Walk-in Customer')->value('id');
        $supplierId = $supplierIds['Metro Wholesale'];

        DB::table('sales')->updateOrInsert(
            ['shop_id' => $shopId, 'invoice_no' => 'SALE-1001'],
            ['customer_id' => $customerId, 'sale_date' => now()->toDateString(), 'total_amount' => 2808, 'paid_amount' => 2808, 'payment_status' => 'paid', 'updated_at' => now(), 'created_at' => now()]
        );
        $saleId = DB::table('sales')->where('invoice_no', 'SALE-1001')->value('id');

        foreach ([[$riceId, 2, 1280], [$oilId, 4, 148]] as [$productId, $quantity, $price]) {
            DB::table('sale_items')->updateOrInsert(
                ['shop_id' => $shopId, 'sale_id' => $saleId, 'product_id' => $productId],
                ['quantity' => $quantity, 'unit_price' => $price, 'total_price' => $quantity * $price, 'updated_at' => now(), 'created_at' => now()]
            );
        }

        DB::table('purchases')->updateOrInsert(
            ['shop_id' => $shopId, 'invoice_no' => 'PUR-2201'],
            ['supplier_id' => $supplierId, 'purchase_date' => now()->subDay()->toDateString(), 'total_amount' => 7840, 'paid_amount' => 5000, 'status' => 'received', 'updated_at' => now(), 'created_at' => now()]
        );
        $purchaseId = DB::table('purchases')->where('invoice_no', 'PUR-2201')->value('id');
        DB::table('purchase_items')->updateOrInsert(
            ['shop_id' => $shopId, 'purchase_id' => $purchaseId, 'product_id' => $riceId],
            ['quantity' => 7, 'unit_price' => 1120, 'total_price' => 7840, 'updated_at' => now(), 'created_at' => now()]
        );

        foreach ([[$riceId, 'in', 7, 'PUR-2201'], [$riceId, 'out', 2, 'SALE-1001'], [$oilId, 'out', 4, 'SALE-1001']] as [$productId, $type, $quantity, $reference]) {
            DB::table('stock_movements')->updateOrInsert(
                ['shop_id' => $shopId, 'product_id' => $productId, 'type' => $type, 'reference' => $reference],
                ['quantity' => $quantity, 'note' => 'Demo movement', 'moved_at' => now(), 'updated_at' => now(), 'created_at' => now()]
            );
        }

        DB::table('expenses')->updateOrInsert(
            ['shop_id' => $shopId, 'title' => 'Shop electricity'],
            ['amount' => 1850, 'expense_date' => now()->toDateString(), 'updated_at' => now(), 'created_at' => now()]
        );
        DB::table('payments')->updateOrInsert(
            ['shop_id' => $shopId, 'party_type' => 'supplier', 'party_id' => $supplierId, 'status' => 'pending'],
            ['amount' => 2840, 'method' => 'bank', 'payment_date' => now()->toDateString(), 'updated_at' => now(), 'created_at' => now()]
        );
        DB::table('returns')->updateOrInsert(
            ['shop_id' => $shopId, 'product_id' => $oilId, 'type' => 'customer'],
            ['quantity' => 1, 'amount' => 148, 'return_date' => now()->toDateString(), 'updated_at' => now(), 'created_at' => now()]
        );
        DB::table('invoices')->updateOrInsert(
            ['shop_id' => $shopId, 'invoice_no' => 'INV-1001'],
            ['sale_id' => $saleId, 'status' => 'issued', 'invoice_date' => now()->toDateString(), 'updated_at' => now(), 'created_at' => now()]
        );
    }
}
