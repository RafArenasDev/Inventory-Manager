<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $this->actingAs($user = User::factory()->create());

        $this->get('/dashboard')->assertOk();
    }

    /**
     * Regresión: total_paid se guarda en centavos (ver Sale::$casts /
     * SaleController), pero el umbral de la DIAN (config('business.*')) está
     * en pesos reales. Sumar total_paid sin dividir entre 100 infla el aviso
     * 100 veces — reportado en producción real (2026-09-09): el dashboard
     * mostraba "$282.440.000" cuando las ventas reales sumaban "$2.824.400".
     */
    public function test_annual_invoicing_alert_reports_real_pesos_not_cents()
    {
        $user = User::factory()->create();

        // Umbral real: 3.500 UVT * $52.374 = $183.309.000. Una venta de
        // $150.000.000 pesos reales queda al 81.8% del tope (por encima del
        // 70% que activa el aviso, por debajo del 100% que lo marca superado).
        Sale::create([
            'invoice_number' => 'TEST-0001',
            'user_id' => $user->id,
            'sale_date' => today(),
            'sale_time' => now()->format('H:i:s'),
            'total_paid' => 150_000_000 * 100,
            'payment_method' => 'Efectivo',
            'is_cancelled' => false,
        ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->where('annualInvoicingAlert.year_to_date', 150_000_000)
                ->where('annualInvoicingAlert.exceeded', false)
            );
    }
}
