<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: #f9fafb;
            padding: 20px 0;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            padding: 30px 40px;
            text-align: center;
            background-color: #000000;
        }

        .logo-wrapper {
            display: inline-block;
            padding: 20px 30px;
        }

        .logo-main {
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 1px;
        }

        .content {
            padding: 40px;
            margin-top: 20px;
        }

        .greeting {
            font-size: 28px;
            font-weight: 600;
            color: #1f2937;
            line-height: 1.4;
            margin-bottom: 16px;
            text-align: center;
        }

        .greeting-name {
            color: #3b82f6;
        }

        .message {
            font-size: 18px;
            color: #6b7280;
            line-height: 1.7;
            margin-bottom: 24px;
            text-align: center;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
        }

        .credentials-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
        }

        .credentials-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
        }

        .credentials-label {
            color: #6b7280;
            font-weight: 600;
        }

        .credentials-value {
            color: #1f2937;
            font-family: 'Courier New', monospace;
        }

        .button-container {
            text-align: center;
            margin: 32px 0;
        }

        .button {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border-radius: 12px;
            color: #ffffff !important;
            font-size: 18px;
            font-weight: 600;
            padding: 18px 48px;
            text-decoration: none;
            display: inline-block;
            box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);
        }

        .warning-text {
            font-size: 15px;
            color: #b45309;
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            margin: 24px 0;
        }

        .footer {
            background-color: #f9fafb;
            padding: 32px 40px;
            border-top: 1px solid #e5e7eb;
        }

        .footer-text {
            font-size: 14px;
            color: #9ca3af;
            line-height: 1.6;
            text-align: center;
        }
    </style>
</head>

<body>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="background-color: #f9fafb;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                    style="max-width: 600px; margin: 0 auto;">
                    <tr>
                        <td>
                            <div class="email-container">
                                <div class="header">
                                    <a href="{{ config('app.url') }}" style="text-decoration: none;">
                                        <div class="logo-wrapper">
                                            {{-- Incrustado como adjunto (cid:), no enlazado por URL — así se ve
                                                siempre, sin depender de que el dominio sea alcanzable desde
                                                afuera (Gmail no puede cargar imágenes de un .test local). --}}
                                            <img src="{{ $message->embed(public_path(config('app.logo'))) }}" alt="{{ config('app.name') }}"
                                                width="56" height="56"
                                                style="display: block; margin: 0 auto 12px auto; border-radius: 8px;">
                                            <span class="logo-main">{{ config('app.name') }}</span>
                                        </div>
                                    </a>
                                </div>

                                <div class="content">
                                    <h1 class="greeting">¡Bienvenido, <span class="greeting-name">{{ $name }}</span>!</h1>

                                    <p class="message">
                                        Se creó una cuenta para ti en {{ config('app.name') }}. Aquí están tus datos de acceso:
                                    </p>

                                    <div class="credentials-box">
                                        <div class="credentials-row">
                                            <span class="credentials-label">Usuario:</span>
                                            <span class="credentials-value">{{ $email }}</span>
                                        </div>
                                        <div class="credentials-row">
                                            <span class="credentials-label">Contraseña:</span>
                                            <span class="credentials-value">{{ $password }}</span>
                                        </div>
                                    </div>

                                    <div class="button-container">
                                        <a href="{{ $loginUrl }}" class="button">Iniciar sesión</a>
                                    </div>

                                    <p class="warning-text">
                                        Por seguridad, se te pedirá cambiar esta contraseña la primera vez que inicies sesión.
                                    </p>
                                </div>

                                <div class="footer">
                                    <p class="footer-text">
                                        © 2025-2026 {{ config('app.name') }}. Todos los derechos reservados.
                                    </p>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>
