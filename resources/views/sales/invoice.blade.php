<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo de Pago - {{ $sale->invoice_number }}</title>
    <style>
        body {
            font-family: "Helvetica", sans-serif;
            font-size: 9px;
            line-height: 1.2;
            color: #1f2937;
            background-color: #fff;
            padding: 1rem;
        }

        .container {
            max-width: 100vw;
            padding: 1rem;
        }

        .header {
            display: table;
            width: 100%;
            margin-bottom: 12px;
        }

        .header-left {
            display: table-cell;
            vertical-align: top;
            width: 60%;
        }

        .logo-company {
            display: table;
            width: 100%;
        }

        .logo-cell {
            display: table-cell;
            vertical-align: top;
            width: 70px;
        }

        .company-info {
            display: table-cell;
            vertical-align: top;
            padding-left: 10px;
        }

        .logo {
            height: 55px;
            width: auto;
        }

        .company-name {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 3px;
        }

        .company-detail {
            font-size: 8px;
            color: #374151;
            margin-bottom: 1px;
        }

        .header-right {
            display: table-cell;
            vertical-align: top;
            text-align: right;
            width: 40%;
        }

        .document-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 2px;
            color: #111827;
        }

        .invoice-number {
            font-size: 14px;
            color: #374151;
        }

        .cancelled-badge {
            display: inline-block;
            background-color: #ef4444;
            color: white;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 700;
            margin-top: 5px;
        }

        .section-title {
            font-size: 11px;
            font-weight: 700;
            margin: 12px 0 6px;
            color: #111827;
        }

        .info-box {
            border: 1.5px solid #9ca3af;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 12px;
        }

        .info-grid {
            display: table;
            width: 100%;
        }

        .info-row {
            display: table-row;
        }

        .info-cell {
            display: table-cell;
            padding: 3px 8px 3px 0;
            vertical-align: top;
            width: 33.33%;
        }

        .info-cell-full {
            display: table-cell;
            padding: 3px 8px 3px 0;
            vertical-align: top;
            width: 100%;
        }

        .info-label {
            font-weight: 600;
            color: #6b7280;
            font-size: 8px;
            display: block;
            margin-bottom: 1px;
        }

        .info-value {
            display: block;
            color: #111827;
            font-size: 9px;
        }

        .notes-box {
            background-color: #f9fafb;
            padding: 8px;
            border-radius: 4px;
            font-size: 9px;
            margin-top: 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            overflow: hidden;
        }

        thead {
            background-color: #9ca3af;
        }

        th {
            padding: 6px 5px;
            text-align: left;
            font-size: 9px;
            font-weight: 700;
            color: #111827;
            font-family: "Helvetica", sans-serif;
        }

        td {
            padding: 5px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9px;
            font-family: "Helvetica", sans-serif;
        }

        tbody tr:last-child td {
            border-bottom: none;
        }

        .text-right {
            text-align: right;
        }

        .product-code {
            font-family: "Helvetica", sans-serif;
            font-size: 8px;
        }

        .totals-box {
            margin-top: 12px;
            padding: 0;
        }

        .total-row {
            display: table;
            width: 100%;
            margin-bottom: 4px;
        }

        .total-label {
            display: table-cell;
            font-weight: 600;
            font-size: 9px;
            text-align: left;
        }

        .total-value {
            display: table-cell;
            text-align: right;
            font-size: 9px;
        }

        .grand-total {
            border-top: 2px solid #111827;
            padding-top: 5px;
            margin-top: 5px;
        }

        .grand-total .total-label,
        .grand-total .total-value {
            font-size: 13px;
            font-weight: 700;
        }

        .discount-value {
            color: #000000;
        }

        .disclaimer {
            font-size: 7px;
            font-style: italic;
            color: #6b7280;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
        }

        .details-grid {
            display: table;
            width: 100%;
        }

        .details-row {
            display: table-row;
        }

        .details-cell {
            display: table-cell;
            padding: 3px 8px 3px 0;
            vertical-align: top;
            width: 25%;
        }
    </style>
</head>

