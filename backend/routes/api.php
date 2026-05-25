<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\DeviceDetailController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\DeviceController as AdminDeviceController;
use App\Http\Controllers\Api\Admin\ReservationLogController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/forgot-password', [PasswordResetController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/auth/reset-password', [PasswordResetController::class, 'resetPassword'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);

    Route::get('/devices', [DeviceController::class, 'index']);
    Route::get('/devices/{device}', [DeviceDetailController::class, 'show']);

    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::patch('/reservations/{reservation}/end-time', [ReservationController::class, 'updateEndTime']);
    Route::put('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);
    Route::put('/reservations/{reservation}/complete', [ReservationController::class, 'complete']);

    Route::middleware('role:admin,system')->prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

        Route::get('/devices', [AdminDeviceController::class, 'index']);
        Route::post('/devices', [AdminDeviceController::class, 'store']);
        Route::put('/devices/{device}', [AdminDeviceController::class, 'update']);
    });

    Route::middleware('role:system')->prefix('admin')->group(function () {
        Route::delete('/devices/{device}', [AdminDeviceController::class, 'destroy']);

        Route::get('/reservation-logs', [ReservationLogController::class, 'index']);
    });
});
