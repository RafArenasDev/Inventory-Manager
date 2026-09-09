<?php

namespace App\Support;

/**
 * Genera gráficos SVG simples server-side para incrustar en el PDF del
 * dashboard (dompdf no ejecuta JS, así que los gráficos de Chart.js/Recharts
 * de la app no se pueden "exportar" tal cual — se regeneran como SVG plano
 * a partir de los mismos datos).
 */
class ChartSvg
{
    /**
     * Gráfico de barras verticales. $items: [['label' => string, 'value' => float], ...].
     */
    public static function bars(array $items, string $color = '#4472C4', int $width = 760, int $height = 180): string
    {
        if (empty($items)) {
            return '<p style="font-size:10px;color:#999;">Sin datos.</p>';
        }

        // dompdf no siempre renderiza <text> dentro de <svg> de forma
        // confiable (a veces lo vuelca como texto plano fuera del gráfico),
        // así que las etiquetas van como leyenda HTML normal debajo, no
        // dentro del SVG.
        $max = max(array_column($items, 'value')) ?: 1;
        $count = count($items);
        $paddingLeft = 10;
        $chartWidth = $width - $paddingLeft - 10;
        $chartHeight = $height - 10;
        $barGap = 8;
        $barWidth = max(4, ($chartWidth / $count) - $barGap);
        $axisY = $chartHeight;

        $bars = '';
        foreach ($items as $i => $item) {
            $barHeight = $max > 0 ? ($item['value'] / $max) * $chartHeight : 0;
            $x = $paddingLeft + $i * ($barWidth + $barGap);
            $y = $axisY - $barHeight;

            $bars .= sprintf(
                '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" rx="2" />',
                $x,
                $y,
                $barWidth,
                max(1, $barHeight),
                $color
            );
        }

        $svg = sprintf(
            '<svg width="%d" height="%d" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg">
                <line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="#d1d5db" stroke-width="1" />
                %s
            </svg>',
            $width,
            $height,
            $width,
            $height,
            $paddingLeft,
            $axisY,
            $width,
            $axisY,
            $bars
        );

        $img = self::svgToImg($svg, $width, $height);

        $legend = '<table style="width:100%;border:none;margin-top:2px;"><tr>';
        foreach ($items as $item) {
            $legend .= sprintf(
                '<td style="border:none;text-align:center;font-size:8px;color:#374151;">%s</td>',
                htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8')
            );
        }
        $legend .= '</tr></table>';

        return $img.$legend;
    }

    /**
     * Gráfico de torta. $items: [['label' => string, 'value' => percent 0-100, 'color' => '#hex'], ...].
     */
    public static function pie(array $items, int $size = 220): string
    {
        if (empty($items)) {
            return '<p style="font-size:10px;color:#999;">Sin datos.</p>';
        }

        $radius = $size / 2;
        $cx = $radius;
        $cy = $radius;
        $startAngle = -90;
        $paths = '';

        foreach ($items as $item) {
            $sweep = ($item['value'] / 100) * 360;
            if ($sweep <= 0) {
                continue;
            }
            $endAngle = $startAngle + $sweep;

            $x1 = $cx + $radius * cos(deg2rad($startAngle));
            $y1 = $cy + $radius * sin(deg2rad($startAngle));
            $x2 = $cx + $radius * cos(deg2rad($endAngle));
            $y2 = $cy + $radius * sin(deg2rad($endAngle));

            $largeArc = $sweep > 180 ? 1 : 0;

            $paths .= sprintf(
                '<path d="M%.1f,%.1f L%.1f,%.1f A%.1f,%.1f 0 %d 1 %.1f,%.1f Z" fill="%s" stroke="#fff" stroke-width="1" />',
                $cx,
                $cy,
                $x1,
                $y1,
                $radius,
                $radius,
                $largeArc,
                $x2,
                $y2,
                $item['color']
            );

            $startAngle = $endAngle;
        }

        $svg = sprintf(
            '<svg width="%d" height="%d" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg">%s</svg>',
            $size,
            $size,
            $size,
            $size,
            $paths
        );

        $img = self::svgToImg($svg, $size, $size);

        // Un <div> por categoría, no una fila de <table>: más robusto que
        // depender del layout de tablas de dompdf para el salto de línea.
        $legend = '<div style="margin-top:4px;">';
        foreach ($items as $item) {
            if ($item['value'] <= 0) {
                continue;
            }
            $legend .= sprintf(
                '<div style="display:block;clear:both;padding:1px 0;font-size:8px;color:#374151;">'
                .'<span style="display:inline-block;width:8px;height:8px;background-color:%s;margin-right:4px;"></span>'
                .'%s (%s%%)'
                .'</div>',
                $item['color'],
                htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'),
                $item['value']
            );
        }
        $legend .= '</div>';

        return $img.$legend;
    }

    /**
     * dompdf (esta instalación, dompdf/dompdf ^3.1) no dibuja <svg> inline
     * puesto directo en el HTML — se probó con formas simples (rect,
     * circle, path) y ninguna aparece en el PDF, solo el resto del HTML
     * alrededor; visto en vivo como gráficas de barras/torta ausentes en el
     * informe, con solo la leyenda flotando sin el dibujo. Envolver el SVG
     * como <img> con un data URI sí lo dibuja correctamente.
     */
    private static function svgToImg(string $svg, int $width, int $height): string
    {
        $dataUri = 'data:image/svg+xml;base64,'.base64_encode($svg);

        return sprintf('<img src="%s" width="%d" height="%d" alt="" />', $dataUri, $width, $height);
    }
}
