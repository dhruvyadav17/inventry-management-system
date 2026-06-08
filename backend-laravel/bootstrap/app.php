<?php

use App\Support\ApiResponse;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            Route::middleware('api')
                ->prefix('api/v1')
                ->group(base_path('routes/api_v1.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        if (filter_var(env('SANCTUM_STATEFUL_API', false), FILTER_VALIDATE_BOOL)) {
            $middleware->statefulApi();
        }

        $middleware->append(HandleCors::class);
        $middleware->append(SecurityHeaders::class);
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => $request->expectsJson() || $request->is('api/*')
        );

        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! ($request->expectsJson() || $request->is('api/*'))) {
                return null;
            }

            if ($exception instanceof ValidationException) {
                return ApiResponse::error('Validation failed.', 422, $exception->errors());
            }

            if ($exception instanceof AuthenticationException) {
                return ApiResponse::error('Unauthenticated.', 401);
            }

            if ($exception instanceof AuthorizationException) {
                return ApiResponse::error('This action is unauthorized.', 403);
            }

            if ($exception instanceof ModelNotFoundException) {
                return ApiResponse::error('Resource not found.', 404);
            }

            $status = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;
            $message = $status >= 500 && ! config('app.debug')
                ? 'Something went wrong.'
                : ($exception->getMessage() ?: SymfonyResponse::$statusTexts[$status] ?? 'Something went wrong.');

            return ApiResponse::error($message, $status);
        });
    })->create();
