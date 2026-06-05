<?php

namespace App\Services\Shopkeeper;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShopkeeperInventoryReadService
{
    public function query(string $resource, int $shopId, ?Request $request = null): Builder
    {
        return match ($resource) {
            'products' => $this->productsQuery($shopId, $request),
            'stock' => $this->stockQuery($shopId, $request),
            'purchases' => $this->purchasesQuery($shopId, $request),
            'sales' => $this->salesQuery($shopId, $request),
            'customers' => $this->partyQuery('customers', $shopId, $request),
            'suppliers' => $this->partyQuery('suppliers', $shopId, $request),
            'returns' => $this->returnsQuery($shopId, $request),
            default => abort(404, 'Unknown shopkeeper resource'),
        };
    }

    public function reports(int $shopId): array
    {
        $sales = (float) DB::table('sales')->where('shop_id', $shopId)->sum('total_amount');
        $purchases = (float) DB::table('purchases')->where('shop_id', $shopId)->sum('total_amount');
        $expenses = (float) DB::table('expenses')->where('shop_id', $shopId)->sum('amount');
        $stockValue = (float) DB::table('products')->where('shop_id', $shopId)->whereNull('deleted_at')->sum(DB::raw('stock_quantity * purchase_price'));

        return [
            'summary' => [
                'total_sales' => $sales,
                'total_purchases' => $purchases,
                'expenses' => $expenses,
                'gross_profit' => $sales - $purchases - $expenses,
                'stock_value' => $stockValue,
                'low_stock' => DB::table('products')->where('shop_id', $shopId)->whereNull('deleted_at')->whereColumn('stock_quantity', '<=', 'reorder_level')->count(),
            ],
            'low_stock_products' => $this->productsQuery($shopId)->whereColumn('products.stock_quantity', '<=', 'products.reorder_level')->limit((int) config('shopkeeper.report_limits.low_stock_products', 10))->get(),
            'recent_sales' => $this->salesQuery($shopId)->limit((int) config('shopkeeper.report_limits.recent_sales', 10))->get(),
            'recent_purchases' => $this->purchasesQuery($shopId)->limit((int) config('shopkeeper.report_limits.recent_purchases', 10))->get(),
        ];
    }

    private function productsQuery(int $shopId, ?Request $request = null): Builder
    {
        $query = DB::table('products')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'products.supplier_id')
            ->where('products.shop_id', $shopId)
            ->whereNull('products.deleted_at')
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.barcode',
                'products.purchase_price',
                'products.sale_price',
                'products.stock_quantity',
                'products.reorder_level',
                'products.unit',
                'products.status',
                'products.category_id',
                'products.supplier_id',
                'categories.name as category',
                'suppliers.name as supplier',
            ]);

        return $this->searchAndSort($query, $request, ['products.name', 'products.sku', 'products.barcode'], 'products.name');
    }

    private function stockQuery(int $shopId, ?Request $request = null): Builder
    {
        $query = DB::table('stock_movements')
            ->join('products', 'products.id', '=', 'stock_movements.product_id')
            ->where('stock_movements.shop_id', $shopId)
            ->select([
                'stock_movements.id',
                'stock_movements.type',
                'stock_movements.quantity',
                'stock_movements.reference',
                'stock_movements.note',
                'stock_movements.moved_at',
                'products.name as product',
                'products.sku',
            ]);

        return $this->searchAndSort($query, $request, ['products.name', 'products.sku', 'stock_movements.reference'], 'stock_movements.id');
    }

    private function purchasesQuery(int $shopId, ?Request $request = null): Builder
    {
        $query = DB::table('purchases')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->leftJoin('purchase_items', 'purchase_items.purchase_id', '=', 'purchases.id')
            ->leftJoin('products', 'products.id', '=', 'purchase_items.product_id')
            ->where('purchases.shop_id', $shopId)
            ->select([
                'purchases.id',
                'purchases.invoice_no',
                'purchases.purchase_date',
                'purchases.total_amount',
                'purchases.paid_amount',
                'purchases.status',
                'suppliers.name as supplier',
                'products.name as product',
                'purchase_items.quantity',
                'purchase_items.unit_price',
            ]);

        return $this->searchAndSort($query, $request, ['purchases.invoice_no', 'suppliers.name', 'products.name'], 'purchases.id');
    }

    private function salesQuery(int $shopId, ?Request $request = null): Builder
    {
        $query = DB::table('sales')
            ->leftJoin('customers', 'customers.id', '=', 'sales.customer_id')
            ->leftJoin('sale_items', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.shop_id', $shopId)
            ->select([
                'sales.id',
                'sales.invoice_no',
                'sales.sale_date',
                'sales.total_amount',
                'sales.paid_amount',
                'sales.payment_status',
                'customers.name as customer',
                'products.name as product',
                'sale_items.quantity',
                'sale_items.unit_price',
            ]);

        return $this->searchAndSort($query, $request, ['sales.invoice_no', 'customers.name', 'products.name'], 'sales.id');
    }

    private function partyQuery(string $table, int $shopId, ?Request $request = null): Builder
    {
        $columns = [
            "{$table}.id",
            "{$table}.name",
            "{$table}.phone",
            "{$table}.email",
            "{$table}.address",
            "{$table}.status",
        ];

        if ($table === 'customers') {
            $columns[] = "{$table}.opening_balance";
        }

        $query = DB::table($table)->where('shop_id', $shopId)->whereNull('deleted_at')->select($columns);

        return $this->searchAndSort($query, $request, ["{$table}.name", "{$table}.phone", "{$table}.email"], "{$table}.name");
    }

    private function returnsQuery(int $shopId, ?Request $request = null): Builder
    {
        $query = DB::table('returns')
            ->join('products', 'products.id', '=', 'returns.product_id')
            ->where('returns.shop_id', $shopId)
            ->select([
                'returns.id',
                'returns.type',
                'returns.quantity',
                'returns.amount',
                'returns.return_date',
                'products.name as product',
                'products.sku',
            ]);

        return $this->searchAndSort($query, $request, ['products.name', 'products.sku', 'returns.type'], 'returns.id');
    }

    private function searchAndSort(Builder $query, ?Request $request, array $searchColumns, string $defaultSort): Builder
    {
        if ($request?->filled('search')) {
            $search = $request->string('search')->toString();
            if (mb_strlen(trim($search)) < (int) config('shopkeeper.search.min_length', 2)) {
                return $query->orderBy($defaultSort, $defaultSort === 'products.name' || str_ends_with($defaultSort, '.name') ? 'asc' : 'desc');
            }

            $query->where(function (Builder $query) use ($searchColumns, $search): void {
                foreach ($searchColumns as $column) {
                    $query->orWhere($column, 'like', '%'.$search.'%');
                }
            });
        }

        return $query->orderBy($defaultSort, $defaultSort === 'products.name' || str_ends_with($defaultSort, '.name') ? 'asc' : 'desc');
    }
}
