<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminOptionService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class OptionController extends Controller
{
    public function __construct(private readonly AdminOptionService $options)
    {
    }

    public function rbac(): JsonResponse
    {
        return ApiResponse::success($this->options->rbac());
    }
}
