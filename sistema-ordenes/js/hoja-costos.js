// ==================== HOJA DE COSTOS POR ORDEN DE TRABAJO ====================
// Detalle de los tres elementos del costo (MP, MO, CIF) acumulados en la cuenta 23 de cada OT

function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function fmtCant(n) {
    return Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
}

async function initHojaCostos() {
    try {
        const ordenes = await DB.getAll('ordenesTrabajo');
        ordenes.sort((a, b) => (a.numero_ot || '').localeCompare(b.numero_ot || ''));

        const select = document.getElementById('hcOT');
        select.innerHTML = ordenes.map(o =>
            `<option value="${o.id}">${textCell(o.numero_ot)} - ${textCell(o.descripcion || '')}</option>`
        ).join('');

        // Permite abrir la hoja de una OT concreta: hoja-costos.html#5
        const desdeLink = location.hash.replace('#', '');
        if (desdeLink && ordenes.some(o => String(o.id) === desdeLink)) select.value = desdeLink;

        await renderHojaCostos();
    } catch (error) {
        console.error('Error iniciando Hoja de Costos:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderHojaCostos() {
    const cont = document.getElementById('hojaCostos');
    const otId = Number(document.getElementById('hcOT').value);
    if (!otId) {
        cont.innerHTML = '<p style="text-align:center; color:#999;">No hay órdenes de trabajo registradas</p>';
        return;
    }

    const [ordenes, mp, mo, cif, ventas, catalogo] = await Promise.all([
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otMateriaPrima'),
        DB.getAll('otManoObra'),
        DB.getAll('otCif'),
        DB.getAll('otVentas'),
        DB.getAll('materiaPrima')
    ]);

    const ot = ordenes.find(o => o.id === otId);
    if (!ot) return;

    const nombreMP = {};
    catalogo.forEach(m => nombreMP[m.codigo] = m.descripcion);

    const mpOT = mp.filter(m => m.ot_id === otId);
    const moOT = mo.filter(m => m.ot_id === otId);
    const cifOT = cif.filter(c => c.ot_id === otId);
    const venta = ventas.find(v => v.ot_id === otId);

    const totalMP = mpOT.reduce((s, m) => s + Number(m.costo_total || 0), 0);
    const totalMOD = moOT.filter(m => m.tipo === 'MOD').reduce((s, m) => s + Number(m.monto || 0), 0);
    const totalMOI = moOT.filter(m => m.tipo !== 'MOD').reduce((s, m) => s + Number(m.monto || 0), 0);
    const totalCIF = cifOT.reduce((s, c) => s + Number(c.monto || 0), 0);
    const costoTotal = totalMP + totalMOD + totalMOI + totalCIF;
    const unidades = Number(ot.unidades_producidas) || 0;
    const costoUnit = unidades > 0 ? costoTotal / unidades : 0;
    const pct = n => costoTotal > 0 ? (n / costoTotal * 100).toFixed(1) + '%' : '—';

    const vacio = cols => `<tr><td colspan="${cols}" style="text-align:center; color:#999;">Sin registros</td></tr>`;

    cont.innerHTML = `
        <h2 style="text-align:center;">HOJA DE COSTOS N° ${textCell(ot.numero_ot)}</h2>
        <div class="hc-encabezado">
            <div>Empresa<strong>VSS Fábrica S.A.C.</strong></div>
            <div>Producto / Descripción<strong>${textCell(ot.descripcion || '—')}</strong></div>
            <div>Fecha de inicio<strong>${textCell(ot.fecha_inicio || '—')}</strong></div>
            <div>Fecha de término<strong>${textCell(ot.fecha_fin || '—')}</strong></div>
            <div>Unidades producidas<strong>${fmtCant(unidades)}</strong></div>
            <div>Estado<strong>${ot.estado === 'terminada' ? '✅ Terminada' : '🟡 En proceso'}</strong></div>
        </div>

        <div class="hc-seccion">
            <h3>1. Materia Prima Directa</h3>
            <div class="table-container"><table>
                <thead><tr><th>Código</th><th>Descripción</th><th style="text-align:right;">Cantidad</th><th style="text-align:right;">Costo Unit.</th><th style="text-align:right;">Total</th></tr></thead>
                <tbody>
                    ${mpOT.map(m => `<tr>
                        <td>${textCell(m.materia_prima_codigo)}</td>
                        <td>${textCell(nombreMP[m.materia_prima_codigo] || '—')}</td>
                        <td style="text-align:right;">${fmtCant(m.cantidad)}</td>
                        <td style="text-align:right;">${fmt(m.costo_unitario)}</td>
                        <td style="text-align:right;">${fmt(m.costo_total)}</td>
                    </tr>`).join('') || vacio(5)}
                    <tr class="hc-subtotal"><td colspan="4">Total Materia Prima</td><td style="text-align:right;">${fmt(totalMP)}</td></tr>
                </tbody>
            </table></div>
        </div>

        <div class="hc-seccion">
            <h3>2. Mano de Obra</h3>
            <div class="table-container"><table>
                <thead><tr><th>Tipo</th><th>Concepto</th><th style="text-align:right;">Monto</th></tr></thead>
                <tbody>
                    ${moOT.map(m => `<tr>
                        <td><span class="status-badge status-${m.tipo === 'MOD' ? 'valid' : 'pending'}">${textCell(m.tipo)}</span></td>
                        <td>${textCell(m.concepto || '')}</td>
                        <td style="text-align:right;">${fmt(m.monto)}</td>
                    </tr>`).join('') || vacio(3)}
                    <tr class="hc-subtotal"><td colspan="2">Total Mano de Obra (MOD ${fmt(totalMOD)} · MOI ${fmt(totalMOI)})</td><td style="text-align:right;">${fmt(totalMOD + totalMOI)}</td></tr>
                </tbody>
            </table></div>
        </div>

        <div class="hc-seccion">
            <h3>3. Costos Indirectos de Fabricación</h3>
            <div class="table-container"><table>
                <thead><tr><th>Concepto</th><th>Inductor</th><th style="text-align:right;">% Asignado</th><th style="text-align:right;">Monto</th></tr></thead>
                <tbody>
                    ${cifOT.map(c => `<tr>
                        <td>${textCell(c.concepto)}</td>
                        <td>${textCell(c.inductor || '—')}</td>
                        <td style="text-align:right;">${c.porcentaje ? (Number(c.porcentaje) * 100).toFixed(0) + '%' : '—'}</td>
                        <td style="text-align:right;">${fmt(c.monto)}</td>
                    </tr>`).join('') || vacio(4)}
                    <tr class="hc-subtotal"><td colspan="3">Total CIF</td><td style="text-align:right;">${fmt(totalCIF)}</td></tr>
                </tbody>
            </table></div>
        </div>

        <div class="hc-seccion">
            <h3>Resumen de la Hoja de Costos</h3>
            <table class="hc-resumen">
                <tbody>
                    <tr><td>Materia Prima Directa</td><td>${pct(totalMP)}</td><td>${fmt(totalMP)}</td></tr>
                    <tr><td>Mano de Obra Directa (MOD)</td><td>${pct(totalMOD)}</td><td>${fmt(totalMOD)}</td></tr>
                    <tr><td>Mano de Obra Indirecta (MOI)</td><td>${pct(totalMOI)}</td><td>${fmt(totalMOI)}</td></tr>
                    <tr><td>Costos Indirectos de Fabricación</td><td>${pct(totalCIF)}</td><td>${fmt(totalCIF)}</td></tr>
                    <tr class="hc-total"><td>COSTO TOTAL DE PRODUCCIÓN</td><td></td><td>${fmt(costoTotal)}</td></tr>
                    <tr><td>Unidades producidas</td><td></td><td>${fmtCant(unidades)}</td></tr>
                    <tr class="hc-total"><td>COSTO UNITARIO</td><td></td><td>${fmt(costoUnit)}</td></tr>
                    ${venta ? `
                    <tr><td>Precio de venta (${textCell(venta.fecha)})</td><td></td><td>${fmt(venta.monto)}</td></tr>
                    <tr><td>Utilidad bruta</td><td>${Number(venta.monto) > 0 ? ((Number(venta.monto) - costoTotal) / Number(venta.monto) * 100).toFixed(1) + '%' : ''}</td><td>${fmt(Number(venta.monto) - costoTotal)}</td></tr>
                    ` : ''}
                </tbody>
            </table>
        </div>
    `;
}

window.renderHojaCostos = renderHojaCostos;
