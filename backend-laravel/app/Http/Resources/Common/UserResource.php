<?php

namespace App\Http\Resources\Common;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'profile_photo' => $this->profile_photo,
            'status' => $this->trashed() ? 'archived' : $this->status,
            'email_verified_at' => $this->email_verified_at,
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')),
            'permissions' => $this->whenLoaded('permissions', fn () => $this->getAllPermissions()->pluck('name')->values()),
            'shops' => $this->whenLoaded('shops', fn () => $this->shops->map(fn ($shop) => [
                'id' => $shop->id,
                'name' => $shop->name,
                'code' => $shop->code,
                'status' => $shop->status,
                'is_primary' => (bool) $shop->pivot?->is_primary,
            ])->values()),
            'deleted_at' => $this->deleted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
