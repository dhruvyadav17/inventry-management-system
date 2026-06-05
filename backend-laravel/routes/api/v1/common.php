<?php

use App\Http\Controllers\Api\V1\Common\ProfileController;
use Illuminate\Support\Facades\Route;

Route::put('profile', [ProfileController::class, 'update']);
