<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class ShopkeeperCache
{
    public static function key(string $name, int $shopId): string
    {
        return "shopkeeper.{$shopId}.{$name}";
    }

    public static function ttl(string $name): int
    {
        return (int) config("shopkeeper.cache_ttl.{$name}", 60);
    }

    public static function clear(int $shopId): void
    {
        foreach (array_keys(config('shopkeeper.cache_ttl', [])) as $name) {
            Cache::forget(self::key($name, $shopId));
        }
    }
}
