<?php

namespace App\Services\Shopkeeper;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ShopkeeperInventoryWriteService
{
    public function __construct(
        private readonly ShopkeeperInventoryContext $context,
        private readonly ShopkeeperInventoryReadService $reads,
    ) {
    }

    public function createProduct(array $data, int $shopId): JsonResponse
    {
        $data['shop_id'] = $shopId;
        $data['category_id'] = $this->categoryId($shopId, $data['category_id'] ?? null, $data['category_name'] ?? null);
        unset($data['category_name']);

        $id = DB::table('products')->insertGetId($data + $this->context->timestamps());

        return ApiResponse::success($this->reads->query('products', $shopId)->where('products.id', $id)->first(), 'Product created', 201);
    }

    public function updateProduct(array $data, int $shopId, int $id): JsonResponse
    {
        $this->requireRow('products', $shopId, $id);
        $data['category_id'] = $this->categoryId($shopId, $data['category_id'] ?? null, $data['category_name'] ?? null);
        unset($data['category_name']);

        DB::table('products')->where('shop_id', $shopId)->where('id', $id)->update($data + ['updated_at' => now()]);

        return ApiResponse::success($this->reads->query('products', $shopId)->where('products.id', $id)->first(), 'Product updated');
    }

    public function createParty(string $table, array $data, int $shopId): JsonResponse
    {
        $data['shop_id'] = $shopId;
        $id = DB::table($table)->insertGetId($data + $this->context->timestamps());

        return ApiResponse::success($this->reads->query($table, $shopId)->where("{$table}.id", $id)->first(), ucfirst(rtrim($table, 's')).' created', 201);
    }

    public function updateParty(string $table, array $data, int $shopId, int $id): JsonResponse
    {
        $this->requireRow($table, $shopId, $id);
        DB::table($table)->where('shop_id', $shopId)->where('id', $id)->update($data + ['updated_at' => now()]);

        return ApiResponse::success($this->reads->query($table, $shopId)->where("{$table}.id", $id)->first(), ucfirst(rtrim($table, 's')).' updated');
    }

    public function createStockMovement(array $data, int $shopId): JsonResponse
    {
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
            ] + $this->context->timestamps());

            return ApiResponse::success($this->reads->query('stock', $shopId)->where('stock_movements.id', $id)->first(), 'Stock updated', 201);
        });
    }

    public function createPurchase(array $data, int $shopId): JsonResponse
    {
        return DB::transaction(function () use ($data, $shopId): JsonResponse {
            $total = round((float) $data['unit_price'] * (int) $data['quantity'], 2);

            if (($data['paid_amount'] ?? 0) > $total) {
                return ApiResponse::error('Paid amount cannot be greater than purchase total.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $purchaseId = DB::table('purchases')->insertGetId([
                'shop_id' => $shopId,
                'supplier_id' => $data['supplier_id'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? 'PUR-'.now()->format('YmdHis'),
                'purchase_date' => $data['purchase_date'],
                'total_amount' => $total,
                'paid_amount' => $data['paid_amount'] ?? 0,
                'status' => $data['status'],
            ] + $this->context->timestamps());

            DB::table('purchase_items')->insert([
                'shop_id' => $shopId,
                'purchase_id' => $purchaseId,
                'product_id' => $data['product_id'],
                'quantity' => $data['quantity'],
                'unit_price' => $data['unit_price'],
                'total_price' => $total,
            ] + $this->context->timestamps());

            if ($data['status'] === 'received') {
                $this->incrementProduct($shopId, (int) $data['product_id'], (int) $data['quantity']);
                $this->recordMovement($shopId, (int) $data['product_id'], 'in', (int) $data['quantity'], DB::table('purchases')->where('id', $purchaseId)->value('invoice_no'));
            }

            return ApiResponse::success($this->reads->query('purchases', $shopId)->where('purchases.id', $purchaseId)->first(), 'Purchase recorded', 201);
        });
    }

    public function createSale(array $data, int $shopId): JsonResponse
    {
        return DB::transaction(function () use ($data, $shopId): JsonResponse {
            $product = DB::table('products')->where('shop_id', $shopId)->where('id', $data['product_id'])->lockForUpdate()->first();
            $stock = (int) $product->stock_quantity - (int) $data['quantity'];

            if ($stock < 0) {
                return ApiResponse::error('Not enough stock available.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $total = round((float) $data['unit_price'] * (int) $data['quantity'], 2);

            if (($data['paid_amount'] ?? 0) > $total) {
                return ApiResponse::error('Paid amount cannot be greater than sale total.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $saleId = DB::table('sales')->insertGetId([
                'shop_id' => $shopId,
                'customer_id' => $data['customer_id'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? 'SALE-'.now()->format('YmdHis'),
                'sale_date' => $data['sale_date'],
                'total_amount' => $total,
                'paid_amount' => $data['paid_amount'] ?? 0,
                'payment_status' => $data['payment_status'],
            ] + $this->context->timestamps());

            DB::table('sale_items')->insert([
                'shop_id' => $shopId,
                'sale_id' => $saleId,
                'product_id' => $product->id,
                'quantity' => $data['quantity'],
                'unit_price' => $data['unit_price'],
                'total_price' => $total,
            ] + $this->context->timestamps());

            DB::table('products')->where('id', $product->id)->update(['stock_quantity' => $stock, 'updated_at' => now()]);
            $invoiceNo = DB::table('sales')->where('id', $saleId)->value('invoice_no');
            $this->recordMovement($shopId, (int) $product->id, 'out', (int) $data['quantity'], $invoiceNo);
            DB::table('invoices')->insert([
                'shop_id' => $shopId,
                'sale_id' => $saleId,
                'invoice_no' => 'INV-'.$invoiceNo,
                'status' => 'issued',
                'invoice_date' => $data['sale_date'],
            ] + $this->context->timestamps());

            return ApiResponse::success($this->reads->query('sales', $shopId)->where('sales.id', $saleId)->first(), 'Sale recorded', 201);
        });
    }

    public function createReturn(array $data, int $shopId): JsonResponse
    {
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
            ] + $this->context->timestamps());

            DB::table('products')->where('id', $product->id)->update(['stock_quantity' => $stock, 'updated_at' => now()]);
            $this->recordMovement($shopId, (int) $product->id, $movement, (int) $data['quantity'], strtoupper($data['type']).'-RETURN');

            return ApiResponse::success($this->reads->query('returns', $shopId)->where('returns.id', $id)->first(), 'Return recorded', 201);
        });
    }

    public function archiveRow(string $table, int $shopId, int $id): JsonResponse
    {
        $this->requireRow($table, $shopId, $id);
        DB::table($table)->where('shop_id', $shopId)->where('id', $id)->update(['deleted_at' => now(), 'updated_at' => now()]);

        return ApiResponse::success(null, 'Record archived');
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
        ] + $this->context->timestamps());
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
        ] + $this->context->timestamps());
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
}
