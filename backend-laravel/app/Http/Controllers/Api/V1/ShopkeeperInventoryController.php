<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use App\Support\ShopkeeperCache;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ShopkeeperInventoryController extends Controller
{
    public function options(Request $request): JsonResponse
    {
        $shop = $this->activeShop($request);

        if (! $shop) {
            return ApiResponse::success($this->emptyOptions());
        }

        $options = Cache::remember(ShopkeeperCache::key('options', $shop->id), ShopkeeperCache::ttl('options'), fn () => [
            'shop' => $this->shopPayload($shop),
            'categories' => $this->optionRows('categories', $shop->id),
            'suppliers' => $this->optionRows('suppliers', $shop->id),
            'customers' => $this->optionRows('customers', $shop->id),
            'products' => DB::table('products')
                ->where('shop_id', $shop->id)
                ->whereNull('deleted_at')
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'stock_quantity', 'sale_price', 'purchase_price']),
        ]);

        return ApiResponse::success($options);
    }

    public function index(Request $request, string $resource): JsonResponse
    {
        $shop = $this->activeShop($request);

        if (! $shop) {
            return ApiResponse::paginator($this->emptyPaginator($request));
        }

        if ($resource === 'reports') {
            return ApiResponse::success(Cache::remember(
                ShopkeeperCache::key('reports', $shop->id),
                ShopkeeperCache::ttl('reports'),
                fn () => $this->reports($shop->id),
            ));
        }

        return match ($resource) {
            'products' => ApiResponse::paginator($this->productsQuery($shop->id, $request)->paginate($this->perPage($request))),
            'stock' => ApiResponse::paginator($this->stockQuery($shop->id, $request)->paginate($this->perPage($request))),
            'purchases' => ApiResponse::paginator($this->purchasesQuery($shop->id, $request)->paginate($this->perPage($request))),
            'sales' => ApiResponse::paginator($this->salesQuery($shop->id, $request)->paginate($this->perPage($request))),
            'customers' => ApiResponse::paginator($this->partyQuery('customers', $shop->id, $request)->paginate($this->perPage($request))),
            'suppliers' => ApiResponse::paginator($this->partyQuery('suppliers', $shop->id, $request)->paginate($this->perPage($request))),
            'returns' => ApiResponse::paginator($this->returnsQuery($shop->id, $request)->paginate($this->perPage($request))),
            default => ApiResponse::error('Unknown shopkeeper resource', Response::HTTP_NOT_FOUND),
        };
    }

    public function store(Request $request, string $resource): JsonResponse
    {
        $shop = $this->activeShop($request);

        if (! $shop) {
            return ApiResponse::error('No active shop is assigned to this account.', Response::HTTP_FORBIDDEN);
        }

        $response = match ($resource) {
            'products' => $this->storeProduct($request, $shop->id),
            'stock' => $this->storeStockMovement($request, $shop->id),
            'purchases' => $this->storePurchase($request, $shop->id),
            'sales' => $this->storeSale($request, $shop->id),
            'customers' => $this->storeParty($request, 'customers', $shop->id),
            'suppliers' => $this->storeParty($request, 'suppliers', $shop->id),
            'returns' => $this->storeReturn($request, $shop->id),
            default => ApiResponse::error('Unknown shopkeeper resource', Response::HTTP_NOT_FOUND),
        };

        ShopkeeperCache::clear($shop->id);

        return $response;
    }

    public function update(Request $request, string $resource, int $id): JsonResponse
    {
        $shop = $this->activeShop($request);

        if (! $shop) {
            return ApiResponse::error('No active shop is assigned to this account.', Response::HTTP_FORBIDDEN);
        }

        $response = match ($resource) {
            'products' => $this->updateProduct($request, $shop->id, $id),
            'customers' => $this->updateParty($request, 'customers', $shop->id, $id),
            'suppliers' => $this->updateParty($request, 'suppliers', $shop->id, $id),
            default => ApiResponse::error('This resource cannot be edited after posting.', Response::HTTP_BAD_REQUEST),
        };

        ShopkeeperCache::clear($shop->id);

        return $response;
    }

    public function destroy(Request $request, string $resource, int $id): JsonResponse
    {
        $shop = $this->activeShop($request);

        if (! $shop) {
            return ApiResponse::error('No active shop is assigned to this account.', Response::HTTP_FORBIDDEN);
        }

        $response = match ($resource) {
            'products' => $this->archiveRow('products', $shop->id, $id),
            'customers' => $this->archiveRow('customers', $shop->id, $id),
            'suppliers' => $this->archiveRow('suppliers', $shop->id, $id),
            default => ApiResponse::error('This resource cannot be archived.', Response::HTTP_BAD_REQUEST),
        };

        ShopkeeperCache::clear($shop->id);

        return $response;
    }

    private function storeProduct(Request $request, int $shopId): JsonResponse
    {
        $data = $request->validate($this->productRules($shopId));
        $data['shop_id'] = $shopId;
        $data['category_id'] = $this->categoryId($shopId, $data['category_id'] ?? null, $data['category_name'] ?? null);
        unset($data['category_name']);

        $id = DB::table('products')->insertGetId($data + $this->timestamps());

        return ApiResponse::success($this->productsQuery($shopId)->where('products.id', $id)->first(), 'Product created', 201);
    }

    private function updateProduct(Request $request, int $shopId, int $id): JsonResponse
    {
        $this->requireRow('products', $shopId, $id);
        $data = $request->validate($this->productRules($shopId, $id));
        $data['category_id'] = $this->categoryId($shopId, $data['category_id'] ?? null, $data['category_name'] ?? null);
        unset($data['category_name']);

        DB::table('products')->where('shop_id', $shopId)->where('id', $id)->update($data + ['updated_at' => now()]);

        return ApiResponse::success($this->productsQuery($shopId)->where('products.id', $id)->first(), 'Product updated');
    }

    private function storeParty(Request $request, string $table, int $shopId): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'opening_balance' => [$table === 'customers' ? 'nullable' : 'exclude', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $data['shop_id'] = $shopId;
        $id = DB::table($table)->insertGetId($data + $this->timestamps());

        return ApiResponse::success($this->partyQuery($table, $shopId)->where("{$table}.id", $id)->first(), ucfirst(rtrim($table, 's')).' created', 201);
    }

    private function updateParty(Request $request, string $table, int $shopId, int $id): JsonResponse
    {
        $this->requireRow($table, $shopId, $id);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'opening_balance' => [$table === 'customers' ? 'nullable' : 'exclude', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        DB::table($table)->where('shop_id', $shopId)->where('id', $id)->update($data + ['updated_at' => now()]);

        return ApiResponse::success($this->partyQuery($table, $shopId)->where("{$table}.id", $id)->first(), ucfirst(rtrim($table, 's')).' updated');
    }

    private function storeStockMovement(Request $request, int $shopId): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'type' => ['required', Rule::in(['in', 'out', 'adjustment'])],
            'quantity' => ['required', 'integer', 'min:1'],
            'reference' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($data, $shopId): JsonResponse {
            $product = DB::table('products')->where('shop_id', $shopId)->where('id', $data['product_id'])->lockForUpdate()->first();
            $stock = $this->nextStock((int) $product->stock_quantity, $data['type'], (int) $data['quantity']);

            if ($stock < 0) {
                return ApiResponse::error('Stock cannot go below zero.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            DB::table('products')->where('id', $product->id)->update(['stock_quantity' => $stock, 'updated_at' => now()]);
            $id = DB::table('stock_movements')->insertGetId([
                'shop_id' => $shopId,
                'product_id' => $product->id,
                'type' => $data['type'],
                'quantity' => $data['quantity'],
                'reference' => $data['reference'] ?? null,
                'note' => $data['note'] ?? null,
                'moved_at' => now(),
            ] + $this->timestamps());

            return ApiResponse::success($this->stockQuery($shopId)->where('stock_movements.id', $id)->first(), 'Stock updated', 201);
        });
    }

    private function storePurchase(Request $request, int $shopId): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => ['nullable', Rule::exists('suppliers', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'product_id' => ['required', Rule::exists('products', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'invoice_no' => ['nullable', 'string', 'max:255'],
            'purchase_date' => ['required', 'date'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['ordered', 'received'])],
        ]);

        return DB::transaction(function () use ($data, $shopId): JsonResponse {
            $total = round((float) $data['unit_price'] * (int) $data['quantity'], 2);
            $purchaseId = DB::table('purchases')->insertGetId([
                'shop_id' => $shopId,
                'supplier_id' => $data['supplier_id'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? 'PUR-'.now()->format('YmdHis'),
                'purchase_date' => $data['purchase_date'],
                'total_amount' => $total,
                'paid_amount' => $data['paid_amount'] ?? 0,
                'status' => $data['status'],
            ] + $this->timestamps());

            DB::table('purchase_items')->insert([
                'shop_id' => $shopId,
                'purchase_id' => $purchaseId,
                'product_id' => $data['product_id'],
                'quantity' => $data['quantity'],
                'unit_price' => $data['unit_price'],
                'total_price' => $total,
            ] + $this->timestamps());

            if ($data['status'] === 'received') {
                $this->incrementProduct($shopId, (int) $data['product_id'], (int) $data['quantity']);
                $this->recordMovement($shopId, (int) $data['product_id'], 'in', (int) $data['quantity'], DB::table('purchases')->where('id', $purchaseId)->value('invoice_no'));
            }

            return ApiResponse::success($this->purchasesQuery($shopId)->where('purchases.id', $purchaseId)->first(), 'Purchase recorded', 201);
        });
    }

    private function storeSale(Request $request, int $shopId): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['nullable', Rule::exists('customers', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'product_id' => ['required', Rule::exists('products', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'invoice_no' => ['nullable', 'string', 'max:255'],
            'sale_date' => ['required', 'date'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_status' => ['required', Rule::in(['paid', 'partial', 'due'])],
        ]);

        return DB::transaction(function () use ($data, $shopId): JsonResponse {
            $product = DB::table('products')->where('shop_id', $shopId)->where('id', $data['product_id'])->lockForUpdate()->first();
            $stock = (int) $product->stock_quantity - (int) $data['quantity'];

            if ($stock < 0) {
                return ApiResponse::error('Not enough stock available.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $total = round((float) $data['unit_price'] * (int) $data['quantity'], 2);
            $saleId = DB::table('sales')->insertGetId([
                'shop_id' => $shopId,
                'customer_id' => $data['customer_id'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? 'SALE-'.now()->format('YmdHis'),
                'sale_date' => $data['sale_date'],
                'total_amount' => $total,
                'paid_amount' => $data['paid_amount'] ?? 0,
                'payment_status' => $data['payment_status'],
            ] + $this->timestamps());

            DB::table('sale_items')->insert([
                'shop_id' => $shopId,
                'sale_id' => $saleId,
                'product_id' => $product->id,
                'quantity' => $data['quantity'],
                'unit_price' => $data['unit_price'],
                'total_price' => $total,
            ] + $this->timestamps());

            DB::table('products')->where('id', $product->id)->update(['stock_quantity' => $stock, 'updated_at' => now()]);
            $invoiceNo = DB::table('sales')->where('id', $saleId)->value('invoice_no');
            $this->recordMovement($shopId, (int) $product->id, 'out', (int) $data['quantity'], $invoiceNo);
            DB::table('invoices')->insert([
                'shop_id' => $shopId,
                'sale_id' => $saleId,
                'invoice_no' => 'INV-'.$invoiceNo,
                'status' => 'issued',
                'invoice_date' => $data['sale_date'],
            ] + $this->timestamps());

            return ApiResponse::success($this->salesQuery($shopId)->where('sales.id', $saleId)->first(), 'Sale recorded', 201);
        });
    }

    private function storeReturn(Request $request, int $shopId): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'type' => ['required', Rule::in(['customer', 'supplier'])],
            'quantity' => ['required', 'integer', 'min:1'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'return_date' => ['required', 'date'],
        ]);

        return DB::transaction(function () use ($data, $shopId): JsonResponse {
            $movement = $data['type'] === 'customer' ? 'in' : 'out';
            $product = DB::table('products')->where('shop_id', $shopId)->where('id', $data['product_id'])->lockForUpdate()->first();
            $stock = $this->nextStock((int) $product->stock_quantity, $movement, (int) $data['quantity']);

            if ($stock < 0) {
                return ApiResponse::error('Stock cannot go below zero.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $id = DB::table('returns')->insertGetId([
                'shop_id' => $shopId,
                'product_id' => $product->id,
                'type' => $data['type'],
                'quantity' => $data['quantity'],
                'amount' => $data['amount'] ?? 0,
                'return_date' => $data['return_date'],
            ] + $this->timestamps());

            DB::table('products')->where('id', $product->id)->update(['stock_quantity' => $stock, 'updated_at' => now()]);
            $this->recordMovement($shopId, (int) $product->id, $movement, (int) $data['quantity'], strtoupper($data['type']).'-RETURN');

            return ApiResponse::success($this->returnsQuery($shopId)->where('returns.id', $id)->first(), 'Return recorded', 201);
        });
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

    private function reports(int $shopId): array
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
            'low_stock_products' => $this->productsQuery($shopId)->whereColumn('products.stock_quantity', '<=', 'products.reorder_level')->limit(10)->get(),
            'recent_sales' => $this->salesQuery($shopId)->limit(10)->get(),
            'recent_purchases' => $this->purchasesQuery($shopId)->limit(10)->get(),
        ];
    }

    private function productRules(int $shopId, ?int $id = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:255', Rule::unique('products')->where('shop_id', $shopId)->ignore($id)],
            'barcode' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'category_name' => ['nullable', 'string', 'max:255'],
            'supplier_id' => ['nullable', Rule::exists('suppliers', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'purchase_price' => ['required', 'numeric', 'min:0'],
            'sale_price' => ['required', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'unit' => ['required', 'string', 'max:40'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ];
    }

    private function searchAndSort(Builder $query, ?Request $request, array $searchColumns, string $defaultSort): Builder
    {
        if ($request?->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function (Builder $query) use ($searchColumns, $search): void {
                foreach ($searchColumns as $column) {
                    $query->orWhere($column, 'like', '%'.$search.'%');
                }
            });
        }

        return $query->orderBy($defaultSort, $defaultSort === 'products.name' || str_ends_with($defaultSort, '.name') ? 'asc' : 'desc');
    }

    private function categoryId(int $shopId, ?int $categoryId, ?string $categoryName): int
    {
        if ($categoryId) {
            return $categoryId;
        }

        $name = trim((string) $categoryName);

        if ($name === '') {
            abort(Response::HTTP_UNPROCESSABLE_ENTITY, 'Category is required.');
        }

        $existing = DB::table('categories')->where('shop_id', $shopId)->where('name', $name)->whereNull('deleted_at')->value('id');

        if ($existing) {
            return (int) $existing;
        }

        return DB::table('categories')->insertGetId([
            'shop_id' => $shopId,
            'name' => $name,
            'status' => 'active',
        ] + $this->timestamps());
    }

    private function activeShop(Request $request): ?object
    {
        return $request->user()->shops()
            ->wherePivot('status', 'active')
            ->orderByPivot('is_primary', 'desc')
            ->first();
    }

    private function optionRows(string $table, int $shopId): object
    {
        return DB::table($table)
            ->where('shop_id', $shopId)
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    private function emptyOptions(): array
    {
        return [
            'shop' => null,
            'categories' => [],
            'suppliers' => [],
            'customers' => [],
            'products' => [],
        ];
    }

    private function emptyPaginator(Request $request): \Illuminate\Pagination\LengthAwarePaginator
    {
        return new \Illuminate\Pagination\LengthAwarePaginator([], 0, $this->perPage($request));
    }

    private function archiveRow(string $table, int $shopId, int $id): JsonResponse
    {
        $this->requireRow($table, $shopId, $id);
        DB::table($table)->where('shop_id', $shopId)->where('id', $id)->update(['deleted_at' => now(), 'updated_at' => now()]);

        return ApiResponse::success(null, 'Record archived');
    }

    private function requireRow(string $table, int $shopId, int $id): void
    {
        abort_unless(DB::table($table)->where('shop_id', $shopId)->where('id', $id)->whereNull('deleted_at')->exists(), Response::HTTP_NOT_FOUND);
    }

    private function incrementProduct(int $shopId, int $productId, int $quantity): void
    {
        DB::table('products')->where('shop_id', $shopId)->where('id', $productId)->increment('stock_quantity', $quantity, ['updated_at' => now()]);
    }

    private function recordMovement(int $shopId, int $productId, string $type, int $quantity, ?string $reference): void
    {
        DB::table('stock_movements')->insert([
            'shop_id' => $shopId,
            'product_id' => $productId,
            'type' => $type,
            'quantity' => $quantity,
            'reference' => $reference,
            'note' => 'Auto generated',
            'moved_at' => now(),
        ] + $this->timestamps());
    }

    private function nextStock(int $stock, string $type, int $quantity): int
    {
        return match ($type) {
            'in' => $stock + $quantity,
            'out' => $stock - $quantity,
            'adjustment' => $quantity,
            default => $stock,
        };
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

    private function perPage(Request $request): int
    {
        return min(max($request->integer('per_page', 10), 1), 100);
    }

    private function timestamps(): array
    {
        return ['created_at' => now(), 'updated_at' => now()];
    }
}
