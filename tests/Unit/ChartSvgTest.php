<?php

namespace Tests\Unit;

use App\Support\ChartSvg;
use Tests\TestCase;

/**
 * Regresión: esta instalación de dompdf (dompdf/dompdf ^3.1) no dibuja
 * <svg> puesto directo en el HTML — confirmado generando un PDF real con
 * formas simples (rect/circle/path), ninguna aparecía. El Dashboard
 * exportado a PDF mostraba la leyenda de cada gráfica pero nunca el
 * dibujo. La gráfica debe ir envuelta en un <img> con data URI, que
 * dompdf sí dibuja.
 */
class ChartSvgTest extends TestCase
{
    public function test_bars_wraps_the_chart_as_a_data_uri_image_not_inline_svg()
    {
        $html = ChartSvg::bars([
            ['label' => 'Ene', 'value' => 100],
            ['label' => 'Feb', 'value' => 200],
        ]);

        $this->assertStringContainsString('<img src="data:image/svg+xml;base64,', $html);
        $this->assertStringNotContainsString('<svg width', $html);
    }

    public function test_pie_wraps_the_chart_as_a_data_uri_image_not_inline_svg()
    {
        $html = ChartSvg::pie([
            ['label' => 'A', 'value' => 60, 'color' => '#4472C4'],
            ['label' => 'B', 'value' => 40, 'color' => '#ED7D31'],
        ]);

        $this->assertStringContainsString('<img src="data:image/svg+xml;base64,', $html);
        $this->assertStringNotContainsString('<svg width', $html);
    }

    public function test_pie_legend_lists_one_category_per_line()
    {
        $html = ChartSvg::pie([
            ['label' => 'Categoría A', 'value' => 60, 'color' => '#4472C4'],
            ['label' => 'Categoría B', 'value' => 40, 'color' => '#ED7D31'],
        ]);

        $this->assertSame(2, substr_count($html, 'display:block;clear:both'));
    }
}
