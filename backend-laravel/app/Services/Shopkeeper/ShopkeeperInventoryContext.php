<?php

namespace App\Services\Shopkeeper;

use App\Support\ShopkeeperCache;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ShopkeeperInventoryContext
{
    public function activeShop(Request $request): ?object
    {
        return $request->user()->shops()
            ->wherePivot('status', 'active')
            ->orderByPivot('is_primary', 'desc')
            ->first();
    }

    public function optionsFor(object $shop): array
    {
        return Cache::remember(ShopkeeperCache::key('options', $shop->id), ShopkeeperCache::ttl('options'), fn () => [
            'shop' => $this->shopPayload($shop),
            'categories' => $this->optionRows('categories', $shop->id),
            'suppliers' => $this->optionRows('suppliers', $shop->id),
            'customers' => $this->optionRows('customers', $shop->id),
            'products' => DB::table('products')
                ->where('shop_id', $shop->id)
                ->whereNull('deleted_at')
                ->orderBy('name')
                ->limit((int) config('shopkeeper.option_limits.products', 300))
                ->get(['id', 'name', 'sku', 'stock_quantity', 'sale_price', 'purchase_price']),
        ]);
    }

    public function emptyOptions(): array
    {
        return [
            'shop' => null,
            'categories' => [],
            'suppliers' => [],
            'customers' => [],
            'products' => [],
        ];
    }

    public function emptyPaginator(Request $request): LengthAwarePaginator
    {
        return new LengthAwarePaginator([], 0, $this->perPage($request));
    }

    public function perPage(Request $request): int
    {
        return min(max($request->integer('per_page', 10), 1), 100);
    }

    public function isAllowedResource(string $resource): bool
    {
        return in_array($resource, config('shopkeeper.resources', []), true);
    }

    public function isEditableResource(string $resource): bool
    {
        return in_array($resource, config('shopkeeper.editable_resources', []), true);
    }

    public function timestamps(): array
    {
        return ['created_at' => now(), 'updated_at' => now()];
    }

    private function optionRows(string $table, int $shopId): object
    {
        return DB::table($table)
            ->where('shop_id', $shopId)
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->limit((int) config("shopkeeper.option_limits.{$table}", 200))
            ->get(['id', 'name']);
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
