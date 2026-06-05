<?php

namespace App\Http\Controllers\Api\V1\Shopkeeper;

use App\Http\Controllers\Controller;
use App\Services\Shopkeeper\ShopkeeperDashboardService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShopkeeperDashboardController extends Controller
{
    public function __construct(private readonly ShopkeeperDashboardService $dashboard)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $shop = $request->user()->shops()
            ->wherePivot('status', 'active')
            ->orderByPivot('is_primary', 'desc')
            ->first();

        return ApiResponse::success($shop ? $this->dashboard->forShop($shop) : $this->dashboard->empty());
    }
}
