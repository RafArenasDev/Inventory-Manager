<tr>
    <td>
        <table class="footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
                <td class="content-cell" align="center">
                    @if (isset($url))
                        <p
                            style="color: #9BA2AB; font-size: 12px; line-height: 18px; margin-top: 30px; text-align: center;">
                            Si tienes problemas haciendo clic en el botón "Restablecer contraseña", copia y pega la
                            siguiente URL en tu navegador:
                        </p>
                        <p
                            style="color: #9BA2AB; font-size: 12px; line-height: 18px; margin-top: 10px; text-align: center;">
                            <a href="{{ $url }}" style="color: #9BA2AB;">{{ $url }}</a>
                        </p>
                    @endif
                    <p
                        style="color: #9BA2AB; font-size: 12px; line-height: 18px; margin-top: 20px; text-align: center;">
                        © {{ date('Y') }} POS Inventory System. Todos los derechos reservados.
                    </p>
                </td>
            </tr>
        </table>
    </td>
</tr>
