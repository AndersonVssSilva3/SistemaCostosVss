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

    if (!cif || cif.length === 0) {
        document.getElementById('cifTableHead').innerHTML = '';
        document.getElementById('cifTableBody').innerHTML = 
            '<tr><td style="text-align:center; color:#999; padding:40px;">Sin datos de CIF</td></tr>';
        return;
    }

    // Aplicar filtro de rango
    const rango = document.getElementById('cifRango')?.value || 'todas';
    let ordenesFiltradas = [...ordenes].sort((a, b) => 
        (a.numero_ot || '').localeCompare(b.numero_ot || '')
    );
    
    if (rango !== 'todas') {
        ordenesFiltradas = ordenesFiltradas.slice(-parseInt(rango));
    }

    // ==================== HEADER DINÁMICO ====================
    const thead = document.getElementById('cifTableHead');
    thead.innerHTML = `
        <tr>
            <th class="cif-sticky-left cif-col-concepto">Concepto</th>
            <th class="cif-sticky-left-2 cif-col-inductor">Inductor</th>
            ${ordenesFiltradas.map(o => 
                `<th class="cif-col-ot" data-ot="${textCell(o.numero_ot)}">${textCell(o.numero_ot)}</th>`
            ).join('')}
            <th class="cif-sticky-right cif-col-total">TOTAL</th>
        </tr>
    `;

    // ==================== AGRUPAR POR CONCEPTO ====================
    const porConcepto = {};
    cif.forEach(c => {
        const key = c.concepto;
        if (!porConcepto[key]) {
            porConcepto[key] = {
                concepto: c.concepto,
                inductor: c.inductor,
                total: 0,
                porOT: {}
            };
        }
        const monto = Number(c.monto || 0);
        porConcepto[key].total += monto;
        
        if (!porConcepto[key].porOT[c.ot_id]) {
            porConcepto[key].porOT[c.ot_id] = 0;
        }
        porConcepto[key].porOT[c.ot_id] += monto;
    });

    const datos = Object.values(porConcepto).sort((a, b) => b.total - a.total);

    // ==================== GENERAR FILAS ====================
    const tbody = document.getElementById('cifTableBody');
    tbody.innerHTML = datos.map((d, index) => `
        <tr class="cif-row ${index % 2 === 0 ? 'cif-row-even' : 'cif-row-odd'}">
            <td class="cif-sticky-left cif-col-concepto"><strong>${textCell(d.concepto)}</strong></td>
            <td class="cif-sticky-left-2 cif-col-inductor">${textCell(d.inductor || '')}</td>
            ${ordenesFiltradas.map(o => 
                `<td class="cif-col-ot" style="text-align:right;">${fmt(d.porOT[o.id] || 0)}</td>`
            ).join('')}
            <td class="cif-sticky-right cif-col-total" style="text-align:right;">
                <strong>${fmt(d.total)}</strong>
            </td>
        </tr>
    `).join('');

    // ==================== FILA DE TOTALES ====================
    const totalPorOT = {};
    ordenesFiltradas.forEach(o => {
        totalPorOT[o.id] = datos.reduce((s, d) => s + (d.porOT[o.id] || 0), 0);
    });
    const totalGeneral = datos.reduce((s, d) => s + d.total, 0);

    tbody.innerHTML += `
        <tr class="cif-row-total">
            <td class="cif-sticky-left cif-col-concepto">TOTAL CIF</td>
            <td class="cif-sticky-left-2 cif-col-inductor"></td>
            ${ordenesFiltradas.map(o => 
                `<td class="cif-col-ot" style="text-align:right;">${fmt(totalPorOT[o.id])}</td>`
            ).join('')}
            <td class="cif-sticky-right cif-col-total" style="text-align:right;">
                ${fmt(totalGeneral)}
            </td>
        </tr>
    `;

    // ==================== MÉTRICAS ====================
    document.getElementById('cifTotal').textContent = fmt(totalGeneral);
    document.getElementById('cifConceptos').textContent = datos.length;
    const inductoresUnicos = new Set(datos.map(d => d.inductor));
    document.getElementById('cifInductores').textContent = inductoresUnicos.size;

    // ==================== INFO FOOTER ====================
    document.getElementById('cifInfo').innerHTML = `Mostrando <strong>${datos.length}</strong> conceptos`;
    document.getElementById('cifOTInfo').innerHTML = `de <strong>${ordenesFiltradas.length}</strong> OT`;

    console.log(`✅ CIF renderizado: ${datos.length} conceptos × ${ordenesFiltradas.length} OT`);
}

// ==================== FILTRO POR BÚSQUEDA ====================
function filtrarCIF() {
    const buscar = (document.getElementById('cifBuscar')?.value || '').toLowerCase().trim();
    
    if (!buscar) {
        document.querySelectorAll('.cif-row').forEach(row => {
            row.style.display = '';
        });
        return;
    }

    document.querySelectorAll('.cif-row').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(buscar) ? '' : 'none';
    });
}

// ==================== EXPORTAR CSV ====================
async function exportarCIFCSV() {
    const [cif, ordenes] = await Promise.all([
        DB.getAll('otCif'),
        DB.getAll('ordenesTrabajo')
    ]);

    const rango = document.getElementById('cifRango')?.value || 'todas';
    let ordenesFiltradas = [...ordenes].sort((a, b) => 
        (a.numero_ot || '').localeCompare(b.numero_ot || '')
    );
    
    if (rango !== 'todas') {
        ordenesFiltradas = ordenesFiltradas.slice(-parseInt(rango));
    }

    // Agrupar
    const porConcepto = {};
    cif.forEach(c => {
        const key = c.concepto;
        if (!porConcepto[key]) {
            porConcepto[key] = { concepto: c.concepto, inductor: c.inductor, total: 0, porOT: {} };
        }
        porConcepto[key].total += Number(c.monto || 0);
        if (!porConcepto[key].porOT[c.ot_id]) porConcepto[key].porOT[c.ot_id] = 0;
        porConcepto[key].porOT[c.ot_id] += Number(c.monto || 0);
    });

    const datos = Object.values(porConcepto).sort((a, b) => b.total - a.total);

    // CSV
    let csv = '\uFEFFConcepto;Inductor;';
    csv += ordenesFiltradas.map(o => o.numero_ot).join(';');
    csv += ';TOTAL\n';

    datos.forEach(d => {
        csv += `"${d.concepto}";"${d.inductor || ''}";`;
        csv += ordenesFiltradas.map(o => d.porOT[o.id] || 0).join(';');
        csv += `;${d.total}\n`;
    });

    // Fila total
    csv += '"TOTAL CIF";"";';
    ordenesFiltradas.forEach(o => {
        csv += datos.reduce((s, d) => s + (d.porOT[o.id] || 0), 0) + ';';
    });
    csv += `;${datos.reduce((s, d) => s + d.total, 0)}\n`;

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cif-por-ot-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}