<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <div class="logo-company">
                    <div class="logo-cell">
                        <img src="{{ public_path('assets/img/black.png') }}" alt="Logo" class="logo">
                    </div>
                    <div class="company-info">
                        <div class="company-name">{{ config('business.name') }}</div>
                        <div class="company-detail"><strong>NIT:</strong> {{ config('business.nit') }}</div>
                        <div class="company-detail"><strong>Celular:</strong> {{ config('business.phone') }}</div>
                        <div class="company-detail"><strong>Email:</strong> {{ config('business.email') }}</div>
                        <div class="company-detail"><strong>Dirección:</strong> {{ config('business.address') }}</div>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div class="document-title">RECIBO DE PAGO</div>
                <div class="invoice-number">No. {{ $sale->invoice_number }}</div>
                @if($sale->is_cancelled)
                    <div class="cancelled-badge">ANULADA</div>
                @endif
            </div>
        </div>

        <!-- Información del Cliente -->
        <div class="section-title">Información del Cliente</div>
        <div class="info-box">
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-cell">
                        <span class="info-label">Nombre:</span>
                        <span class="info-value">{{ $sale->client?->name ?? 'Cliente varios' }}</span>
                    </div>
                    <div class="info-cell">
                        <span class="info-label">Tipo Doc:</span>
                        <span class="info-value">{{ $sale->client?->document_type ?? '-' }}</span>
                    </div>
                    <div class="info-cell">
                        <span class="info-label">Documento:</span>
                        <span class="info-value">
                            {{ $sale->client?->document_number ?? '-' }}@if($sale->client?->document_type === 'NIT' && $sale->client?->verification_digit)
                            - {{ $sale->client->verification_digit }}@endif
                        </span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-cell">
                        <span class="info-label">Email:</span>
                        <span class="info-value">{{ $sale->client?->email ?? '-' }}</span>
                    </div>
                    <div class="info-cell">
                        <span class="info-label">Teléfono:</span>
                        <span class="info-value">{{ $sale->client?->phone ?? '-' }}</span>
                    </div>
                    <div class="info-cell">
                        <span class="info-label">Celular:</span>
                        <span class="info-value">{{ $sale->client?->cellphone ?? '-' }}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-cell-full">
                        <span class="info-label">Dirección:</span>
                        <span class="info-value">{{ $sale->client?->address ?? '-' }},
                            {{ $sale->client?->city?->name ?? '-' }}, {{ $sale->client?->department?->name ?? '-' }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Detalles de la Venta -->
        <div class="section-title">Detalles de la Venta</div>
        <div class="info-box">
            <div class="details-grid">
                <div class="details-row">
                    <div class="details-cell">
                        <span class="info-label">Fecha:</span>
                        <span class="info-value">{{ \Carbon\Carbon::parse($sale->sale_date)->format('d/m/Y') }}</span>
                    </div>
                    <div class="details-cell">
                        <span class="info-label">Hora:</span>
                        <span class="info-value">{{ \Carbon\Carbon::parse($sale->sale_time)->format('h:i:s A') }}</span>
                    </div>
                    <div class="details-cell">
                        <span class="info-label">Método de Pago:</span>
                        <span class="info-value">{{ $sale->payment_method }}</span>
                    </div>
                    <div class="details-cell">
                        <span class="info-label">Vendedor:</span>
                        <span class="info-value">{{ $sale->user->name }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Notas -->
        @if($sale->notes)
            <div class="section-title">Notas</div>
            <div class="notes-box">{{ $sale->notes }}</div>
        @endif

        <!-- Productos -->
        <div class="section-title">Productos</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 12%;">Código</th>
                    <th style="width: 43%;">Producto</th>
                    <th class="text-right" style="width: 15%;">Cantidad</th>
                    <th class="text-right" style="width: 15%;">Precio Unit.</th>
                    <th class="text-right" style="width: 15%;">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sale->items as $item)
                    <tr>
                        <td class="product-code">{{ $item->product->code }}</td>
                        <td>{{ $item->product->name ?? 'Producto no especificado' }}</td>
                        <td class="text-right">{{ $item->quantity }}</td>
                        <td>@include('sales.partials.money-cell', ['amount' => $item->price_at_sale])</td>
                        <td style="font-weight: 600;">@include('sales.partials.money-cell', ['amount' => $item->subtotal])</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Totales -->
        <div class="totals-box">
            <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">@include('sales.partials.money-cell', ['amount' => $sale->total_without_tax / 100])</span>
            </div>
            @if($sale->discount > 0)
                <div class="total-row">
                    {{-- Entre paréntesis va el símbolo del tipo de descuento tal como se ingresó
                         en el formulario ($ o %), no el monto ni el porcentaje calculado. --}}
                    <span class="total-label">Descuento ({{ $sale->discount_type === 'percentage' ? '%' : '$' }}):</span>
                    <span class="total-value discount-value">@include('sales.partials.money-cell', ['amount' => ($sale->total_without_tax - $sale->total_with_discount) / 100, 'negative' => true])</span>
                </div>
            @endif
            <div class="total-row grand-total">
                <span class="total-label">TOTAL:</span>
                <span class="total-value">@include('sales.partials.money-cell', ['amount' => $sale->total_paid / 100])</span>
            </div>
        </div>

        <!-- Disclaimer al final -->
        <div class="disclaimer">
            Este documento corresponde a un comprobante interno de venta. No constituye factura electrónica con
            validación previa de la DIAN.
        </div>
    </div>
</body>

</html>
