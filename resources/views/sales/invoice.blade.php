<!DOCTYPE html>
<html>

<head>
    <title>Factura #{{ $sale->id }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            padding: 40px;
            background: #f5f5f5;
        }

        .invoice {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #333;
        }

        .company-info {
            flex: 1;
        }

        .logo {
            width: 120px;
            height: auto;
            margin-bottom: 15px;
        }

        .company-info h1 {
            font-size: 24px;
            color: #333;
            margin-bottom: 5px;
        }

        .company-info p {
            color: #666;
            font-size: 13px;
            line-height: 1.6;
        }

        .invoice-details {
            text-align: right;
        }

        .invoice-details h2 {
            font-size: 32px;
            color: #333;
            margin-bottom: 10px;
        }

        .invoice-details p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
        }

        .client-box {
            background: #f9f9f9;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }

        .client-box h3 {
            color: #333;
            font-size: 16px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .client-box p {
            color: #555;
            font-size: 14px;
            line-height: 1.8;
        }

        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid #e0e0e0;
        }

        .products-table thead {
            background: #333;
            color: white;
        }

        .products-table th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .products-table th:last-child,
        .products-table td:last-child {
            text-align: right;
        }

        .products-table tbody tr {
            border-bottom: 1px solid #e0e0e0;
        }

        .products-table tbody tr:last-child {
            border-bottom: none;
        }

        .products-table tbody tr:hover {
            background: #f9f9f9;
        }

        .products-table td {
            padding: 15px;
            color: #555;
            font-size: 14px;
        }

        .totals {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }

        .totals-box {
            width: 300px;
            background: #f9f9f9;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
        }

        .totals-box .row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }

        .totals-box .row:last-child {
            border-bottom: none;
            border-top: 2px solid #333;
            margin-top: 10px;
            padding-top: 15px;
        }

        .totals-box .row span:first-child {
            color: #666;
            font-weight: 600;
        }

        .totals-box .row span:last-child {
            color: #333;
            font-weight: 700;
        }

        .totals-box .row:last-child span {
            font-size: 20px;
            color: #000;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>

<body>
    <div class="invoice">
        <div class="header">
            <div class="company-info">
                <img src="{{ asset('assets/img/black.png') }}" alt="Logo" class="logo">
                <h1>NOMBRE DEL LOCAL</h1>
                <p><strong>NIT:</strong> 900.123.456-7</p>
                <p><strong>Dirección:</strong> Calle 123 #45-67, Pereira</p>
                <p><strong>Teléfono:</strong> +57 300 123 4567</p>
                <p><strong>Email:</strong> ventas@local.com</p>
            </div>
            <div class="invoice-details">
                <h2>FACTURA</h2>
                <p><strong>No.</strong> {{ str_pad($sale->id, 6, '0', STR_PAD_LEFT) }}</p>
                <p><strong>Fecha:</strong> {{ \Carbon\Carbon::parse($sale->sale_date)->format('d/m/Y') }}</p>
                <p><strong>Encargado:</strong> {{ Auth::user()->name ?? 'Administrador' }}</p>
            </div>
        </div>

        <div class="client-box">
            <h3>Información del Cliente</h3>
            <p><strong>Nombre:</strong> {{ $sale->client->name ?? 'Cliente Anónimo' }}</p>
            @if($sale->client)
                <p><strong>Documento:</strong> {{ $sale->client->document_type }} {{ $sale->client->document_number }}</p>
                <p><strong>Teléfono:</strong> {{ $sale->client->phone ?? 'N/A' }}</p>
                <p><strong>Dirección:</strong> {{ $sale->client->address ?? 'N/A' }}</p>
            @endif
        </div>

        <table class="products-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sale->items as $item)
                    <tr>
                        <td>{{ $item->product->name }}</td>
                        <td>{{ $item->quantity }}</td>
                        <td>${{ number_format($item->price_at_sale, 0, '', '.') }}</td>
                        <td>${{ number_format($item->subtotal, 0, '', '.') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-box">
                <div class="row">
                    <span>Subtotal:</span>
                    <span>${{ number_format($sale->items->sum('subtotal'), 0, '', '.') }}</span>
                </div>
                <div class="row">
                    <span>IVA (0%):</span>
                    <span>$0</span>
                </div>
                <div class="row">
                    <span>TOTAL:</span>
                    <span>${{ number_format($sale->total_paid, 0, '', '.') }}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Gracias por su compra • Este documento es una representación impresa de la factura electrónica</p>
        </div>
    </div>
</body>

</html>
