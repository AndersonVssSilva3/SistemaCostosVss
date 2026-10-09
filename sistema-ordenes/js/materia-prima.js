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

// ═══════════════════════════════════════════════
// CATÁLOGO DE MP
// ═══════════════════════════════════════════════

async function renderMP() {
    const mp = await DB.getAll('materiaPrima');
    const tbody = document.getElementById('mpTable');
    if (!tbody) return;

    if (mp.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin materia prima. Agregue una con el botón ➕.</td></tr>';
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
            <td style="text-align:center;">
                <div class="action-btns">
                    <button class="view-btn" onclick="editarMP(${m.id})" title="Editar">✏️</button>
                    <button class="delete-btn" onclick="eliminarMP(${m.id})" title="Eliminar">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openModalMP() {
    document.getElementById('modalMPTitulo').textContent = 'Nueva Materia Prima';
    document.getElementById('mpId').value = '';
    document.getElementById('mpCodigo').value = '';
    document.getElementById('mpDescripcion').value = '';
    document.getElementById('mpUnidad').value = 'UND';
    document.getElementById('mpStock').value = '0';
    document.getElementById('mpCostoUnit').value = '0';
    document.getElementById('mpValorTotal').value = 'S/ 0.00';
    document.getElementById('mpCodigo').readOnly = false;
    openModal('modalMP');
}

async function editarMP(id) {
    const mp = await DB.get('materiaPrima', id);
    if (!mp) return;

    document.getElementById('modalMPTitulo').textContent = 'Editar Materia Prima';
    document.getElementById('mpId').value = mp.id;
    document.getElementById('mpCodigo').value = mp.codigo;
    document.getElementById('mpDescripcion').value = mp.descripcion || '';
    document.getElementById('mpUnidad').value = mp.unidad || 'UND';
    document.getElementById('mpStock').value = mp.stock || 0;
    document.getElementById('mpCostoUnit').value = mp.costo_unitario || 0;
    document.getElementById('mpValorTotal').value = fmt(Number(mp.stock) * Number(mp.costo_unitario));
    document.getElementById('mpCodigo').readOnly = false;
    openModal('modalMP');
}

async function guardarMP() {
    const id = document.getElementById('mpId').value;
    const codigo = document.getElementById('mpCodigo').value.trim().toUpperCase();
    const descripcion = document.getElementById('mpDescripcion').value.trim();
    const unidad = document.getElementById('mpUnidad').value;
    const stock = parseFloat(document.getElementById('mpStock').value) || 0;
    const costo_unitario = parseFloat(document.getElementById('mpCostoUnit').value) || 0;

    if (!codigo) { showAlert('El código es obligatorio', 'error'); return; }
    if (!descripcion) { showAlert('La descripción es obligatoria', 'error'); return; }
    if (stock < 0) { showAlert('El stock no puede ser negativo', 'error'); return; }
    if (costo_unitario < 0) { showAlert('El costo unitario no puede ser negativo', 'error'); return; }

    const todas = await DB.getAll('materiaPrima');
    const existe = todas.find(m => m.codigo === codigo && String(m.id) !== String(id));
    if (existe) {
        showAlert('Ya existe una MP con el código ' + codigo, 'error');
        return;
    }

    try {
        const datos = { codigo, descripcion, unidad, stock, costo_unitario };

        if (id) {
            await DB.update('materiaPrima', id, datos);
            showAlert('✅ Materia prima actualizada', 'success');
        } else {
            await DB.insert('materiaPrima', datos);
            showAlert('✅ Materia prima creada', 'success');
        }

        closeModal('modalMP');
        await renderMP();
    } catch (error) {
        console.error('Error guardando MP:', error);
        showAlert('Error al guardar: ' + error.message, 'error');
    }
}

async function eliminarMP(id) {
    const mp = await DB.get('materiaPrima', id);
    if (!mp) return;

    const asignaciones = await DB.getAll('otMateriaPrima');
    const usada = asignaciones.filter(a => a.materia_prima_codigo === mp.codigo);

    let msg = `¿Eliminar la MP "${mp.codigo} - ${mp.descripcion}"?`;
    if (usada.length > 0) {
        msg += `\n\n⚠️ Tiene ${usada.length} asignación(es) a OTs. También se eliminarán.`;
    }
    if (!confirm(msg)) return;

    try {
        for (const a of usada) {
            await DB.delete('otMateriaPrima', a.id);
        }

        await DB.delete('materiaPrima', id);
        showAlert('✅ Materia prima eliminada', 'success');
        await renderMP();
        await renderAsignacionesMP();
    } catch (error) {
        console.error('Error eliminando MP:', error);
        showAlert('Error al eliminar: ' + error.message, 'error');
    }
}

// Recalcular valor total cuando cambian stock o costo
document.addEventListener('DOMContentLoaded', () => {
    const stockInput = document.getElementById('mpStock');
    const costoInput = document.getElementById('mpCostoUnit');
    const totalInput = document.getElementById('mpValorTotal');

    const recalc = () => {
        const s = parseFloat(stockInput.value) || 0;
        const c = parseFloat(costoInput.value) || 0;
        totalInput.value = fmt(s * c);
    };

    if (stockInput) stockInput.addEventListener('input', recalc);
    if (costoInput) costoInput.addEventListener('input', recalc);
});

// ═══════════════════════════════════════════════
// ASIGNACIONES MP → OT
// ═══════════════════════════════════════════════

async function renderAsignacionesMP() {
    const [mp, ordenes, asignaciones] = await Promise.all([
        DB.getAll('materiaPrima'),
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otMateriaPrima')
    ]);

    const tbody = document.getElementById('mpAsignacionesTable');
    if (!tbody) return;

    if (asignaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin asignaciones. Agregue una con el botón ➕.</td></tr>';
        return;
    }

    const otMap = {};
    ordenes.forEach(o => otMap[o.id] = o.numero_ot);

    const mpMap = {};
    mp.forEach(m => mpMap[m.codigo] = m.descripcion);

    tbody.innerHTML = asignaciones.map(a => `
        <tr>
            <td><strong>${textCell(otMap[a.ot_id] || '—')}</strong></td>
            <td>${textCell(a.materia_prima_codigo)}</td>
            <td>${textCell(mpMap[a.materia_prima_codigo] || '—')}</td>
            <td style="text-align:right;">${Number(a.cantidad).toLocaleString('es-PE')}</td>
            <td style="text-align:right;">${fmt(a.costo_unitario)}</td>
            <td style="text-align:right;"><strong>${fmt(a.costo_total)}</strong></td>
            <td style="text-align:center;">
                <button class="delete-btn" onclick="eliminarAsignacion(${a.id})" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function openModalAsignacion() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    const selectOT = document.getElementById('asigOT');
    selectOT.innerHTML = '<option value="">-- Seleccionar OT --</option>' +
        ordenes.map(o => `<option value="${o.id}">${textCell(o.numero_ot)} - ${textCell(o.descripcion || '')}</option>`).join('');

    const mp = await DB.getAll('materiaPrima');
    const selectMP = document.getElementById('asigMP');
    selectMP.innerHTML = '<option value="">-- Seleccionar MP --</option>' +
        mp.map(m => `<option value="${textCell(m.codigo)}">${textCell(m.codigo)} - ${textCell(m.descripcion)}</option>`).join('');

    document.getElementById('asigCantidad').value = '';
    document.getElementById('asigCostoUnit').value = '';
    document.getElementById('asigCostoTotal').value = '';
    document.getElementById('asigInfoMP').textContent = '';

    openModal('modalAsignacion');
}

async function onMPChange() {
    const codigo = document.getElementById('asigMP').value;
    if (!codigo) {
        document.getElementById('asigInfoMP').textContent = '';
        document.getElementById('asigCostoUnit').value = '';
        return;
    }

    const mp = await DB.getAll('materiaPrima');
    const m = mp.find(x => x.codigo === codigo);
    if (m) {
        document.getElementById('asigInfoMP').textContent =
            `Stock disponible: ${Number(m.stock).toLocaleString('es-PE')} ${m.unidad}`;
        document.getElementById('asigCostoUnit').value = m.costo_unitario || 0;
        calcCostoAsignacion();
    }
}

function calcCostoAsignacion() {
    const cant = parseFloat(document.getElementById('asigCantidad').value) || 0;
    const cu = parseFloat(document.getElementById('asigCostoUnit').value) || 0;
    document.getElementById('asigCostoTotal').value = (cant * cu).toFixed(2);
}

async function guardarAsignacion() {
    const ot_id = document.getElementById('asigOT').value;
    const materia_prima_codigo = document.getElementById('asigMP').value;
    const cantidad = parseFloat(document.getElementById('asigCantidad').value) || 0;
    const costo_unitario = parseFloat(document.getElementById('asigCostoUnit').value) || 0;
    const costo_total = cantidad * costo_unitario;

    if (!ot_id) { showAlert('Seleccione una OT', 'error'); return; }
    if (!materia_prima_codigo) { showAlert('Seleccione una MP', 'error'); return; }
    if (cantidad <= 0) { showAlert('La cantidad debe ser mayor a 0', 'error'); return; }

    const mp = await DB.getAll('materiaPrima');
    const m = mp.find(x => x.codigo === materia_prima_codigo);
    if (!m) { showAlert('MP no encontrada', 'error'); return; }

    if (Number(m.stock) < cantidad) {
        if (!confirm(`⚠️ Stock insuficiente (${m.stock} ${m.unidad}). ¿Continuar de todos modos?`)) return;
    }

    try {
        // Intenta insertar SIN costo_total (por si es columna GENERATED en Supabase)
        try {
            await DB.insert('otMateriaPrima', {
                ot_id: Number(ot_id),
                materia_prima_codigo,
                cantidad,
                costo_unitario
            });
        } catch (e) {
            // Si falla, intenta CON costo_total (por si es columna normal)
            if (e.message && e.message.toLowerCase().includes('generated')) {
                await DB.insert('otMateriaPrima', {
                    ot_id: Number(ot_id),
                    materia_prima_codigo,
                    cantidad,
                    costo_unitario,
                    costo_total
                });
            } else {
                throw e;
            }
        }

        // Actualizar stock de la MP
        const nuevoStock = Number(m.stock) - cantidad;
        await DB.update('materiaPrima', m.id, { stock: nuevoStock });

        showAlert('✅ Asignación guardada', 'success');
        closeModal('modalAsignacion');
        await renderMP();
        await renderAsignacionesMP();
    } catch (error) {
        console.error('Error guardando asignación:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function eliminarAsignacion(id) {
    const asig = await DB.get('otMateriaPrima', id);
    if (!asig) return;

    if (!confirm(`¿Eliminar esta asignación?\n\nSe devolverá el stock de ${asig.materia_prima_codigo}.`)) return;

    try {
        const mp = await DB.getAll('materiaPrima');
        const m = mp.find(x => x.codigo === asig.materia_prima_codigo);
        if (m) {
            const nuevoStock = Number(m.stock) + Number(asig.cantidad);
            await DB.update('materiaPrima', m.id, { stock: nuevoStock });
        }

        await DB.delete('otMateriaPrima', id);
        showAlert('✅ Asignación eliminada', 'success');
        await renderMP();
        await renderAsignacionesMP();
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar: ' + error.message, 'error');
    }
}

// ═══════════════════════════════════════════════
// EXPORTAR CSV
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
// EXPONER FUNCIONES AL SCOPE GLOBAL
// (necesario porque los onclick del HTML buscan
//  funciones en window, y algunos navegadores no
//  las exponen automáticamente si el archivo se
//  carga con defer o en ciertos contextos)
// ═══════════════════════════════════════════════
window.openModalMP          = openModalMP;
window.editarMP             = editarMP;
window.guardarMP            = guardarMP;
window.eliminarMP           = eliminarMP;
window.openModalAsignacion  = openModalAsignacion;
window.onMPChange           = onMPChange;
window.calcCostoAsignacion  = calcCostoAsignacion;
window.guardarAsignacion    = guardarAsignacion;
window.eliminarAsignacion   = eliminarAsignacion;
window.exportarMPCSV        = exportarMPCSV;
window.initMateriaPrima     = initMateriaPrima;

console.log('✅ materia-prima.js cargado y funciones expuestas');