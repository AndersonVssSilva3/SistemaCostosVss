// ==================== EEFF - ESTADOS FINANCIEROS ====================

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

async function initEEFF() {
    await generarBalanceGeneral();
    await generarGanancias();
    await generarFlujo();
    await generarComprobacion();
}

// ==================== OBTENER SALDOS ====================
async function getSaldos() {
    const cuentas = await DB.getAll('cuentas');
    const asientos = await DB.getAll('asientos');
    const saldos = {};
    cuentas.forEach(c => saldos[c.codigo] = 0);
    
    asientos.forEach(a => {
        a.lineas.forEach(l => {
            if (saldos[l.cuenta] !== undefined) {
                saldos[l.cuenta] += (l.debe || 0) - (l.haber || 0);
            }
        });
    });
    return { cuentas, saldos };
}

// ==================== BALANCE GENERAL ====================
async function generarBalanceGeneral() {
    const { cuentas, saldos } = await getSaldos();
    let html = '<tr><td colspan="3" style="background:#e8eaf6; font-weight:700;">ACTIVO</td></tr>';
    let totalActivo = 0;
    
    cuentas.filter(c => c.tipo === 'activo' && !c.es_padre).forEach(c => {
        const val = Math.abs(saldos[c.codigo] || 0);
        if (val !== 0) {
            totalActivo += val;
            html += `<tr><td>${textCell(c.codigo)}</td><td>${textCell(c.nombre)}</td><td style="text-align:right;">${val.toFixed(2)}</td></tr>`;
        }
    });
    html += `<tr style="font-weight:700; background:#f0f4f8;"><td colspan="2">TOTAL ACTIVO</td><td style="text-align:right;">${totalActivo.toFixed(2)}</td></tr>`;
    
    html += '<tr><td colspan="3" style="background:#e8eaf6; font-weight:700;">PASIVO</td></tr>';
    let totalPasivo = 0;
    cuentas.filter(c => c.tipo === 'pasivo' && !c.es_padre).forEach(c => {
        const val = Math.abs(saldos[c.codigo] || 0);
        if (val !== 0) {
            totalPasivo += val;
            html += `<tr><td>${textCell(c.codigo)}</td><td>${textCell(c.nombre)}</td><td style="text-align:right;">${val.toFixed(2)}</td></tr>`;
        }
    });
    html += `<tr style="font-weight:700; background:#f0f4f8;"><td colspan="2">TOTAL PASIVO</td><td style="text-align:right;">${totalPasivo.toFixed(2)}</td></tr>`;
    
    html += '<tr><td colspan="3" style="background:#e8eaf6; font-weight:700;">PATRIMONIO</td></tr>';
    let totalPatrimonio = 0;
    cuentas.filter(c => c.tipo === 'patrimonio' && !c.es_padre).forEach(c => {
        const val = Math.abs(saldos[c.codigo] || 0);
        if (val !== 0) {
            totalPatrimonio += val;
            html += `<tr><td>${textCell(c.codigo)}</td><td>${textCell(c.nombre)}</td><td style="text-align:right;">${val.toFixed(2)}</td></tr>`;
        }
    });
    html += `<tr style="font-weight:700; background:#f0f4f8;"><td colspan="2">TOTAL PATRIMONIO</td><td style="text-align:right;">${totalPatrimonio.toFixed(2)}</td></tr>`;
    html += `<tr style="font-weight:700; background:#1a237e; color:white;"><td colspan="2">TOTAL PASIVO + PATRIMONIO</td><td style="text-align:right;">${(totalPasivo + totalPatrimonio).toFixed(2)}</td></tr>`;
    
    document.getElementById('balanceGeneralTable').innerHTML = html;
}

// ==================== GANANCIAS Y PÉRDIDAS ====================
async function generarGanancias() {
    const { cuentas, saldos } = await getSaldos();
    let ingresos = 0, gastos = 0, html = '';
    
    html += '<tr><td colspan="2" style="background:#e8f5e9; font-weight:700;">INGRESOS</td></tr>';
    cuentas.filter(c => c.tipo === 'ingreso' && !c.es_padre).forEach(c => {
        const val = Math.abs(saldos[c.codigo] || 0);
        if (val !== 0) {
            ingresos += val;
            html += `<tr><td>${textCell(c.codigo)} - ${textCell(c.nombre)}</td><td style="text-align:right;">${val.toFixed(2)}</td></tr>`;
        }
    });
    html += `<tr style="font-weight:700;"><td>TOTAL INGRESOS</td><td style="text-align:right;">${ingresos.toFixed(2)}</td></tr>`;
    
    html += '<tr><td colspan="2" style="background:#ffebee; font-weight:700;">GASTOS</td></tr>';
    cuentas.filter(c => c.tipo === 'gasto' && !c.es_padre).forEach(c => {
        const val = Math.abs(saldos[c.codigo] || 0);
        if (val !== 0) {
            gastos += val;
            html += `<tr><td>${textCell(c.codigo)} - ${textCell(c.nombre)}</td><td style="text-align:right;">${val.toFixed(2)}</td></tr>`;
        }
    });
    html += `<tr style="font-weight:700;"><td>TOTAL GASTOS</td><td style="text-align:right;">${gastos.toFixed(2)}</td></tr>`;
    
    const utilidad = ingresos - gastos;
    html += `<tr style="background:#e8eaf6; font-weight:700;">
        <td>UTILIDAD NETA</td>
        <td style="text-align:right; color:${utilidad >= 0 ? 'green' : 'red'};">${utilidad.toFixed(2)}</td></tr>`;
    
    document.getElementById('gananciasTable').innerHTML = html;
}

