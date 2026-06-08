<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Throwable;

class AuditLogger
{
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'remember_token',
        'token',
        'api_token',
    ];

    public function record(string $action, Model|string|null $auditable = null, ?int $auditableId = null, ?array $oldValues = null, ?array $newValues = null): void
    {
        try {
            $user = request()->user();
            $auditableType = $auditable instanceof Model ? $auditable::class : $auditable;
            $id = $auditable instanceof Model ? $auditable->getKey() : $auditableId;

            AuditLog::create([
                'user_id' => $user?->id,
                'action' => $action,
                'auditable_type' => $auditableType,
                'auditable_id' => $id,
                'old_values' => $this->clean($oldValues),
                'new_values' => $this->clean($newValues),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            $activity = activity('audit')
                ->event($action)
                ->withProperties([
                    'old' => $this->clean($oldValues),
                    'new' => $this->clean($newValues),
                    'ip_address' => request()->ip(),
                ]);

            if ($user) {
                $activity->causedBy($user);
            }

            if ($auditable instanceof Model) {
                $activity->performedOn($auditable);
            }

            $activity->log($this->label($action, $auditableType, $id));
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function clean(?array $values): ?array
    {
        if ($values === null) {
            return null;
        }

        return Arr::except($values, self::SENSITIVE_KEYS);
    }

    private function label(string $action, Model|string|null $auditableType, int|string|null $id): string
    {
        $name = is_string($auditableType) ? class_basename($auditableType) : 'Record';

        return trim(str_replace('.', ' ', $action).' '.$name.($id ? " #{$id}" : ''));
    }
}
