// ==================== REPORTES ====================

function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function fmtCorto(n) {
    const v = Number(n || 0);
    if (Math.abs(v) >= 1000000) return 'S/ ' + (v / 1000000).toFixed(2) + 'M';
    if (Math.abs(v) >= 1000) return 'S/ ' + (v / 1000).toFixed(1) + 'K';
    return 'S/ ' + v.toFixed(2);
}

async function initReportes() {
    console.log('☷ Iniciando Reportes...');
    try {
        await Promise.all([
            renderKPIs(),
            renderComposicion(),
            renderRentabilidad(),
            renderDistribucionCIF()
        ]);
        console.log('✅ Reportes listos');
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderKPIs() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    const ventas = await DB.getAll('otVentas');

    const totalCosto = ordenes.reduce((s, o) => s + Number(o.costo_total || 0), 0);
    const totalUnidades = ordenes.reduce((s, o) => s + Number(o.unidades_producidas || 0), 0);
    const totalVentas = ventas.reduce((s, v) => s + Number(v.monto || 0), 0);

    const costoUnitProm = totalUnidades > 0 ? totalCosto / totalUnidades : 0;
    const margenProm = totalVentas > 0 ? ((totalVentas - totalCosto) / totalVentas) * 100 : 0;
    const roi = totalCosto > 0 ? ((totalVentas - totalCosto) / totalCosto) * 100 : 0;

    document.getElementById('repCostoTotal').textContent = fmtCorto(totalCosto);
    document.getElementById('repCostoUnitProm').textContent = fmt(costoUnitProm);
    document.getElementById('repMargenProm').textContent = margenProm.toFixed(1) + '%';
    document.getElementById('repROI').textContent = roi.toFixed(1) + '%';
}

async function renderComposicion() {
    const [ordenes, mp, mo, cif] = await Promise.all([
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otMateriaPrima'),
        DB.getAll('otManoObra'),
        DB.getAll('otCif')
    ]);

    const totalMP = mp.reduce((s, m) => s + Number(m.costo_total || 0), 0);
    const totalMOD = mo.filter(m => m.tipo === 'MOD').reduce((s, m) => s + Number(m.monto || 0), 0);
    const totalMOI = mo.filter(m => m.tipo === 'MOI').reduce((s, m) => s + Number(m.monto || 0), 0);
    const totalCIF = cif.reduce((s, c) => s + Number(c.monto || 0), 0);
    const total = totalMP + totalMOD + totalMOI + totalCIF || 1;

    const datos = [
        { label: 'Materia Prima', monto: totalMP, color: '#1765bc', icon: '📦' },
        { label: 'Mano de Obra Directa', monto: totalMOD, color: '#F58220', icon: '👷' },
        { label: 'Mano de Obra Indirecta', monto: totalMOI, color: '#d96d10', icon: '⚙️' },
        { label: 'CIF', monto: totalCIF, color: '#087565', icon: '🔧' }
    ];

    const container = document.getElementById('repComposicion');
    container.innerHTML = datos.map(d => {
        const pct = (d.monto / total) * 100;
        return `
            <div class="gasto-item">
                <div class="gasto-header">
                    <span class="gasto-icon">${d.icon}</span>
                    <span class="gasto-label">${d.label}</span>
                    <span class="gasto-pct">${pct.toFixed(1)}%</span>
                </div>
                <div class="gasto-bar">
                    <div class="gasto-bar-fill" style="width:${pct}%; background:${d.color};"></div>
                </div>
                <div class="gasto-monto">${fmt(d.monto)}</div>
            </div>
        `;
    }).join('');
}

async function renderRentabilidad() {
    const [ordenes, ventas] = await Promise.all([
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otVentas')
    ]);

    const tbody = document.getElementById('repRentabilidad');
    
    let totalCosto = 0, totalVenta = 0;

    tbody.innerHTML = ordenes.map(o => {
        const venta = ventas.find(v => v.ot_id === o.id);
        const montoVenta = Number(venta?.monto || 0);
        const costo = Number(o.costo_total || 0);
        const utilidad = montoVenta - costo;
        const margen = montoVenta > 0 ? (utilidad / montoVenta) * 100 : 0;

        totalCosto += costo;
        totalVenta += montoVenta;

        return `
            <tr>
                <td><strong>${textCell(o.numero_ot)}</strong></td>
                <td style="text-align:right;">${fmt(costo)}</td>
                <td style="text-align:right;">${fmt(montoVenta)}</td>
                <td style="text-align:right; color:${utilidad >= 0 ? '#087565' : '#b42335'}; font-weight:700;">
                    ${fmt(utilidad)}
                </td>
                <td style="text-align:right; color:${margen >= 0 ? '#087565' : '#b42335'};">
                    ${margen.toFixed(1)}%
                </td>
            </tr>
        `;
    }).join('');

    const totalUtilidad = totalVenta - totalCosto;
    const margenTotal = totalVenta > 0 ? (totalUtilidad / totalVenta) * 100 : 0;

    tbody.innerHTML += `
        <tr style="background:#102b46; color:white; font-weight:700;">
            <td>TOTAL</td>
            <td style="text-align:right;">${fmt(totalCosto)}</td>
            <td style="text-align:right;">${fmt(totalVenta)}</td>
            <td style="text-align:right;">${fmt(totalUtilidad)}</td>
            <td style="text-align:right;">${margenTotal.toFixed(1)}%</td>
        </tr>
    `;
}

async function renderDistribucionCIF() {
    const cif = await DB.getAll('otCif');
    
    const porConcepto = {};
    cif.forEach(c => {
        porConcepto[c.concepto] = (porConcepto[c.concepto] || 0) + Number(c.monto || 0);
    });

    const datos = Object.entries(porConcepto)
        .map(([concepto, monto]) => ({ concepto, monto }))
        .sort((a, b) => b.monto - a.monto);

    const total = datos.reduce((s, d) => s + d.monto, 0) || 1;

    const container = document.getElementById('repCIF');
    container.innerHTML = datos.map(d => {
        const pct = (d.monto / total) * 100;
        return `
            <div class="gasto-item">
                <div class="gasto-header">
                    <span class="gasto-label">${textCell(d.concepto)}</span>
                    <span class="gasto-pct">${pct.toFixed(1)}%</span>
                </div>
                <div class="gasto-bar">
                    <div class="gasto-bar-fill" style="width:${pct}%; background:#087565;"></div>
                </div>
                <div class="gasto-monto">${fmt(d.monto)}</div>
            </div>
        `;
    }).join('');
}