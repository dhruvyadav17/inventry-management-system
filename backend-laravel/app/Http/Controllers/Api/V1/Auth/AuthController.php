<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\Common\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated() + ['status' => 'active']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web'], ['status' => 'active']);
        $user->assignRole('user');

        return $this->tokenResponse($user, 'Registered successfully', 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (! Auth::attempt($credentials, (bool) $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $user = User::where('email', $request->email)->with('roles', 'shops')->firstOrFail();

        if ($user->status !== 'active') {
            Auth::logout();

            return ApiResponse::error('Your account is inactive.', 403);
        }

        return $this->tokenResponse($user, 'Logged in successfully');
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(new UserResource($request->user()->load('roles', 'permissions', 'shops')));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return ApiResponse::success(null, 'Logged out successfully');
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->only('email'));

        return ApiResponse::success(null, 'Password reset link sent if the email exists.');
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset($request->only('email', 'password', 'password_confirmation', 'token'), function (User $user, string $password): void {
            $user->forceFill(['password' => Hash::make($password)])->save();
        });

        return $status === Password::PASSWORD_RESET
            ? ApiResponse::success(null, 'Password reset successfully')
            : ApiResponse::error('Unable to reset password', 422);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $request->user()->update(['password' => Hash::make($request->string('password')->toString())]);

        return ApiResponse::success(null, 'Password changed successfully');
    }

    private function tokenResponse(User $user, string $message, int $status = 200): JsonResponse
    {
        $token = $user->createToken('admin-panel')->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'token_type' => 'Bearer',
            'redirect_path' => $this->redirectPath($user),
            'user' => new UserResource($user->load('roles', 'permissions', 'shops')),
        ], $message, $status);
    }

    private function redirectPath(User $user): string
    {
        $roles = $user->roles->pluck('name')->map(fn (string $role) => mb_strtolower($role));

        if ($roles->contains('admin')) {
            return '/admin/dashboard';
        }

        if ($roles->contains('shopkeeper')) {
            return '/shopkeeper/dashboard';
        }

        return '/dashboard';
    }
}
