<?php

use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryMovementController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TransactionCategoryController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware(['auth', 'verified'])
        ->name('dashboard');

    Route::get('/dashboard/chart-data/{period}', [DashboardController::class, 'getChartData'])
        ->name('dashboard.chart-data');

    Route::get('/dashboard/export/{period}/{format}', [DashboardController::class, 'export'])
        ->name('dashboard.export')
        ->middleware('permission:Exportar Dashboard');

    Route::get('/notifications/low-stock', [DashboardController::class, 'lowStockNotifications'])
        ->name('notifications.low-stock');

    // Roles y Permisos
    Route::prefix('roles')->group(function () {
        Route::get('/', [RoleController::class, 'index'])
            ->name('roles.index')
            ->middleware('permission:Ver Roles y Permisos');
        Route::match(['get', 'post'], '/search', [RoleController::class, 'index'])
            ->name('roles.search')
            ->middleware('permission:Ver Roles y Permisos');
        Route::post('/', [RoleController::class, 'store'])
            ->name('roles.store')
            ->middleware('permission:Crear Roles y Permisos');
        Route::put('/{role}', [RoleController::class, 'update'])
            ->name('roles.update')
            ->middleware('permission:Actualizar Roles y Permisos');
        Route::delete('/{role}', [RoleController::class, 'destroy'])
            ->name('roles.destroy')
            ->middleware('permission:Eliminar Roles y Permisos');
    });

    // Users
    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index'])
            ->name('users.index')
            ->middleware('permission:Ver Usuarios');
        Route::match(['get', 'post'], '/search', [UserController::class, 'index'])
            ->name('users.search')
            ->middleware('permission:Ver Usuarios');
        Route::post('/', [UserController::class, 'store'])
            ->name('users.store')
            ->middleware('permission:Crear Usuarios');
        Route::put('/{user}', [UserController::class, 'update'])
            ->name('users.update')
            ->middleware('permission:Actualizar Usuarios');
        Route::patch('/{user}/toggle-active', [UserController::class, 'toggleActive'])
            ->name('users.toggle-active')
            ->middleware('permission:Actualizar Usuarios');
        Route::delete('/{user}', [UserController::class, 'destroy'])
            ->name('users.destroy')
            ->middleware('permission:Eliminar Usuarios');
    });

    // Suppliers
    Route::prefix('suppliers')->group(function () {
        Route::get('/export', [SupplierController::class, 'export'])
            ->name('suppliers.export')
            ->middleware('permission:Exportar Proveedores');
        Route::get('/', [SupplierController::class, 'index'])
            ->name('suppliers.index')
            ->middleware('permission:Ver Proveedores');
        Route::match(['get', 'post'], '/search', [SupplierController::class, 'index'])
            ->name('suppliers.search')
            ->middleware('permission:Ver Proveedores');
        Route::post('/', [SupplierController::class, 'store'])
            ->name('suppliers.store')
            ->middleware('permission:Crear Proveedores');
        Route::put('/{supplier}', [SupplierController::class, 'update'])
            ->name('suppliers.update')
            ->middleware('permission:Actualizar Proveedores');
        Route::patch('/{supplier}/toggle-active', [SupplierController::class, 'toggleActive'])
            ->name('suppliers.toggle-active')
            ->middleware('permission:Actualizar Proveedores');
        Route::delete('/{supplier}', [SupplierController::class, 'destroy'])
            ->name('suppliers.destroy')
            ->middleware('permission:Eliminar Proveedores');
    });

    // Categories
    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index'])
            ->name('categories.index')
            ->middleware('permission:Ver Categorías');
        Route::match(['get', 'post'], '/search', [CategoryController::class, 'index'])
            ->name('categories.search')
            ->middleware('permission:Ver Categorías');
        Route::post('/', [CategoryController::class, 'store'])
            ->name('categories.store')
            ->middleware('permission:Crear Categorías');
        Route::put('/{category}', [CategoryController::class, 'update'])
            ->name('categories.update')
            ->middleware('permission:Actualizar Categorías');
        Route::patch('/{category}/toggle-active', [CategoryController::class, 'toggleActive'])
            ->name('categories.toggle-active')
            ->middleware('permission:Actualizar Categorías');
        Route::delete('/{category}', [CategoryController::class, 'destroy'])
            ->name('categories.destroy')
            ->middleware('permission:Eliminar Categorías');
    });

    // Products
    Route::prefix('products')->group(function () {
        Route::get('/export', [ProductController::class, 'export'])
            ->name('products.export')
            ->middleware('permission:Exportar Productos');
        Route::get('/', [ProductController::class, 'index'])
            ->name('products.index')
            ->middleware('permission:Ver Productos');
        Route::match(['get', 'post'], '/search', [ProductController::class, 'index'])
            ->name('products.search')
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
        Route::match(['get', 'post'], '/search', [InventoryMovementController::class, 'index'])
            ->name('inventory-movements.search')
            ->middleware('permission:Ver Movimientos Inventario');

        // Exportar movimientos a Excel
        Route::get('/export', [InventoryMovementController::class, 'export'])
            ->name('inventory-movements.export')
            ->middleware('permission:Exportar Movimientos Inventario');

        Route::post('/', [InventoryMovementController::class, 'store'])
            ->name('inventory-movements.store')
            ->middleware('permission:Crear Movimientos Inventario');

        Route::put('/{inventoryMovement}', [InventoryMovementController::class, 'update'])
            ->name('inventory-movements.update')
            ->middleware('permission:Actualizar Movimientos Inventario');
    });

    // Clients
    Route::prefix('clients')->group(function () {
        Route::get('/', [ClientController::class, 'index'])
            ->name('clients.index')
            ->middleware('permission:Ver Clientes');
        Route::match(['get', 'post'], '/search', [ClientController::class, 'index'])
            ->name('clients.search')
            ->middleware('permission:Ver Clientes');
        Route::post('/', [ClientController::class, 'store'])
            ->name('clients.store')
            ->middleware('permission:Crear Clientes');
        Route::post('/quick-store', [ClientController::class, 'quickStore']) // ← Ruta para crear clientes desde ventas
            ->name('clients.quickStore')
            ->middleware('permission:Crear Clientes');
        Route::put('/{client}', [ClientController::class, 'update'])
            ->name('clients.update')
            ->middleware('permission:Editar Clientes');
        Route::patch('/{client}/toggle-active', [ClientController::class, 'toggleActive'])
            ->name('clients.toggle-active')
            ->middleware('permission:Editar Clientes');
        Route::delete('/{client}', [ClientController::class, 'destroy'])
            ->name('clients.destroy')
            ->middleware('permission:Eliminar Clientes');
        Route::get('/{client}/history', [ClientController::class, 'history'])
            ->name('clients.history')
            ->middleware('permission:Ver Clientes');
        Route::get('/cities/{departmentId}', [ClientController::class, 'getCities'])
            ->name('clients.cities')
            ->middleware('permission:Ver Clientes');
    });

    // Sales
    Route::prefix('sales')->group(function () {
        Route::get('/export', [SaleController::class, 'export'])
            ->name('sales.export')
            ->middleware('permission:Exportar Ventas');
        Route::get('/', [SaleController::class, 'index'])
            ->name('sales.index')
            ->middleware('permission:Ver Ventas');
        Route::match(['get', 'post'], '/search', [SaleController::class, 'index'])
            ->name('sales.search')
            ->middleware('permission:Ver Ventas');
        Route::post('/', [SaleController::class, 'store'])
            ->name('sales.store')
            ->middleware('permission:Crear Ventas');
        Route::get('/{sale}', [SaleController::class, 'show'])
            ->name('sales.show')
            ->middleware('permission:Ver Ventas');
        Route::get('/{sale}/pdf', [SaleController::class, 'generatePdf'])
            ->name('sales.pdf')
            ->middleware('permission:Ver Ventas');
        Route::post('/{sale}/cancel', [SaleController::class, 'cancel'])
            ->name('sales.cancel')
            ->middleware('permission:Eliminar Ventas');
    });

    Route::get('/sales/client-by-document', [SaleController::class, 'getClientByDocument'])->name('sales.client-by-document');
    Route::get('/sales/product-by-code', [SaleController::class, 'getProductByCode'])->name('sales.product-by-code');

    // ==================== FINANZAS ====================

    // Transaction Categories (Categorías de Transacciones)
    Route::prefix('transaction-categories')->group(function () {
        Route::get('/', [TransactionCategoryController::class, 'index'])
            ->name('transaction-categories.index')
            ->middleware('permission:Ver Finanzas');
        Route::get('/create', [TransactionCategoryController::class, 'create'])
            ->name('transaction-categories.create')
            ->middleware('permission:Gestionar Categorías Transacciones');
        Route::post('/', [TransactionCategoryController::class, 'store'])
            ->name('transaction-categories.store')
            ->middleware('permission:Gestionar Categorías Transacciones');
        Route::get('/{transactionCategory}/edit', [TransactionCategoryController::class, 'edit'])
            ->name('transaction-categories.edit')
            ->middleware('permission:Gestionar Categorías Transacciones');
        Route::put('/{transactionCategory}', [TransactionCategoryController::class, 'update'])
            ->name('transaction-categories.update')
            ->middleware('permission:Gestionar Categorías Transacciones');
        Route::delete('/{transactionCategory}', [TransactionCategoryController::class, 'destroy'])
            ->name('transaction-categories.destroy')
            ->middleware('permission:Gestionar Categorías Transacciones');
    });

    // Transactions - Unificadas
    Route::prefix('transactions')->group(function () {
        Route::get('/', [TransactionController::class, 'index'])
            ->name('transactions.index')
            ->middleware('permission:Ver Finanzas');
        Route::match(['get', 'post'], '/search', [TransactionController::class, 'index'])
            ->name('transactions.search')
            ->middleware('permission:Ver Finanzas');
        Route::get('/transactions/export', [TransactionController::class, 'export'])
            ->name('transactions.export')
            ->middleware('permission:Exportar Transacciones');
        Route::post('/', [TransactionController::class, 'store'])
            ->name('transactions.store')
            ->middleware('permission:Crear Finanzas');
        Route::put('/{transaction}', [TransactionController::class, 'update'])
            ->name('transactions.update')
            ->middleware('permission:Editar Finanzas');
        Route::post('/{transaction}/cancel', [TransactionController::class, 'cancel'])
            ->name('transactions.cancel')
            ->middleware('permission:Cancelar Finanzas');
    });

    // Cash Register (Caja)
    Route::prefix('cash-register')->middleware(['auth', 'verified'])->group(function () {
        Route::get('/', [CashRegisterController::class, 'index'])
            ->name('cash-register.index')
            ->middleware('permission:Ver Caja');
        Route::match(['get', 'post'], '/search', [CashRegisterController::class, 'index'])
            ->name('cash-register.search')
            ->middleware('permission:Ver Caja');
        Route::post('/', [CashRegisterController::class, 'store'])
            ->name('cash-register.store')
            ->middleware('permission:Crear Caja');
        Route::put('/{cashRegister}', [CashRegisterController::class, 'update'])
            ->name('cash-register.update')
            ->middleware('permission:Actualizar Caja');
        Route::get('/export', [CashRegisterController::class, 'export'])
            ->name('cash-register.export')
            ->middleware('permission:Exportar Caja');
    });

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
