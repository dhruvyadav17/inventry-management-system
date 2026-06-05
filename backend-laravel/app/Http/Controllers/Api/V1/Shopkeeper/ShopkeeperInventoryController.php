<?php

namespace App\Http\Controllers\Api\V1\Shopkeeper;

use App\Http\Controllers\Controller;
use App\Services\Shopkeeper\ShopkeeperInventoryContext;
use App\Services\Shopkeeper\ShopkeeperInventoryReadService;
use App\Services\Shopkeeper\ShopkeeperInventoryWriteService;
use App\Support\ApiResponse;
use App\Support\ShopkeeperCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ShopkeeperInventoryController extends Controller
{
    public function __construct(
        private readonly ShopkeeperInventoryContext $context,
        private readonly ShopkeeperInventoryReadService $reads,
        private readonly ShopkeeperInventoryWriteService $writes,
    ) {
    }

    public function options(Request $request): JsonResponse
    {
        $shop = $this->context->activeShop($request);

        if (! $shop) {
            return ApiResponse::success($this->context->emptyOptions());
        }

        return ApiResponse::success($this->context->optionsFor($shop));
    }

    public function index(Request $request, string $resource): JsonResponse
    {
        if (! $this->context->isAllowedResource($resource)) {
            return ApiResponse::error('Unknown shopkeeper resource', Response::HTTP_NOT_FOUND);
        }

        $shop = $this->context->activeShop($request);

        if (! $shop) {
            return ApiResponse::paginator($this->context->emptyPaginator($request));
        }

        if ($resource === 'reports') {
            return ApiResponse::success(Cache::remember(
                ShopkeeperCache::key('reports', $shop->id),
                ShopkeeperCache::ttl('reports'),
                fn () => $this->reads->reports($shop->id),
            ));
        }

        return ApiResponse::paginator($this->reads->query($resource, $shop->id, $request)->paginate($this->context->perPage($request)));
    }

    public function store(Request $request, string $resource): JsonResponse
    {
        if (! $this->context->isAllowedResource($resource) || $resource === 'reports') {
            return ApiResponse::error('Unknown shopkeeper resource', Response::HTTP_NOT_FOUND);
        }

        $shop = $this->context->activeShop($request);

        if (! $shop) {
            return ApiResponse::error('No active shop is assigned to this account.', Response::HTTP_FORBIDDEN);
        }

        $response = match ($resource) {
            'products' => $this->storeProduct($request, $shop->id),
            'stock' => $this->writes->createStockMovement($this->stockMovementData($request, $shop->id), $shop->id),
            'purchases' => $this->writes->createPurchase($this->purchaseData($request, $shop->id), $shop->id),
            'sales' => $this->writes->createSale($this->saleData($request, $shop->id), $shop->id),
            'customers' => $this->storeParty($request, 'customers', $shop->id),
            'suppliers' => $this->storeParty($request, 'suppliers', $shop->id),
            'returns' => $this->writes->createReturn($this->returnData($request, $shop->id), $shop->id),
            default => ApiResponse::error('Unknown shopkeeper resource', Response::HTTP_NOT_FOUND),
        };

        ShopkeeperCache::clear($shop->id);

        return $response;
    }

    public function update(Request $request, string $resource, int $id): JsonResponse
    {
        if (! $this->context->isEditableResource($resource)) {
            return ApiResponse::error('This resource cannot be edited after posting.', Response::HTTP_BAD_REQUEST);
        }

        $shop = $this->context->activeShop($request);

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
        if (! $this->context->isEditableResource($resource)) {
            return ApiResponse::error('This resource cannot be archived.', Response::HTTP_BAD_REQUEST);
        }

        $shop = $this->context->activeShop($request);

        if (! $shop) {
            return ApiResponse::error('No active shop is assigned to this account.', Response::HTTP_FORBIDDEN);
        }

        $response = match ($resource) {
            'products' => $this->writes->archiveRow('products', $shop->id, $id),
            'customers' => $this->writes->archiveRow('customers', $shop->id, $id),
            'suppliers' => $this->writes->archiveRow('suppliers', $shop->id, $id),
            default => ApiResponse::error('This resource cannot be archived.', Response::HTTP_BAD_REQUEST),
        };

        ShopkeeperCache::clear($shop->id);

        return $response;
    }

    private function storeProduct(Request $request, int $shopId): JsonResponse
    {
        return $this->writes->createProduct($request->validate($this->productRules($shopId)), $shopId);
    }

    private function updateProduct(Request $request, int $shopId, int $id): JsonResponse
    {
        return $this->writes->updateProduct($request->validate($this->productRules($shopId, $id)), $shopId, $id);
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

        return $this->writes->createParty($table, $data, $shopId);
    }

    private function updateParty(Request $request, string $table, int $shopId, int $id): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'opening_balance' => [$table === 'customers' ? 'nullable' : 'exclude', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        return $this->writes->updateParty($table, $data, $shopId, $id);
    }

    private function stockMovementData(Request $request, int $shopId): array
    {
        return $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'type' => ['required', Rule::in(['in', 'out', 'adjustment'])],
            'quantity' => ['required', 'integer', 'min:1'],
            'reference' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function purchaseData(Request $request, int $shopId): array
    {
        return $request->validate([
            'supplier_id' => ['nullable', Rule::exists('suppliers', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'product_id' => ['required', Rule::exists('products', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'invoice_no' => ['nullable', 'string', 'max:255'],
            'purchase_date' => ['required', 'date'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['ordered', 'received'])],
        ]);
    }

    private function saleData(Request $request, int $shopId): array
    {
        return $request->validate([
            'customer_id' => ['nullable', Rule::exists('customers', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'product_id' => ['required', Rule::exists('products', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'invoice_no' => ['nullable', 'string', 'max:255'],
            'sale_date' => ['required', 'date'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_status' => ['required', Rule::in(['paid', 'partial', 'due'])],
        ]);
    }

    private function returnData(Request $request, int $shopId): array
    {
        return $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('shop_id', $shopId)->whereNull('deleted_at')],
            'type' => ['required', Rule::in(['customer', 'supplier'])],
            'quantity' => ['required', 'integer', 'min:1'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'return_date' => ['required', 'date'],
        ]);
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

}
