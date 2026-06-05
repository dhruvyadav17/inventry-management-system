<?php

namespace Database\Seeders;

use App\Models\Shop;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LargeInventorySeeder extends Seeder
{
    public function run(): void
    {
        if (! config('seeding.large_inventory.enabled')) {
            return;
        }

        $shop = Shop::where('code', 'MAIN')->first();

        if (! $shop) {
            return;
        }

        $shopId = (int) $shop->id;
        $chunk = (int) config('seeding.large_inventory.chunk', 500);
        $now = now();

        $categoryIds = DB::table('categories')
            ->where('shop_id', $shopId)
            ->pluck('id', 'name')
            ->all();

        if ($categoryIds === []) {
            return;
        }

        $supplierIds = $this->seedSuppliers($shopId, $now, $chunk);
        $customerIds = $this->seedCustomers($shopId, $now, $chunk);
        $productIds = $this->seedProducts($shopId, $categoryIds, $supplierIds, $now, $chunk);

        $this->seedPurchases($shopId, $supplierIds, $productIds, $now, $chunk);
        $this->seedSales($shopId, $customerIds, $productIds, $now, $chunk);
        $this->seedExpenses($shopId, $now, $chunk);
    }

    private function seedSuppliers(int $shopId, mixed $now, int $chunk): array
    {
        $rows = [];
        $count = (int) config('seeding.large_inventory.suppliers', 100);

        for ($i = 1; $i <= $count; $i++) {
            $rows[] = [
                'shop_id' => $shopId,
                'name' => "Bulk Supplier {$i}",
                'phone' => '98'.str_pad((string) $i, 8, '0', STR_PAD_LEFT),
                'email' => "supplier{$i}@example.com",
                'address' => "Supplier market block {$i}",
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, $chunk) as $batch) {
            DB::table('suppliers')->insertOrIgnore($batch);
        }

        return DB::table('suppliers')->where('shop_id', $shopId)->pluck('id')->all();
    }

    private function seedCustomers(int $shopId, mixed $now, int $chunk): array
    {
        $rows = [];
        $count = (int) config('seeding.large_inventory.customers', 500);

        for ($i = 1; $i <= $count; $i++) {
            $rows[] = [
                'shop_id' => $shopId,
                'name' => "Bulk Customer {$i}",
                'phone' => '97'.str_pad((string) $i, 8, '0', STR_PAD_LEFT),
                'email' => "customer{$i}@example.com",
                'opening_balance' => $i % 7 === 0 ? 250 : 0,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, $chunk) as $batch) {
            DB::table('customers')->insertOrIgnore($batch);
        }

        return DB::table('customers')->where('shop_id', $shopId)->pluck('id')->all();
    }

    private function seedProducts(int $shopId, array $categoryIds, array $supplierIds, mixed $now, int $chunk): array
    {
        $rows = [];
        $count = (int) config('seeding.large_inventory.products', 1000);
        $categoryValues = array_values($categoryIds);
        $supplierValues = array_values($supplierIds);

        for ($i = 1; $i <= $count; $i++) {
            $purchase = 40 + ($i % 180);
            $rows[] = [
                'shop_id' => $shopId,
                'category_id' => $categoryValues[$i % count($categoryValues)],
                'supplier_id' => $supplierValues[$i % count($supplierValues)] ?? null,
                'name' => 'Bulk Product '.str_pad((string) $i, 5, '0', STR_PAD_LEFT),
                'sku' => 'BULK-'.str_pad((string) $i, 5, '0', STR_PAD_LEFT),
                'barcode' => 'BULK-BAR-'.$i,
                'purchase_price' => $purchase,
                'sale_price' => $purchase + 15 + ($i % 30),
                'stock_quantity' => 20 + ($i % 80),
                'reorder_level' => 10,
                'unit' => 'pcs',
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, $chunk) as $batch) {
            DB::table('products')->insertOrIgnore($batch);
        }

        return DB::table('products')->where('shop_id', $shopId)->pluck('id')->all();
    }

    private function seedPurchases(int $shopId, array $supplierIds, array $productIds, mixed $now, int $chunk): void
    {
        $purchaseRows = [];
        $itemRows = [];
        $movementRows = [];
        $count = (int) config('seeding.large_inventory.purchases', 500);

        for ($i = 1; $i <= $count; $i++) {
            $quantity = 5 + ($i % 15);
            $unitPrice = 50 + ($i % 120);
            $total = $quantity * $unitPrice;
            $purchaseRows[] = [
                'id' => 100000 + $i,
                'shop_id' => $shopId,
                'supplier_id' => $supplierIds[$i % count($supplierIds)] ?? null,
                'invoice_no' => 'BULK-PUR-'.$i,
                'purchase_date' => now()->subDays($i % 90)->toDateString(),
                'total_amount' => $total,
                'paid_amount' => $i % 4 === 0 ? round($total / 2, 2) : $total,
                'status' => 'received',
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $productId = $productIds[$i % count($productIds)];
            $itemRows[] = [
                'shop_id' => $shopId,
                'purchase_id' => 100000 + $i,
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $total,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $movementRows[] = [
                'shop_id' => $shopId,
                'product_id' => $productId,
                'type' => 'in',
                'quantity' => $quantity,
                'reference' => 'BULK-PUR-'.$i,
                'note' => 'Bulk seed purchase',
                'moved_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($purchaseRows, $chunk) as $batch) {
            DB::table('purchases')->insertOrIgnore($batch);
        }
        foreach (array_chunk($itemRows, $chunk) as $batch) {
            DB::table('purchase_items')->insertOrIgnore($batch);
        }
        foreach (array_chunk($movementRows, $chunk) as $batch) {
            DB::table('stock_movements')->insertOrIgnore($batch);
        }
    }

    private function seedSales(int $shopId, array $customerIds, array $productIds, mixed $now, int $chunk): void
    {
        $saleRows = [];
        $itemRows = [];
        $invoiceRows = [];
        $movementRows = [];
        $count = (int) config('seeding.large_inventory.sales', 1000);

        for ($i = 1; $i <= $count; $i++) {
            $quantity = 1 + ($i % 5);
            $unitPrice = 80 + ($i % 180);
            $total = $quantity * $unitPrice;
            $invoiceNo = 'BULK-SALE-'.$i;
            $productId = $productIds[$i % count($productIds)];
            $saleRows[] = [
                'id' => 200000 + $i,
                'shop_id' => $shopId,
                'customer_id' => $customerIds[$i % count($customerIds)] ?? null,
                'invoice_no' => $invoiceNo,
                'sale_date' => now()->subDays($i % 90)->toDateString(),
                'total_amount' => $total,
                'paid_amount' => $i % 6 === 0 ? round($total / 2, 2) : $total,
                'payment_status' => $i % 6 === 0 ? 'partial' : 'paid',
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $itemRows[] = [
                'shop_id' => $shopId,
                'sale_id' => 200000 + $i,
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $total,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $invoiceRows[] = [
                'shop_id' => $shopId,
                'sale_id' => 200000 + $i,
                'invoice_no' => 'INV-BULK-'.$i,
                'status' => 'issued',
                'invoice_date' => now()->subDays($i % 90)->toDateString(),
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $movementRows[] = [
                'shop_id' => $shopId,
                'product_id' => $productId,
                'type' => 'out',
                'quantity' => $quantity,
                'reference' => $invoiceNo,
                'note' => 'Bulk seed sale',
                'moved_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($saleRows, $chunk) as $batch) {
            DB::table('sales')->insertOrIgnore($batch);
        }
        foreach (array_chunk($itemRows, $chunk) as $batch) {
            DB::table('sale_items')->insertOrIgnore($batch);
        }
        foreach (array_chunk($invoiceRows, $chunk) as $batch) {
            DB::table('invoices')->insertOrIgnore($batch);
        }
        foreach (array_chunk($movementRows, $chunk) as $batch) {
            DB::table('stock_movements')->insertOrIgnore($batch);
        }
    }

    private function seedExpenses(int $shopId, mixed $now, int $chunk): void
    {
        $rows = [];

        for ($i = 1; $i <= 180; $i++) {
            $rows[] = [
                'shop_id' => $shopId,
                'title' => "Bulk Expense {$i}",
                'amount' => 100 + ($i % 900),
                'expense_date' => now()->subDays($i % 180)->toDateString(),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, $chunk) as $batch) {
            DB::table('expenses')->insertOrIgnore($batch);
        }
    }
}
