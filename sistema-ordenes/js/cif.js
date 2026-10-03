// ==================== CIF ====================

function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

async function initCIF() {
    console.log('⚙️ Iniciando CIF...');
    try {
        await renderCIF();
        console.log('✅ CIF listo');
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderCIF() {
    const [cif, ordenes] = await Promise.all([
        DB.getAll('otCif'),
        DB.getAll('ordenesTrabajo')
    ]);

    const tbody = document.getElementById('cifTable');
    if (!tbody) return;

    if (cif.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#999;">Sin datos</td></tr>';
        return;
    }

    // Mapear OT
    const otMap = {};
    ordenes.forEach(o => otMap[o.id] = o.numero_ot);

    // Agrupar por concepto
    const porConcepto = {};
    cif.forEach(c => {
        const key = c.concepto;
        if (!porConcepto[key]) {
            porConcepto[key] = {
                concepto: c.concepto,
                inductor: c.inductor,
                ot101: 0,
                ot102: 0,
                ot103: 0,
                total: 0
            };
        }
        const monto = Number(c.monto || 0);
        const otNumero = otMap[c.ot_id];
        if (otNumero === 'OT-101') porConcepto[key].ot101 += monto;
        if (otNumero === 'OT-102') porConcepto[key].ot102 += monto;
        if (otNumero === 'OT-103') porConcepto[key].ot103 += monto;
        porConcepto[key].total += monto;
    });

    const datos = Object.values(porConcepto).sort((a, b) => b.total - a.total);

    tbody.innerHTML = datos.map(d => `
        <tr>
            <td><strong>${textCell(d.concepto)}</strong></td>
            <td>${textCell(d.inductor || '')}</td>
            <td style="text-align:right;">${fmt(d.ot101)}</td>
            <td style="text-align:right;">${fmt(d.ot102)}</td>
            <td style="text-align:right;">${fmt(d.ot103)}</td>
            <td style="text-align:right;"><strong>${fmt(d.total)}</strong></td>
        </tr>
    `).join('');

    // Totales
    const totalOT101 = datos.reduce((s, d) => s + d.ot101, 0);
    const totalOT102 = datos.reduce((s, d) => s + d.ot102, 0);
    const totalOT103 = datos.reduce((s, d) => s + d.ot103, 0);
    const totalGeneral = datos.reduce((s, d) => s + d.total, 0);

    tbody.innerHTML += `
        <tr style="font-weight:700; background:#f0f4f8; border-top:2px solid #b7cadd;">
            <td colspan="2">TOTAL CIF</td>
            <td style="text-align:right;">${fmt(totalOT101)}</td>
            <td style="text-align:right;">${fmt(totalOT102)}</td>
            <td style="text-align:right;">${fmt(totalOT103)}</td>
            <td style="text-align:right;">${fmt(totalGeneral)}</td>
        </tr>
    `;

    // Métricas
    document.getElementById('cifTotal').textContent = fmt(totalGeneral);
    document.getElementById('cifConceptos').textContent = datos.length;
    
    const inductoresUnicos = new Set(datos.map(d => d.inductor));
    document.getElementById('cifInductores').textContent = inductoresUnicos.size;
}