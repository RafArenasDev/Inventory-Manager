<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Dashboard Report Completo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 10px;
            color: #1f2937;
        }

        .header {
            display: table;
            width: 100%;
            margin-bottom: 12px;
        }

        .header-logo {
            display: table-cell;
            width: 60px;
            vertical-align: middle;
        }

        .header-logo img {
            height: 40px;
        }

        .header-text {
            display: table-cell;
            vertical-align: middle;
            padding-left: 10px;
        }

        h1 {
            margin: 0;
            color: #111827;
            font-size: 18px;
        }

        .subtitle {
            margin: 2px 0 0;
            color: #6b7280;
            font-size: 10px;
        }

        h2 {
            color: #444;
            margin-top: 0;
            margin-bottom: 8px;
            font-size: 13px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 9px;
        }

        th,
        td {
            border: 1px solid #ccc;
            padding: 5px;
            text-align: left;
        }

        th {
            background-color: #4472C4;
            color: white;
            text-align: center;
        }

        tr:nth-child(even) {
            background-color: #f9fafb;
        }

        .financial-table th,
        .financial-table td {
            text-align: center;
        }

        .section {
            page-break-inside: avoid;
            margin-bottom: 24px;
        }

        .period-columns {
            display: table;
            width: 100%;
            table-layout: fixed;
        }

        .period-col {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 10px;
        }

        .chart-box {
            text-align: center;
            margin-top: 8px;
        }
    </style>
</head>

<body>
    <div class="header">
        <div class="header-logo">
            @if (file_exists($logoPath))
                <img src="{{ $logoPath }}" alt="Logo">
            @endif
        </div>
        <div class="header-text">
            <h1>{{ $businessName }} — Dashboard Report Completo</h1>
            <p class="subtitle">Fecha: {{ $generatedAt }} — incluye todos los períodos, sin filtros aplicados.</p>
        </div>
    </div>

    <div class="section">
        <h2>Resumen Financiero por Período</h2>
        <table class="financial-table">
            <tr>
                <th>Período</th>
                <th>Ventas Monto (COP)</th>
                <th>Ventas Cantidad</th>
                <th>Ventas Crecimiento %</th>
                <th>Ingresos Monto (COP)</th>
                <th>Ingresos Crecimiento %</th>
                <th>Egresos Monto (COP)</th>
                <th>Egresos Crecimiento %</th>
            </tr>
            @foreach ($allPeriods as $p)
                @php($sales = $allFinancials[$p]['sales'])
                @php($incomes = $allFinancials[$p]['incomes'])
                @php($expenses = $allFinancials[$p]['expenses'])
                <tr>
                    <td>{{ ucfirst($p) }}</td>
                    <td>{{ number_format($sales['amount'], 0, ',', '.') }}</td>
                    <td>{{ $sales['count'] }}</td>
                    <td>{{ $sales['growth'] }}%</td>
                    <td>{{ number_format($incomes['amount'], 0, ',', '.') }}</td>
                    <td>{{ $incomes['growth'] }}%</td>
                    <td>{{ number_format($expenses['amount'], 0, ',', '.') }}</td>
                    <td>{{ $expenses['growth'] }}%</td>
                </tr>
            @endforeach
        </table>
        <div class="chart-box">{!! $summaryChart !!}</div>
    </div>

    @foreach ($allPeriods as $p)
        <div class="section">
            <h2>{{ ucfirst($p) }}</h2>
            <div class="period-columns">
                <div class="period-col">
                    <table>
                        <tr>
                            <th>Etiqueta</th>
                            <th>Ventas (COP)</th>
                            <th>Cantidad</th>
                        </tr>
                        @foreach ($allSalesData[$p]['labels'] as $index => $label)
                            <tr>
                                <td>{{ $label }}</td>
                                <td>{{ number_format($allSalesData[$p]['ventas'][$index], 0, ',', '.') }}</td>
                                <td>{{ $allSalesData[$p]['cantidad'][$index] }}</td>
                            </tr>
                        @endforeach
                    </table>
                    <div class="chart-box">{!! $salesCharts[$p] !!}</div>
                </div>
                <div class="period-col">
                    <table>
                        <tr>
                            <th>Categoría</th>
                            <th>Porcentaje (%)</th>
                            <th>Monto (COP)</th>
                        </tr>
                        @forelse ($allCategoryData[$p] as $category)
                            <tr>
                                <td>{{ $category['label'] }}</td>
                                <td>{{ $category['value'] }}%</td>
                                <td>{{ number_format($category['amount'], 0, ',', '.') }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3">Sin ventas por categoría en este período.</td>
                            </tr>
                        @endforelse
                    </table>
                    <div class="chart-box">{!! $categoryCharts[$p] !!}</div>
                </div>
            </div>
        </div>
    @endforeach
</body>

</html>
