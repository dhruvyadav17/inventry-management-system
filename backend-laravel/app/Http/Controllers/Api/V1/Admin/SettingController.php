<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\AdminCache;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = Cache::remember(AdminCache::SETTINGS, AdminCache::ttl('settings'), function () {
            return collect(config('admin.settings_defaults', []))
                ->merge(Setting::pluck('value', 'key'))
                ->all();
        });

        return ApiResponse::success($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.app_name' => ['required', 'string', 'max:255'],
            'settings.timezone' => ['required', 'timezone'],
        ]);

        foreach ($data['settings'] as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        AdminCache::clearSettings();

        return ApiResponse::success(null, 'Settings updated');
    }
}
