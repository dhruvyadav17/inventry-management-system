<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class AdminCache
{
    public const DASHBOARD = 'admin.dashboard';

    public const SETTINGS = 'admin.settings';

    public const OPTIONS = 'admin.options';

    public static function ttl(string $name): int
    {
        return (int) config("admin.cache_ttl.{$name}", 60);
    }

    public static function clearDashboard(): void
    {
        Cache::forget(self::DASHBOARD);
    }

    public static function clearSettings(): void
    {
        Cache::forget(self::SETTINGS);
    }

    public static function clearOptions(): void
    {
        Cache::forget(self::OPTIONS);
    }

    public static function clearRbac(): void
    {
        self::clearDashboard();
        self::clearOptions();
    }
}
