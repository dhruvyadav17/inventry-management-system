<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/reset-password/{token}', function (string $token) {
    $query = http_build_query([
        'token' => $token,
        'email' => request('email'),
    ]);

    return redirect(rtrim((string) config('app.frontend_url'), '/').'/reset-password?'.$query);
})->name('password.reset');
