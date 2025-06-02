<?php

use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Roles
    Route::prefix('roles')->group(function () {
        Route::get('/', [RoleController::class, 'index'])
            ->name('roles.index')
            ->middleware('permission:view-roles-module');
        Route::get('/create', [RoleController::class, 'create'])
            ->name('roles.create')
            ->middleware('permission:create-roles');
        Route::post('/', [RoleController::class, 'store'])
            ->name('roles.store')
            ->middleware('permission:create-roles');
        Route::get('/{role}', [RoleController::class, 'show'])
            ->name('roles.show')
            ->middleware('permission:view-roles');
        Route::get('/{role}/edit', [RoleController::class, 'edit'])
            ->name('roles.edit')
            ->middleware('permission:edit-roles');
        Route::put('/{role}', [RoleController::class, 'update'])
            ->name('roles.update')
            ->middleware('permission:edit-roles');
        Route::delete('/{role}', [RoleController::class, 'destroy'])
            ->name('roles.destroy')
            ->middleware('permission:delete-roles');
    });

    // Users
    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index'])
            ->name('users.index')
            ->middleware('permission:view-users-module');
        Route::get('/create', [UserController::class, 'create'])
            ->name('users.create')
            ->middleware('permission:create-users');
        Route::post('/', [UserController::class, 'store'])
            ->name('users.store')
            ->middleware('permission:create-users');
        Route::get('/{user}', [UserController::class, 'show'])
            ->name('users.show')
            ->middleware('permission:view-users-module');
        Route::get('/{user}/edit', [UserController::class, 'edit'])
            ->name('users.edit')
            ->middleware('permission:edit-users');
        Route::put('/{user}', [UserController::class, 'update'])
            ->name('users.update')
            ->middleware('permission:edit-users');
        Route::delete('/{user}', [UserController::class, 'destroy'])
            ->name('users.destroy')
            ->middleware('permission:delete-users');
    });

});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
