<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\ApiResponse;
use App\Support\Concerns\BuildsListQueries;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class LogController extends Controller
{
    use BuildsListQueries;

    public function activities(Request $request): JsonResponse
    {
        $query = Activity::query()
            ->when($request->filled('search'), fn ($query) => $query->where('description', 'like', '%'.$request->string('search')->toString().'%'))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('date_to')))
            ->latest();

        return ApiResponse::paginator($query->paginate($this->perPage($request)));
    }

    public function audits(Request $request): JsonResponse
    {
        $query = AuditLog::with('user')
            ->when($request->filled('search'), fn ($query) => $query->where('action', 'like', '%'.$request->string('search')->toString().'%'))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('date_to')))
            ->latest();

        return ApiResponse::paginator($query->paginate($this->perPage($request)));
    }
}
