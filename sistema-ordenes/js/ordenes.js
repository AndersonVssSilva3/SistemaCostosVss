// ==================== SISTEMA DE ÓRDENES DE TRABAJO ====================

// ==================== HELPERS ====================
function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmtCorto(n) {
    const v = Number(n || 0);
    if (Math.abs(v) >= 1000000) return 'S/ ' + (v / 1000000).toFixed(2) + 'M';
    if (Math.abs(v) >= 1000) return 'S/ ' + (v / 1000).toFixed(1) + 'K';
    return 'S/ ' + v.toFixed(2);
}

// ==================== INIT DASHBOARD ====================
async function initDashboardOT() {
    console.log('🏭 Iniciando Dashboard de Órdenes...');
    try {
        await cargarMetricasOT();
        await cargarOrdenesResumen();
        await cargarDistribucionCIF();
        await cargarVentasPorOT();
        console.log('✅ Dashboard OT listo');
    } catch (error) {
        console.error('❌ Error en Dashboard OT:', error);
        showAlert('Error al cargar el dashboard: ' + error.message, 'error');
    }
}

// ==================== 1. MÉTRICAS PRINCIPALES ====================
async function cargarMetricasOT() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    
    if (!ordenes || ordenes.length === 0) {
        document.getElementById('otTotalOTs').textContent = '0';
        document.getElementById('otTotalUnidades').textContent = '0';
        document.getElementById('otTotalCosto').textContent = 'S/ 0.00';
        document.getElementById('otTotalVentas').textContent = 'S/ 0.00';
        return;
    }
    
    const totalOTs = ordenes.length;
    const totalUnidades = ordenes.reduce((s, o) => s + Number(o.unidades_producidas || 0), 0);
    const totalCosto = ordenes.reduce((s, o) => s + Number(o.costo_total || 0), 0);
    
    // Ventas
    let totalVentas = 0;
    const ventas = await DB.getAll('otVentas');
    ventas.forEach(v => totalVentas += Number(v.monto || 0));
    
    // Pintar
    document.getElementById('otTotalOTs').textContent = totalOTs;
    document.getElementById('otTotalUnidades').textContent = totalUnidades.toLocaleString('es-PE');
    document.getElementById('otTotalCosto').textContent = fmtCorto(totalCosto);
    document.getElementById('otTotalVentas').textContent = fmtCorto(totalVentas);
    
    document.getElementById('otTotalCostoFull').textContent = fmt(totalCosto);
    document.getElementById('otTotalVentasFull').textContent = fmt(totalVentas);
}

