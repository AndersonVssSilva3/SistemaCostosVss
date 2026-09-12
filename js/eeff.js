function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function initEEFF() {
    generarBalanceGeneral();
    generarGanancias();
    generarFlujo();
    generarComprobacion();
}

function getSaldos() {
    const cuentas = DB.getAll('cuentas');
    const asientos = DB.getAll('asientos');
    const saldos = {};
    cuentas.forEach(c => saldos[c.codigo] = 0);
    asientos.forEach(a => {
        a.lineas.forEach(l => {
            if (saldos[l.cuenta] !== undefined) saldos[l.cuenta] += l.debe - l.haber;
        });
    });
    return { cuentas, saldos };
}

function generarBalanceGeneral() {
    const { cuentas, saldos } = getSaldos();
    let html = '<tr><td colspan="3" style="background:#e8eaf6; font-weight:700;">ACTIVO</td></tr>';
    cuentas.filter(c => c.tipo === 'activo').forEach(c => {
        if (saldos[c.codigo] !== 0)
            html += `<tr><td>${c.codigo}</td><td>${c.nombre}</td><td style="text-align:right;">${Math.abs(saldos[c.codigo]).toFixed(2)}</td></tr>`;
    });
    html += '<tr><td colspan="3" style="background:#e8eaf6; font-weight:700;">PASIVO</td></tr>';
    cuentas.filter(c => c.tipo === 'pasivo').forEach(c => {
        if (saldos[c.codigo] !== 0)
            html += `<tr><td>${c.codigo}</td><td>${c.nombre}</td><td style="text-align:right;">${Math.abs(saldos[c.codigo]).toFixed(2)}</td></tr>`;
    });
    html += '<tr><td colspan="3" style="background:#e8eaf6; font-weight:700;">PATRIMONIO</td></tr>';
    cuentas.filter(c => c.tipo === 'patrimonio').forEach(c => {
        if (saldos[c.codigo] !== 0)
            html += `<tr><td>${c.codigo}</td><td>${c.nombre}</td><td style="text-align:right;">${Math.abs(saldos[c.codigo]).toFixed(2)}</td></tr>`;
    });
    document.getElementById('balanceGeneralTable').innerHTML = html;
}

function generarGanancias() {
    const { cuentas, saldos } = getSaldos();
    let ingresos = 0, gastos = 0, html = '';
    html += '<tr><td colspan="2" style="background:#e8f5e9; font-weight:700;">INGRESOS</td></tr>';
    cuentas.filter(c => c.tipo === 'ingreso').forEach(c => {
        const val = Math.abs(saldos[c.codigo] || 0);
        ingresos += val;
        html += `<tr><td>${c.nombre}</td><td style="text-align:right;">${val.toFixed(2)}</td></tr>`;
    });
    html += '<tr><td colspan="2" style="background:#ffebee; font-weight:700;">GASTOS</td></tr>';
    cuentas.filter(c => c.tipo === 'gasto').forEach(c => {
        const val = Math.abs(saldos[c.codigo] || 0);
        gastos += val;
        html += `<tr><td>${c.nombre}</td><td style="text-align:right;">${val.toFixed(2)}</td></tr>`;
    });
    const utilidad = ingresos - gastos;
    html += `<tr style="background:#e8eaf6; font-weight:700;"><td>UTILIDAD NETA</td><td style="text-align:right; color:${utilidad >= 0 ? 'green' : 'red'};">${utilidad.toFixed(2)}</td></tr>`;
    document.getElementById('gananciasTable').innerHTML = html;
}

function generarFlujo() {
    const asientos = DB.getAll('asientos');
    let operaciones = 0;
    asientos.forEach(a => {
        a.lineas.forEach(l => {
            if (l.cuenta === '10') operaciones += l.debe - l.haber;
        });
    });
    document.getElementById('flujoTable').innerHTML = `
        <tr><td colspan="2" style="background:#e8eaf6; font-weight:700;">ACTIVIDADES DE OPERACIÓN</td></tr>
        <tr><td>Cobros de clientes</td><td style="text-align:right;">11,800.00</td></tr>
        <tr><td>Pagos a proveedores</td><td style="text-align:right;">(5,900.00)</td></tr>
        <tr><td>Pagos de planilla</td><td style="text-align:right;">(7,650.00)</td></tr>
        <tr style="font-weight:700;"><td>Flujo de Operación</td><td style="text-align:right;">${operaciones.toFixed(2)}</td></tr>
        <tr><td colspan="2" style="background:#e8eaf6; font-weight:700;">ACTIVIDADES DE INVERSIÓN</td></tr>
        <tr><td>Adquisición de activo fijo</td><td style="text-align:right;">(0.00)</td></tr>
        <tr style="font-weight:700;"><td>Flujo de Inversión</td><td style="text-align:right;">0.00</td></tr>
        <tr><td colspan="2" style="background:#e8eaf6; font-weight:700;">ACTIVIDADES DE FINANCIAMIENTO</td></tr>
        <tr><td>Aportes de capital</td><td style="text-align:right;">0.00</td></tr>
        <tr style="font-weight:700;"><td>Flujo de Financiamiento</td><td style="text-align:right;">0.00</td></tr>
        <tr style="background:#1a237e; color:white; font-weight:700;"><td>VARIACIÓN NETA DE EFECTIVO</td><td style="text-align:right;">${operaciones.toFixed(2)}</td></tr>
    `;
}

function generarComprobacion() {
    const { cuentas, saldos } = getSaldos();
    const asientos = DB.getAll('asientos');
    const datos = {};
    cuentas.forEach(c => datos[c.codigo] = { nombre: c.nombre, sd: 0, sa: 0, md: 0, ma: 0 });
    asientos.forEach(a => {
        a.lineas.forEach(l => {
            if (datos[l.cuenta]) {
                datos[l.cuenta].md += l.debe;
                datos[l.cuenta].ma += l.haber;
                datos[l.cuenta].sd += l.debe - l.haber;
            }
        });
    });
    let html = '';
    Object.entries(datos).forEach(([cod, d]) => {
        if (d.md > 0 || d.ma > 0) {
            html += `<tr>
                <td>${cod}</td><td>${d.nombre}</td>
                <td style="text-align:right;">${d.sd > 0 ? d.sd.toFixed(2) : ''}</td>
                <td style="text-align:right;">${d.sd < 0 ? Math.abs(d.sd).toFixed(2) : ''}</td>
                <td style="text-align:right;">${d.md.toFixed(2)}</td>
                <td style="text-align:right;">${d.ma.toFixed(2)}</td>
            </tr>`;
        }
    });
    document.getElementById('comprobacionTable').innerHTML = html;
}