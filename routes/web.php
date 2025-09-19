<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InventoryMovementController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ProductController;
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
            ->middleware('permission:Ver Roles');
        Route::get('/create', [RoleController::class, 'create'])
            ->name('roles.create')
            ->middleware('permission:Crear Roles');
        Route::post('/', [RoleController::class, 'store'])
            ->name('roles.store')
            ->middleware('permission:Crear Roles');
        Route::get('/{role}', [RoleController::class, 'show'])
            ->name('roles.show')
            ->middleware('permission:Ver Roles');
        Route::get('/{role}/edit', [RoleController::class, 'edit'])
            ->name('roles.edit')
            ->middleware('permission:Editar Roles');
        Route::put('/{role}', [RoleController::class, 'update'])
            ->name('roles.update')
            ->middleware('permission:Actualizar Roles');
        Route::delete('/{role}', [RoleController::class, 'destroy'])
            ->name('roles.destroy')
            ->middleware('permission:Eliminar Roles');
    });

    // Permissions
    Route::prefix('permissions')->group(function () {
        Route::get('/', [PermissionController::class, 'index'])
            ->name('permissions.index')
            ->middleware('permission:Ver Permisos');
        Route::get('/create', [PermissionController::class, 'create'])
            ->name('permissions.create')
            ->middleware('permission:Crear Permisos');
        Route::post('/', [PermissionController::class, 'store'])
            ->name('permissions.store')
            ->middleware('permission:Crear Permisos');
        Route::get('/{permission}', [PermissionController::class, 'show'])
            ->name('permissions.show')
            ->middleware('permission:Ver Permisos');
        Route::get('/{permission}/edit', [PermissionController::class, 'edit'])
            ->name('permissions.edit')
            ->middleware('permission:Editar Permisos');
        Route::put('/{permission}', [PermissionController::class, 'update'])
            ->name('permissions.update')
            ->middleware('permission:Actualizar Permisos');
        Route::delete('/{permission}', [PermissionController::class, 'destroy'])
            ->name('permissions.destroy')
            ->middleware('permission:Eliminar Permisos');
    });

    // Users
    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index'])
            ->name('users.index')
            ->middleware('permission:Ver Usuarios');
        Route::get('/create', [UserController::class, 'create'])
            ->name('users.create')
            ->middleware('permission:Crear Usuarios');
        Route::post('/', [UserController::class, 'store'])
            ->name('users.store')
            ->middleware('permission:Crear Usuarios');
        Route::get('/{user}', [UserController::class, 'show'])
            ->name('users.show')
            ->middleware('permission:Ver Usuarios');
        Route::get('/{user}/edit', [UserController::class, 'edit'])
            ->name('users.edit')
            ->middleware('permission:Editar Usuarios');
        Route::put('/{user}', [UserController::class, 'update'])
            ->name('users.update')
            ->middleware('permission:Actualizar Usuarios');
        Route::delete('/{user}', [UserController::class, 'destroy'])
            ->name('users.destroy')
            ->middleware('permission:Eliminar Usuarios');
    });

    // ========== MÓDULO INVENTARIO ==========

    // Categories
    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index'])
            ->name('categories.index')
            ->middleware('permission:Ver Categorías');
        Route::get('/create', [CategoryController::class, 'create'])
            ->name('categories.create')
            ->middleware('permission:Crear Categorías');
        Route::post('/', [CategoryController::class, 'store'])
            ->name('categories.store')
            ->middleware('permission:Crear Categorías');
        Route::get('/{category}', [CategoryController::class, 'show'])
            ->name('categories.show')
            ->middleware('permission:Ver Categorías');
        Route::get('/{category}/edit', [CategoryController::class, 'edit'])
            ->name('categories.edit')
            ->middleware('permission:Editar Categorías');
        Route::put('/{category}', [CategoryController::class, 'update'])
            ->name('categories.update')
            ->middleware('permission:Actualizar Categorías');
        Route::delete('/{category}', [CategoryController::class, 'destroy'])
            ->name('categories.destroy')
            ->middleware('permission:Eliminar Categorías');
    });

    // Products
    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index'])
            ->name('products.index')
            ->middleware('permission:Ver Productos');
        Route::get('/create', [ProductController::class, 'create'])
            ->name('products.create')
            ->middleware('permission:Crear Productos');
        Route::post('/', [ProductController::class, 'store'])
            ->name('products.store')
            ->middleware('permission:Crear Productos');
        Route::get('/{product}', [ProductController::class, 'show'])
            ->name('products.show')
            ->middleware('permission:Ver Productos');
        Route::get('/{product}/edit', [ProductController::class, 'edit'])
            ->name('products.edit')
            ->middleware('permission:Editar Productos');
        Route::put('/{product}', [ProductController::class, 'update'])
            ->name('products.update')
            ->middleware('permission:Actualizar Productos');
        Route::delete('/{product}', [ProductController::class, 'destroy'])
            ->name('products.destroy')
            ->middleware('permission:Eliminar Productos');

        // Product movements (sub-routes)
        Route::prefix('{product}/movements')->group(function () {
            Route::get('/create', [ProductController::class, 'movementsCreate'])
                ->name('products.movements.create')
                ->middleware('permission:Crear Movimientos Inventario');
            Route::post('/', [ProductController::class, 'movementsStore'])
                ->name('products.movements.store')
                ->middleware('permission:Crear Movimientos Inventario');
        });
    });

// Inventory Movements
    Route::prefix('inventory-movements')->group(function () {
        Route::get('/', [InventoryMovementController::class, 'index'])
            ->name('inventory-movements.index')
            ->middleware('permission:Ver Movimientos Inventario');
        Route::get('/create', [InventoryMovementController::class, 'create'])
            ->name('inventory-movements.create')
            ->middleware('permission:Crear Movimientos Inventario');
        Route::post('/', [InventoryMovementController::class, 'store'])
            ->name('inventory-movements.store')
            ->middleware('permission:Crear Movimientos Inventario');
        Route::get('/{inventoryMovement}', [InventoryMovementController::class, 'show'])
            ->name('inventory-movements.show')
            ->middleware('permission:Ver Movimientos Inventario');
        Route::get('/{inventoryMovement}/edit', [InventoryMovementController::class, 'edit'])
            ->name('inventory-movements.edit')
            ->middleware('permission:Editar Movimientos Inventario');
        Route::put('/{inventoryMovement}', [InventoryMovementController::class, 'update'])
            ->name('inventory-movements.update')
            ->middleware('permission:Actualizar Movimientos Inventario');
        Route::delete('/{inventoryMovement}', [InventoryMovementController::class, 'destroy'])
            ->name('inventory-movements.destroy')
            ->middleware('permission:Eliminar Movimientos Inventario');

        // Reportes y exportación
        Route::get('/stock-report', [InventoryMovementController::class, 'stockReport'])
            ->name('inventory-movements.stock-report')
            ->middleware('permission:Ver Movimientos Inventario');
        Route::get('/movements-report', [InventoryMovementController::class, 'movementsReport'])
            ->name('inventory-movements.movements-report')
            ->middleware('permission:Ver Movimientos Inventario');
        Route::get('/export', [InventoryMovementController::class, 'export'])
            ->name('inventory-movements.export')
            ->middleware('permission:Ver Movimientos Inventario');
    });

});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
