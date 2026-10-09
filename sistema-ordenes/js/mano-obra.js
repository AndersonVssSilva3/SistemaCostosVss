// ==================== MANO DE OBRA ====================

function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

async function initManoObra() {
    console.log('👷 Iniciando Mano de Obra...');
    try {
        await renderManoObra();
        console.log('✅ Mano de Obra lista');
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderManoObra() {
    const [mo, ordenes] = await Promise.all([
        DB.getAll('otManoObra'),
        DB.getAll('ordenesTrabajo')
    ]);

    const tbody = document.getElementById('moTable');
    if (!tbody) return;

    if (mo.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">Sin datos</td></tr>';
        return;
    }

    const otMap = {};
    ordenes.forEach(o => otMap[o.id] = o.numero_ot);

    let totalMOD = 0, totalMOI = 0;

    tbody.innerHTML = mo.map(m => {
        if (m.tipo === 'MOD') totalMOD += Number(m.monto);
        else totalMOI += Number(m.monto);

        return `
            <tr>
                <td><strong>${textCell(otMap[m.ot_id] || '—')}</strong></td>
                <td>
                    <span class="status-badge status-${m.tipo === 'MOD' ? 'valid' : 'pending'}">
                        ${textCell(m.tipo)}
                    </span>
                </td>
                <td>${textCell(m.concepto || '')}</td>
                <td style="text-align:right;"><strong>${fmt(m.monto)}</strong></td>
            </tr>
        `;
    }).join('');

    document.getElementById('moTotalMOD').textContent = fmt(totalMOD);
    document.getElementById('moTotalMOI').textContent = fmt(totalMOI);
    document.getElementById('moTotalGeneral').textContent = fmt(totalMOD + totalMOI);
}

async function exportarMOCSV() {
    const mo = await DB.getAll('otManoObra');
    const ordenes = await DB.getAll('ordenesTrabajo');
    const otMap = {};
    ordenes.forEach(o => otMap[o.id] = o.numero_ot);

    let csv = '\uFEFFOT;Tipo;Concepto;Monto\n';
    mo.forEach(m => {
        csv += `"${otMap[m.ot_id] || ''}";"${m.tipo}";"${m.concepto || ''}";${m.monto}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mano-obra.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}