// ==================== FLUJO DE EFECTIVO ====================
async function generarFlujo() {
    const asientos = await DB.getAll('asientos');
    let operaciones = 0;
    
    asientos.forEach(a => {
        a.lineas.forEach(l => {
            // Cuentas de efectivo: 10x
            if (l.cuenta && l.cuenta.startsWith('10')) {
                operaciones += (l.debe || 0) - (l.haber || 0);
            }
        });
    });
    
    document.getElementById('flujoTable').innerHTML = `
        <tr><td colspan="2" style="background:#e8eaf6; font-weight:700;">ACTIVIDADES DE OPERACIÓN</td></tr>
        <tr><td>Cobros de clientes y otros</td><td style="text-align:right;">${operaciones > 0 ? operaciones.toFixed(2) : '0.00'}</td></tr>
        <tr><td>Pagos a proveedores y otros</td><td style="text-align:right;">${operaciones < 0 ? `(${Math.abs(operaciones).toFixed(2)})` : '0.00'}</td></tr>
        <tr style="font-weight:700;">
            <td>Flujo Neto de Operación</td>
            <td style="text-align:right;">${operaciones.toFixed(2)}</td>
        </tr>
        <tr><td colspan="2" style="background:#e8eaf6; font-weight:700;">ACTIVIDADES DE INVERSIÓN</td></tr>
        <tr><td>Adquisición de activo fijo</td><td style="text-align:right;">(0.00)</td></tr>
        <tr style="font-weight:700;"><td>Flujo Neto de Inversión</td><td style="text-align:right;">0.00</td></tr>
        <tr><td colspan="2" style="background:#e8eaf6; font-weight:700;">ACTIVIDADES DE FINANCIAMIENTO</td></tr>
        <tr><td>Aportes de capital</td><td style="text-align:right;">0.00</td></tr>
        <tr style="font-weight:700;"><td>Flujo Neto de Financiamiento</td><td style="text-align:right;">0.00</td></tr>
        <tr style="background:#1a237e; color:white; font-weight:700;">
            <td>VARIACIÓN NETA DE EFECTIVO</td>
            <td style="text-align:right;">${operaciones.toFixed(2)}</td>
        </tr>
    `;
}

// ==================== BALANCE DE COMPROBACIÓN ====================
async function generarComprobacion() {
    const cuentas = await DB.getAll('cuentas');
    const asientos = await DB.getAll('asientos');
    const datos = {};
    
    cuentas.forEach(c => {
        datos[c.codigo] = { nombre: c.nombre, sd: 0, sa: 0, md: 0, ma: 0 };
    });
    
    asientos.forEach(a => {
        a.lineas.forEach(l => {
            if (datos[l.cuenta]) {
                datos[l.cuenta].md += (l.debe || 0);
                datos[l.cuenta].ma += (l.haber || 0);
                datos[l.cuenta].sd += (l.debe || 0) - (l.haber || 0);
            }
        });
    });
    
    let html = '';
    let totalSD = 0, totalSA = 0, totalMD = 0, totalMA = 0;
    
    Object.entries(datos).forEach(([cod, d]) => {
        if (d.md > 0 || d.ma > 0) {
            const sd = d.sd > 0 ? d.sd : 0;
            const sa = d.sd < 0 ? Math.abs(d.sd) : 0;
            totalSD += sd;
            totalSA += sa;
            totalMD += d.md;
            totalMA += d.ma;
            
            html += `<tr>
                <td>${textCell(cod)}</td>
                <td>${textCell(d.nombre)}</td>
                <td style="text-align:right;">${sd > 0 ? sd.toFixed(2) : ''}</td>
                <td style="text-align:right;">${sa > 0 ? sa.toFixed(2) : ''}</td>
                <td style="text-align:right;">${d.md.toFixed(2)}</td>
                <td style="text-align:right;">${d.ma.toFixed(2)}</td>
            </tr>`;
        }
    });
    
    html += `<tr style="font-weight:700; background:#e8eaf6;">
        <td colspan="2">TOTALES</td>
        <td style="text-align:right;">${totalSD.toFixed(2)}</td>
        <td style="text-align:right;">${totalSA.toFixed(2)}</td>
        <td style="text-align:right;">${totalMD.toFixed(2)}</td>
        <td style="text-align:right;">${totalMA.toFixed(2)}</td>
    </tr>`;
    
    document.getElementById('comprobacionTable').innerHTML = html;
}