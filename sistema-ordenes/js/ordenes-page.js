// ==================== ÓRDENES DE TRABAJO - PÁGINA ====================

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

async function initOrdenesPage() {
    console.log('📋 Iniciando página de Órdenes...');
    try {
        await renderOrdenes();
        console.log('✅ Página de Órdenes lista');
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderOrdenes() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    const tbody = document.getElementById('otTable');
    if (!tbody) return;

    if (ordenes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:#999;">Sin órdenes registradas</td></tr>';
        return;
    }

    ordenes.sort((a, b) => (a.numero_ot || '').localeCompare(b.numero_ot || ''));

    tbody.innerHTML = ordenes.map(o => `
        <tr onclick="verDetalleOT(${o.id})" style="cursor:pointer;">
            <td><strong>${textCell(o.numero_ot)}</strong></td>
            <td>${textCell(o.descripcion || '')}</td>
            <td>${textCell(o.fecha_inicio || '')} → ${textCell(o.fecha_fin || '')}</td>
            <td style="text-align:right;">${Number(o.unidades_producidas || 0).toLocaleString('es-PE')}</td>
            <td style="text-align:right;">${fmt(o.costo_mp)}</td>
            <td style="text-align:right;">${fmt(o.costo_mod)}</td>
            <td style="text-align:right;">${fmt(o.costo_cif)}</td>
            <td style="text-align:right;"><strong>${fmt(o.costo_total)}</strong></td>
            <td style="text-align:right;">${fmt(o.costo_unitario)}</td>
            <td style="text-align:center;">
                <span class="status-badge status-${o.estado === 'en_proceso' ? 'pending' : 'valid'}">
                    ${textCell(o.estado)}
                </span>
            </td>
            <td>
                <button class="view-btn" onclick="event.stopPropagation(); verDetalleOT(${o.id})">👁️</button>
            </td>
        </tr>
    `).join('');
}

async function verDetalleOT(otId) {
    try {
        const ordenes = await DB.getAll('ordenesTrabajo');
        const ot = ordenes.find(o => o.id === otId);
        if (!ot) return;

        const [mp, manoObra, cif, ventas] = await Promise.all([
            DB.getAll('otMateriaPrima'),
            DB.getAll('otManoObra'),
            DB.getAll('otCif'),
            DB.getAll('otVentas')
        ]);

        // Info general
        document.getElementById('detOTNumero').textContent = ot.numero_ot;
        document.getElementById('detOTDesc').textContent = ot.descripcion || '—';
        document.getElementById('detOTFechaInicio').textContent = ot.fecha_inicio || '—';
        document.getElementById('detOTFechaFin').textContent = ot.fecha_fin || '—';
        document.getElementById('detOTEstado').textContent = ot.estado === 'en_proceso' ? '🟡 En proceso' : '✅ Terminada';
        document.getElementById('detOTUnidades').textContent = Number(ot.unidades_producidas || 0).toLocaleString('es-PE');
        document.getElementById('detOTCostoUnit').textContent = fmt(ot.costo_unitario);
        document.getElementById('otDetalleTitulo').textContent = `📊 Detalle de ${ot.numero_ot}`;

        // Resumen de costos
        const total = Number(ot.costo_total) || 1;
        document.getElementById('detOTCostosResumen').innerHTML = `
            <div class="info-row"><strong>Materia Prima:</strong> ${fmt(ot.costo_mp)} (${((ot.costo_mp/total)*100).toFixed(1)}%)</div>
            <div class="info-row"><strong>Mano de Obra:</strong> ${fmt(ot.costo_mod)} (${((ot.costo_mod/total)*100).toFixed(1)}%)</div>
            <div class="info-row"><strong>CIF:</strong> ${fmt(ot.costo_cif)} (${((ot.costo_cif/total)*100).toFixed(1)}%)</div>
            <div class="info-row" style="border-top:2px solid #b7cadd; padding-top:8px; margin-top:8px;">
                <strong>TOTAL:</strong> ${fmt(ot.costo_total)}
            </div>
        `;

        // MP
        const mpOT = mp.filter(m => m.ot_id === otId);
        document.getElementById('detOTMateriaPrima').innerHTML = mpOT.length > 0
            ? mpOT.map(m => `
                <tr>
                    <td>${textCell(m.materia_prima_codigo)}</td>
                    <td style="text-align:right;">${Number(m.cantidad).toLocaleString('es-PE')}</td>
                    <td style="text-align:right;">${fmt(m.costo_unitario)}</td>
                    <td style="text-align:right;"><strong>${fmt(m.costo_total)}</strong></td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center; color:#999;">Sin MP</td></tr>';

        // Mano de obra
        const moOT = manoObra.filter(m => m.ot_id === otId);
        document.getElementById('detOTManoObra').innerHTML = moOT.length > 0
            ? moOT.map(m => `
                <tr>
                    <td><span class="status-badge status-${m.tipo === 'MOD' ? 'valid' : 'pending'}">${textCell(m.tipo)}</span></td>
                    <td>${textCell(m.concepto || '')}</td>
                    <td style="text-align:right;"><strong>${fmt(m.monto)}</strong></td>
                </tr>
            `).join('')
            : '<tr><td colspan="3" style="text-align:center; color:#999;">Sin mano de obra</td></tr>';

        // CIF
        const cifOT = cif.filter(c => c.ot_id === otId);
        document.getElementById('detOTCif').innerHTML = cifOT.length > 0
            ? cifOT.map(c => `
                <tr>
                    <td>${textCell(c.concepto)}</td>
                    <td>${textCell(c.inductor || '')}</td>
                    <td style="text-align:right;">${(Number(c.porcentaje) * 100).toFixed(0)}%</td>
                    <td style="text-align:right;"><strong>${fmt(c.monto)}</strong></td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center; color:#999;">Sin CIF</td></tr>';

        // Venta
        const ventaOT = ventas.find(v => v.ot_id === otId);
        if (ventaOT) {
            const utilidad = Number(ventaOT.monto) - Number(ot.costo_total);
            const margen = ventaOT.monto > 0 ? (utilidad / ventaOT.monto) * 100 : 0;
            document.getElementById('detOTVenta').innerHTML = `
                <tr>
                    <td>${textCell(ventaOT.fecha)}</td>
                    <td>${fmt(ventaOT.monto)}</td>
                    <td>${textCell(ventaOT.tipo_pago)}</td>
                    <td style="text-align:right; color:${utilidad >= 0 ? '#087565' : '#b42335'}; font-weight:700;">
                        ${fmt(utilidad)}
                    </td>
                    <td style="text-align:right;">${margen.toFixed(1)}%</td>
                </tr>
            `;
        } else {
            document.getElementById('detOTVenta').innerHTML = 
                '<tr><td colspan="5" style="text-align:center; color:#999;">Sin ventas registradas</td></tr>';
        }

        // Mostrar el detalle
        document.getElementById('otDetalle').style.display = 'block';
        document.getElementById('otDetalle').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al ver detalle: ' + error.message, 'error');
    }
}

function cerrarDetalleOT() {
    document.getElementById('otDetalle').style.display = 'none';
}

function filterOrdenes() {
    const search = (document.getElementById('searchOT')?.value || '').toLowerCase();
    const estado = document.getElementById('filterEstadoOT')?.value || '';

    document.querySelectorAll('#otTable tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        let visible = text.includes(search);
        if (estado && !text.includes(estado)) visible = false;
        row.style.display = visible ? '' : 'none';
    });
}

async function exportarOTCSV() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    let csv = '\uFEFFN° OT;Descripción;Inicio;Fin;Unidades;Costo MP;Costo MOD;Costo CIF;Costo Total;Costo Unit;Estado\n';
    ordenes.forEach(o => {
        csv += `"${o.numero_ot}";"${o.descripcion || ''}";"${o.fecha_inicio || ''}";"${o.fecha_fin || ''}";${o.unidades_producidas};${o.costo_mp};${o.costo_mod};${o.costo_cif};${o.costo_total};${o.costo_unitario};"${o.estado}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ordenes-trabajo.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}