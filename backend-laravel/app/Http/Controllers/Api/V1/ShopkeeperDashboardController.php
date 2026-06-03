<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShopkeeperDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $shop = $request->user()->shops()
            ->wherePivot('status', 'active')
            ->orderByPivot('is_primary', 'desc')
            ->first();

        if (! $shop) {
            return ApiResponse::success([
                'shop' => null,
                'stats' => [],
                'products' => [],
                'alerts' => ['No active shop is assigned to this account.'],
                'modules' => $this->modules(),
            ]);
        }

        $products = DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('products.shop_id', $shop->id)
            ->whereNull('products.deleted_at')
            ->orderBy('products.stock_quantity')
            ->limit(8)
            ->get([
                'products.id',
                'products.name',
                'products.sku',
                'products.stock_quantity',
                'products.reorder_level',
                'products.sale_price',
                'categories.name as category',
            ]);

        $todaySales = DB::table('sales')
            ->where('shop_id', $shop->id)
            ->whereDate('sale_date', now()->toDateString())
            ->sum('total_amount');

        $lowStockCount = DB::table('products')
            ->where('shop_id', $shop->id)
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->whereNull('deleted_at')
            ->count();

        $stats = [
            'products' => DB::table('products')->where('shop_id', $shop->id)->whereNull('deleted_at')->count(),
            'low_stock' => $lowStockCount,
            'customers' => DB::table('customers')->where('shop_id', $shop->id)->whereNull('deleted_at')->count(),
            'suppliers' => DB::table('suppliers')->where('shop_id', $shop->id)->whereNull('deleted_at')->count(),
            'today_sales' => (float) $todaySales,
            'pending_payments' => (float) DB::table('payments')->where('shop_id', $shop->id)->where('status', 'pending')->sum('amount'),
            'monthly_expenses' => (float) DB::table('expenses')
                ->where('shop_id', $shop->id)
                ->whereMonth('expense_date', now()->month)
                ->whereYear('expense_date', now()->year)
                ->sum('amount'),
        ];

        return ApiResponse::success([
            'shop' => [
                'id' => $shop->id,
                'name' => $shop->name,
                'code' => $shop->code,
                'status' => $shop->status,
            ],
            'stats' => $stats,
            'products' => $products->map(fn ($product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category,
                'stock' => (int) $product->stock_quantity,
                'reorder_level' => (int) $product->reorder_level,
                'sale_price' => (float) $product->sale_price,
                'status' => $product->stock_quantity <= 0 ? 'Out of stock' : ($product->stock_quantity <= $product->reorder_level ? 'Low stock' : 'In stock'),
            ]),
            'alerts' => $this->alerts($stats),
            'modules' => $this->modules(),
        ]);
    }

    private function alerts(array $stats): array
    {
        return array_values(array_filter([
            $stats['low_stock'] > 0 ? "{$stats['low_stock']} products need reorder" : null,
            $stats['pending_payments'] > 0 ? 'Supplier or customer payments are pending' : null,
            $stats['monthly_expenses'] > 0 ? 'Monthly expenses are being tracked' : null,
        ]));
    }

    private function modules(): array
    {
        return [
            ['name' => 'Products', 'icon' => 'bi-box-seam', 'path' => '/shopkeeper/products'],
            ['name' => 'Stock Movement', 'icon' => 'bi-arrow-left-right', 'path' => '/shopkeeper/stock'],
            ['name' => 'Purchases', 'icon' => 'bi-bag-plus', 'path' => '/shopkeeper/purchases'],
            ['name' => 'Sales Billing', 'icon' => 'bi-receipt', 'path' => '/shopkeeper/sales'],
            ['name' => 'Customers', 'icon' => 'bi-person-lines-fill', 'path' => '/shopkeeper/customers'],
            ['name' => 'Suppliers', 'icon' => 'bi-truck', 'path' => '/shopkeeper/suppliers'],
            ['name' => 'Returns', 'icon' => 'bi-arrow-counterclockwise', 'path' => '/shopkeeper/returns'],
            ['name' => 'Reports', 'icon' => 'bi-graph-up-arrow', 'path' => '/shopkeeper/reports'],
        ];
    }
}
