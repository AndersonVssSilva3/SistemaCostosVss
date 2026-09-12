function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function generarCostos() {
    document.getElementById('mayorFabTable').innerHTML = `
        <tr><td>MP</td><td>Materia Prima Directa</td><td style="text-align:right;">5,000.00</td></tr>
        <tr><td>MOD</td><td>Mano de Obra Directa</td><td style="text-align:right;">3,500.00</td></tr>
        <tr><td>CFI</td><td>Costos Indirectos de Fabricación</td><td style="text-align:right;">2,000.00</td></tr>
        <tr style="font-weight:700;"><td></td><td>TOTAL COSTO PRODUCCIÓN</td><td style="text-align:right;">10,500.00</td></tr>
    `;
    document.getElementById('hojaCostosTable').innerHTML = `
        <tr><td>Materia Prima</td><td style="text-align:right;">5.00</td><td style="text-align:right;">1,000</td><td style="text-align:right;">5,000.00</td></tr>
        <tr><td>Mano de Obra</td><td style="text-align:right;">3.50</td><td style="text-align:right;">1,000</td><td style="text-align:right;">3,500.00</td></tr>
        <tr><td>Costos Indirectos</td><td style="text-align:right;">2.00</td><td style="text-align:right;">1,000</td><td style="text-align:right;">2,000.00</td></tr>
        <tr style="font-weight:700;"><td>TOTAL</td><td style="text-align:right;">10.50</td><td style="text-align:right;">1,000</td><td style="text-align:right;">10,500.00</td></tr>
    `;
    document.getElementById('costosFijosVarTable').innerHTML = `
        <tr><td>Alquiler</td><td><span class="status-badge status-valid">Fijo</span></td><td style="text-align:right;">3,000.00</td></tr>
        <tr><td>Sueldos Administrativos</td><td><span class="status-badge status-valid">Fijo</span></td><td style="text-align:right;">8,500.00</td></tr>
        <tr><td>Servicios Básicos</td><td><span class="status-badge status-valid">Fijo</span></td><td style="text-align:right;">1,500.00</td></tr>
        <tr><td>Seguros</td><td><span class="status-badge status-valid">Fijo</span></td><td style="text-align:right;">2,000.00</td></tr>
        <tr><td>Materia Prima</td><td><span class="status-badge status-pending">Variable</span></td><td style="text-align:right;">5,000.00</td></tr>
        <tr><td>Comisiones de Venta</td><td><span class="status-badge status-pending">Variable</span></td><td style="text-align:right;">1,500.00</td></tr>
        <tr><td>Embalaje</td><td><span class="status-badge status-pending">Variable</span></td><td style="text-align:right;">2,000.00</td></tr>
    `;
    document.getElementById('costoVentasTable').innerHTML = `
        <tr><td>Producto A</td><td>1,000</td><td style="text-align:right;">5.00</td><td style="text-align:right;">5,000.00</td><td style="text-align:right;">10.00</td><td style="text-align:right; color:green;">5,000.00</td></tr>
        <tr><td>Producto B</td><td>500</td><td style="text-align:right;">12.00</td><td style="text-align:right;">6,000.00</td><td style="text-align:right;">25.00</td><td style="text-align:right; color:green;">6,500.00</td></tr>
        <tr style="font-weight:700;"><td>TOTAL</td><td></td><td></td><td style="text-align:right;">11,000.00</td><td></td><td style="text-align:right; color:green;">11,500.00</td></tr>
    `;
}