// ==================== 2. ÓRDENES EN RESUMEN ====================
async function cargarOrdenesResumen() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    const container = document.getElementById('otListaOrdenes');
    if (!container) return;
    
    if (ordenes.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Sin órdenes de trabajo</p>';
        return;
    }
    
    // Ordenar por número de OT
    ordenes.sort((a, b) => (a.numero_ot || '').localeCompare(b.numero_ot || ''));
    
    container.innerHTML = ordenes.map(o => {
        const estado = o.estado === 'en_proceso' ? '🟡 En proceso' : '✅ Terminada';
        return `
            <div class="ot-card">
                <div class="ot-card-header">
                    <div class="ot-card-numero">${textCell(o.numero_ot)}</div>
                    <div class="ot-card-estado">${estado}</div>
                </div>
                <div class="ot-card-desc">${textCell(o.descripcion || '')}</div>
                <div class="ot-card-metrics">
                    <div class="ot-metric">
                        <div class="ot-metric-label">Unidades</div>
                        <div class="ot-metric-value">${Number(o.unidades_producidas || 0).toLocaleString('es-PE')}</div>
                    </div>
                    <div class="ot-metric">
                        <div class="ot-metric-label">Costo total</div>
                        <div class="ot-metric-value">${fmtCorto(o.costo_total)}</div>
                    </div>
                    <div class="ot-metric">
                        <div class="ot-metric-label">Costo unit.</div>
                        <div class="ot-metric-value">${fmt(o.costo_unitario)}</div>
                    </div>
                </div>
                <div class="ot-card-bar">
                    <div class="ot-bar-mp" style="width:${(o.costo_mp / o.costo_total) * 100}%" title="MP: ${fmt(o.costo_mp)}"></div>
                    <div class="ot-bar-mod" style="width:${(o.costo_mod / o.costo_total) * 100}%" title="MOD: ${fmt(o.costo_mod)}"></div>
                    <div class="ot-bar-cif" style="width:${(o.costo_cif / o.costo_total) * 100}%" title="CIF: ${fmt(o.costo_cif)}"></div>
                </div>
                <div class="ot-card-legend">
                    <span><span class="dot dot-mp"></span> MP ${fmtCorto(o.costo_mp)}</span>
                    <span><span class="dot dot-mod"></span> MOD ${fmtCorto(o.costo_mod)}</span>
                    <span><span class="dot dot-cif"></span> CIF ${fmtCorto(o.costo_cif)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== 3. DISTRIBUCIÓN CIF ====================
async function cargarDistribucionCIF() {
    const cif = await DB.getAll('otCif');
    const container = document.getElementById('otCifDistribucion');
    if (!container) return;
    
    if (cif.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Sin datos de CIF</p>';
        return;
    }
    
    // Agrupar por concepto
    const porConcepto = {};
    cif.forEach(c => {
        const concepto = c.concepto;
        if (!porConcepto[concepto]) {
            porConcepto[concepto] = 0;
        }
        porConcepto[concepto] += Number(c.monto || 0);
    });
    
    const datos = Object.entries(porConcepto)
        .map(([concepto, monto]) => ({ concepto, monto }))
        .sort((a, b) => b.monto - a.monto);
    
    const total = datos.reduce((s, d) => s + d.monto, 0) || 1;
    
    const colores = {
        'Energía eléctrica': '#F58220',
        'Agua': '#0891b2',
        'Seguros de fábrica': '#1765bc',
        'Alquiler de fábrica': '#7c3aed',
        'Transporte de personal': '#087565',
        'Mantenimiento': '#b42335',
        'Control de calidad': '#ea580c'
    };
    
    container.innerHTML = datos.map(d => {
        const pct = (d.monto / total) * 100;
        const color = colores[d.concepto] || '#666';
        return `
            <div class="gasto-item">
                <div class="gasto-header">
                    <span class="gasto-label">${textCell(d.concepto)}</span>
                    <span class="gasto-pct">${pct.toFixed(1)}%</span>
                </div>
                <div class="gasto-bar">
                    <div class="gasto-bar-fill" style="width:${pct}%; background:${color};"></div>
                </div>
                <div class="gasto-monto">${fmt(d.monto)}</div>
            </div>
        `;
    }).join('');
}

// ==================== 4. VENTAS POR OT ====================
async function cargarVentasPorOT() {
    const [ordenes, ventas] = await Promise.all([
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otVentas')
    ]);
    
    const container = document.getElementById('otVentasTable');
    if (!container) return;
    
    if (ordenes.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">Sin datos</td></tr>';
        return;
    }
    
    // Mapear ventas por ot_id
    const ventasPorOT = {};
    ventas.forEach(v => {
        ventasPorOT[v.ot_id] = Number(v.monto || 0);
    });
    
    let totalVentas = 0;
    let totalCosto = 0;
    
    container.innerHTML = ordenes.map(o => {
        const venta = ventasPorOT[o.id] || 0;
        const costo = Number(o.costo_total || 0);
        const utilidad = venta - costo;
        const margen = venta > 0 ? (utilidad / venta) * 100 : 0;
        
        totalVentas += venta;
        totalCosto += costo;
        
        return `
            <tr>
                <td><strong>${textCell(o.numero_ot)}</strong></td>
                <td style="text-align:right;">${fmt(costo)}</td>
                <td style="text-align:right;">${fmt(venta)}</td>
                <td style="text-align:right; color:${utilidad >= 0 ? '#087565' : '#b42335'}; font-weight:700;">
                    ${fmt(utilidad)}
                </td>
                <td style="text-align:right; color:${margen >= 0 ? '#087565' : '#b42335'};">
                    ${margen.toFixed(1)}%
                </td>
            </tr>
        `;
    }).join('');
    
    // Totales
    const totalUtilidad = totalVentas - totalCosto;
    const margenTotal = totalVentas > 0 ? (totalUtilidad / totalVentas) * 100 : 0;
    
    container.innerHTML += `
        <tr style="font-weight:700; background:#f0f4f8; border-top:2px solid #b7cadd;">
            <td>TOTAL</td>
            <td style="text-align:right;">${fmt(totalCosto)}</td>
            <td style="text-align:right;">${fmt(totalVentas)}</td>
            <td style="text-align:right; color:${totalUtilidad >= 0 ? '#087565' : '#b42335'};">
                ${fmt(totalUtilidad)}
            </td>
            <td style="text-align:right;">${margenTotal.toFixed(1)}%</td>
        </tr>
    `;
}