<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'guard_name',
        'status',
    ];

    protected $casts = [
        'deleted_at' => 'datetime',
    ];
}
