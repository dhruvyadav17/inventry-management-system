<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PermissionRequest extends FormRequest
{
    public function rules(): array
    {
        $permissionId = $this->route('permission')?->id;

        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('permissions', 'name')->ignore($permissionId)],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ];
    }
}
