<?php

namespace App\Services\Shopkeeper;

use App\Support\ShopkeeperCache;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ShopkeeperDashboardService
{
    public function forShop(object $shop): array
    {
        return Cache::remember(ShopkeeperCache::key('dashboard', $shop->id), ShopkeeperCache::ttl('dashboard'), function () use ($shop): array {
            $stats = $this->stats((int) $shop->id);

            return [
                'shop' => $this->shopPayload($shop),
                'stats' => $stats,
                'products' => $this->recentProducts((int) $shop->id)->map(fn ($product) => $this->productPayload($product)),
                'low_stock_products' => $this->lowStockProducts((int) $shop->id)->map(fn ($product) => $this->productPayload($product)),
                'chart' => $this->monthlyChart((int) $shop->id),
                'alerts' => $this->alerts($stats),
                'modules' => $this->modules(),
            ];
        });
    }

    public function empty(): array
    {
        return [
            'shop' => null,
            'stats' => [],
            'products' => [],
            'alerts' => ['No active shop is assigned to this account.'],
            'modules' => $this->modules(),
        ];
    }

    private function recentProducts(int $shopId): Collection
    {
        return $this->productsBaseQuery($shopId)
            ->orderByDesc('products.id')
            ->limit((int) config('shopkeeper.dashboard_limits.recent_products', 6))
            ->get();
    }

    private function lowStockProducts(int $shopId): Collection
    {
        return $this->productsBaseQuery($shopId)
            ->whereColumn('products.stock_quantity', '<=', 'products.reorder_level')
            ->orderBy('products.stock_quantity')
            ->limit((int) config('shopkeeper.dashboard_limits.low_stock_products', 8))
            ->get();
    }

    private function productsBaseQuery(int $shopId)
    {
        return DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('products.shop_id', $shopId)
            ->whereNull('products.deleted_at')
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.stock_quantity',
                'products.reorder_level',
                'products.sale_price',
                'categories.name as category',
            ]);
    }

    private function stats(int $shopId): array
    {
        $purchaseDue = (float) DB::table('purchases')
            ->where('shop_id', $shopId)
            ->sum(DB::raw('total_amount - paid_amount'));
        $salesDue = (float) DB::table('sales')
            ->where('shop_id', $shopId)
            ->sum(DB::raw('total_amount - paid_amount'));

        return [
            'products' => DB::table('products')->where('shop_id', $shopId)->whereNull('deleted_at')->count(),
            'low_stock' => DB::table('products')->where('shop_id', $shopId)->whereColumn('stock_quantity', '<=', 'reorder_level')->whereNull('deleted_at')->count(),
            'customers' => DB::table('customers')->where('shop_id', $shopId)->whereNull('deleted_at')->count(),
            'suppliers' => DB::table('suppliers')->where('shop_id', $shopId)->whereNull('deleted_at')->count(),
            'today_sales' => (float) DB::table('sales')->where('shop_id', $shopId)->whereDate('sale_date', now()->toDateString())->sum('total_amount'),
            'purchase_due' => $purchaseDue,
            'sales_due' => $salesDue,
            'pending_payments' => $purchaseDue + $salesDue,
            'purchase_invoice_count' => DB::table('purchases')->where('shop_id', $shopId)->count(),
            'sales_invoice_count' => DB::table('sales')->where('shop_id', $shopId)->count(),
            'stock_value' => (float) DB::table('products')->where('shop_id', $shopId)->whereNull('deleted_at')->sum(DB::raw('stock_quantity * purchase_price')),
            'monthly_expenses' => (float) DB::table('expenses')->where('shop_id', $shopId)->whereMonth('expense_date', now()->month)->whereYear('expense_date', now()->year)->sum('amount'),
        ];
    }

    private function productPayload(object $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'category' => $product->category,
            'stock' => (int) $product->stock_quantity,
            'reorder_level' => (int) $product->reorder_level,
            'sale_price' => (float) $product->sale_price,
            'status' => $product->stock_quantity <= 0 ? 'Out of stock' : ($product->stock_quantity <= $product->reorder_level ? 'Low stock' : 'In stock'),
        ];
    }

    private function monthlyChart(int $shopId): array
    {
        return collect(range(5, 0))
            ->map(function (int $monthsAgo) use ($shopId): array {
                $date = now()->subMonths($monthsAgo);

                return [
                    'month' => $date->format('M'),
                    'sales' => (float) DB::table('sales')
                        ->where('shop_id', $shopId)
                        ->whereMonth('sale_date', $date->month)
                        ->whereYear('sale_date', $date->year)
                        ->sum('total_amount'),
                    'purchase' => (float) DB::table('purchases')
                        ->where('shop_id', $shopId)
                        ->whereMonth('purchase_date', $date->month)
                        ->whereYear('purchase_date', $date->year)
                        ->sum('total_amount'),
                ];
            })
            ->values()
            ->all();
    }

    private function alerts(array $stats): array
    {
        return array_values(array_filter([
            $stats['low_stock'] > 0 ? "{$stats['low_stock']} products need reorder" : null,
            $stats['purchase_due'] > 0 ? 'Supplier purchase payments are pending' : null,
            $stats['sales_due'] > 0 ? 'Customer sales payments are pending' : null,
            $stats['monthly_expenses'] > 0 ? 'Monthly expenses are being tracked' : null,
        ]));
    }

    private function modules(): array
    {
        return config('shopkeeper.modules', []);
    }

    private function shopPayload(object $shop): array
    {
        return [
            'id' => $shop->id,
            'name' => $shop->name,
            'code' => $shop->code,
            'status' => $shop->status,
        ];
    }
}
