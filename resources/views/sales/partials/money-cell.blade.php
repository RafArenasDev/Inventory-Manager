{{--
    "$" siempre fijo a la izquierda y el valor alineado a la derecha, para que
    unidades/decenas/centenas/miles queden alineados entre filas — sin esto,
    un "$ 90.000" y un "$ 1.921.535" en la misma columna quedan desfasados
    porque "$ " + número se alinea como un solo string.

    Se usa como tabla anidada (no flex) porque DomPDF no soporta flexbox de
    forma confiable; display:table/table-cell sí.

    Parámetros: $amount (número ya en la escala a mostrar), $negative (bool,
    opcional — antepone "-" al valor en vez de a "$").
--}}
<table style="width:100%; border-collapse:collapse;">
    <tr>
        <td style="border:none; padding:0; text-align:left; width:1%; white-space:nowrap;">$</td>
        <td style="border:none; padding:0 0 0 3px; text-align:right;">{{ ($negative ?? false) ? '-' : '' }}{{ number_format($amount, 0, ',', '.') }}</td>
    </tr>
</table>
