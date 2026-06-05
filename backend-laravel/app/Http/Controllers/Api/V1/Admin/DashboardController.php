<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminDashboardService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(private readonly AdminDashboardService $dashboard)
    {
    }

    public function index(): JsonResponse
    {
        return ApiResponse::success($this->dashboard->payload());
    }
}
