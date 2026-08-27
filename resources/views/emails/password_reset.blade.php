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
            padding: 30px 40px 30px 40px;
            text-align: center;
            position: relative;
            background-color: #000000;
        }

        .logo-wrapper {
            position: relative;
            display: inline-block;
            background-color: #000000;
            padding: 20px 30px;
            border-radius: 8px;
        }

        .logo-main {
            display: block;
            font-size: 48px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 3px;
            text-transform: none;
            margin-bottom: 8px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .logo-main .word {
            display: inline-block;
            margin-right: 5px;
            text-transform: capitalize;
        }

        .logo-rainbow {
            display: block;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: none;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
        }

        .logo-rainbow span {
            margin-right: 1px;
        }

        .ar-a {
            color: #ff4136;
        }

        .ar-r {
            color: #ff851b;
        }

        .ar-c {
            color: #ffdc00;
        }

        .ar-o {
            color: #2ecc40;
        }

        .ar-i {
            color: #0074d9;
        }

        .ar-r2 {
            color: #b10dc9;
        }

        .ar-i2 {
            color: #ff6b6b;
        }

        .ar-s {
            color: #85144b;
        }

        .content {
            padding: 40px 40px 40px 40px;
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
            font-size: 20px;
            color: #6b7280;
            line-height: 1.7;
            margin-bottom: 32px;
            text-align: center;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
        }

        .button-container {
            text-align: center;
            margin: 40px 0;
        }

        .button {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border-radius: 12px;
            color: #ffffff !important;
            font-size: 18px;
            font-weight: 600;
            line-height: 1.5;
            padding: 18px 48px;
            text-decoration: none;
            display: inline-block;
            border: none;
            cursor: pointer;
            min-height: 60px;
            width: auto;
            box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);
            transition: all 0.2s ease-in-out;
            text-align: center;
            vertical-align: middle;
        }

        .button:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px 0 rgba(59, 130, 246, 0.5);
            color: #ffffff !important;
        }

        .info-text {
            font-size: 16px;
            color: #9ca3af;
            line-height: 1.6;
            text-align: center;
            margin: 28px 0;
        }

        .footer {
            background-color: #f9fafb;
            padding: 40px;
            border-top: 1px solid #e5e7eb;
        }

        .footer-text {
            font-size: 14px;
            color: #9ca3af;
            line-height: 1.6;
            text-align: center;
        }

        .footer-link {
            color: #3b82f6;
            text-decoration: none;
            word-break: break-all;
        }

        .footer-link:hover {
            text-decoration: underline;
        }

        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 8px;
            }

            .header,
            .content,
            .footer {
                padding-left: 20px;
                padding-right: 20px;
            }

            .greeting {
                font-size: 24px;
            }

            .message {
                font-size: 18px;
            }

            .button {
                padding: 16px 40px;
                font-size: 16px;
            }

            .logo-main {
                font-size: 36px;
                letter-spacing: 1px;
            }

            .logo-rainbow {
                font-size: 28px;
                letter-spacing: 1px;
            }
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
                                <!-- Header con Texto Logo -->
                                <div class="header">
                                    <a href="{{ config('app.url') }}" style="text-decoration: none;">
                                        <div class="logo-wrapper">
                                            <span class="logo-main">{{ config('app.name') }}</span>
                                        </div>
                                    </a>
                                </div>

                                <!-- Contenido -->
                                <div class="content">
                                    <h1 class="greeting">¡Hola, <span class="greeting-name">{{ $name }}</span>!</h1>

                                    <p class="message">
                                        Recibiste este correo porque se solicitó un restablecimiento de contraseña para
                                        tu cuenta.
                                    </p>

                                    <div class="button-container">
                                        <a href="{{ $url }}" class="button">Restablecer contraseña</a>
                                    </div>

                                    <p class="info-text">
                                        Este enlace expira en <strong>60 minutos</strong>.
                                    </p>

                                    <p class="info-text">
                                        Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                                    </p>
                                </div>

                                <!-- Footer -->
                                <div class="footer">
                                    <p class="footer-text">
                                        Si tienes problemas haciendo clic en el botón "Restablecer contraseña", copia y
                                        pega la siguiente URL en tu navegador:
                                    </p>
                                    <p class="footer-text">
                                        <a href="{{ $url }}" class="footer-link">{{ $url }}</a>
                                    </p>
                                    <p class="footer-text" style="margin-top: 20px;">
                                        © {{ date('Y') }} {{ config('app.name') }}. Todos los derechos reservados.
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
