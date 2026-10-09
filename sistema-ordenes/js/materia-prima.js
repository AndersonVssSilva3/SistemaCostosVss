// ==================== MATERIA PRIMA ====================

function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

async function initMateriaPrima() {
    console.log('📦 Iniciando Materia Prima...');
    try {
        await renderMP();
        await renderAsignacionesMP();
        console.log('✅ Materia Prima lista');
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderMP() {
    const mp = await DB.getAll('materiaPrima');
    const tbody = document.getElementById('mpTable');
    if (!tbody) return;

    if (mp.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#999;">Sin MP</td></tr>';
        return;
    }

    mp.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));

    tbody.innerHTML = mp.map(m => `
        <tr>
            <td><strong>${textCell(m.codigo)}</strong></td>
            <td>${textCell(m.descripcion || '')}</td>
            <td>${textCell(m.unidad || 'UND')}</td>
            <td style="text-align:right;">${Number(m.stock).toLocaleString('es-PE')}</td>
            <td style="text-align:right;">${fmt(m.costo_unitario)}</td>
            <td style="text-align:right;"><strong>${fmt(Number(m.stock) * Number(m.costo_unitario))}</strong></td>
        </tr>
    `).join('');
}

async function renderAsignacionesMP() {
    const [mp, ordenes, asignaciones] = await Promise.all([
        DB.getAll('materiaPrima'),
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otMateriaPrima')
    ]);

    const tbody = document.getElementById('mpAsignacionesTable');
    if (!tbody) return;

    if (asignaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">Sin asignaciones</td></tr>';
        return;
    }

    const otMap = {};
    ordenes.forEach(o => otMap[o.id] = o.numero_ot);

    tbody.innerHTML = asignaciones.map(a => `
        <tr>
            <td><strong>${textCell(otMap[a.ot_id] || '—')}</strong></td>
            <td>${textCell(a.materia_prima_codigo)}</td>
            <td style="text-align:right;">${Number(a.cantidad).toLocaleString('es-PE')}</td>
            <td style="text-align:right;">${fmt(a.costo_unitario)}</td>
            <td style="text-align:right;"><strong>${fmt(a.costo_total)}</strong></td>
        </tr>
    `).join('');
}

async function exportarMPCSV() {
    const mp = await DB.getAll('materiaPrima');
    let csv = '\uFEFFCódigo;Descripción;Unidad;Stock;Costo Unit;Valor Total\n';
    mp.forEach(m => {
        csv += `"${m.codigo}";"${m.descripcion}";"${m.unidad}";${m.stock};${m.costo_unitario};${Number(m.stock) * Number(m.costo_unitario)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'materia-prima.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}