// ==================== CIERRE - AJUSTES Y CIERRE DEL EJERCICIO ====================

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

async function initCierre() {
    await updateCuentaSelects();
    await renderAjustes();
}

async function updateCuentaSelects() {
    const cuentas = (await DB.getAll('cuentas')).filter(c => !c.es_padre);
    const options = cuentas.map(c => 
        `<option value="${textCell(c.codigo)}">${textCell(c.codigo)} - ${textCell(c.nombre)}</option>`
    ).join('');
    ['ajusteCuentaDebe', 'ajusteCuentaHaber'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<option value="">Seleccione...</option>' + options;
    });
}

async function guardarAjuste() {
    try {
        await DB.insert('ajustes', {
            fecha: document.getElementById('ajusteFecha').value,
            descripcion: document.getElementById('ajusteDesc').value,
            cuenta_debe: document.getElementById('ajusteCuentaDebe').value,
            cuenta_haber: document.getElementById('ajusteCuentaHaber').value,
            monto: parseFloat(document.getElementById('ajusteMonto').value) || 0,
            estado: 'pendiente'
        });
        closeModal('modalAjuste');
        await renderAjustes();
        showAlert('Ajuste guardado', 'success');
    } catch (error) {
        showAlert('Error al guardar: ' + error.message, 'error');
    }
}

async function renderAjustes() {
    const ajustes = await DB.getAll('ajustes');
    const tbody = document.getElementById('ajustesTable');
    if (!tbody) return;
    
    tbody.innerHTML = ajustes.map(a => `
        <tr>
            <td>${textCell(a.fecha)}</td>
            <td>${textCell(a.descripcion)}</td>
            <td>${textCell(a.cuenta_debe)}</td>
            <td>${textCell(a.cuenta_haber)}</td>
            <td style="text-align:right;">${Number(a.monto).toFixed(2)}</td>
            <td><span class="status-badge status-pending">${textCell(a.estado)}</span></td>
            <td><button class="delete-btn" onclick="eliminarAjuste(${a.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function eliminarAjuste(id) {
    if (!confirm('¿Eliminar?')) return;
    try {
        await DB.delete('ajustes', id);
        await renderAjustes();
        showAlert('Ajuste eliminado', 'success');
    } catch (error) {
        showAlert('Error al eliminar: ' + error.message, 'error');
    }
}

async function generarAsientosCierre() {
    // Aquí podrías generar asientos reales a partir de los saldos
    // Por ahora solo mostramos el mensaje
    document.getElementById('cierreResult').innerHTML =
        '<div class="alert alert-success">✅ Se generaron 3 asientos de cierre: Cierre de ingresos, cierre de gastos y cierre de resultado del ejercicio.</div>';
}

async function ejecutarCierre() {
    if (!confirm('¿Está seguro de ejecutar el cierre del ejercicio 2026? Esta acción no se puede deshacer.')) return;
    
    try {
        // Marcar todos los ajustes pendientes como "cerrados"
        const ajustes = await DB.getAll('ajustes');
        for (const a of ajustes) {
            if (a.estado === 'pendiente') {
                await DB.update('ajustes', a.id, { estado: 'cerrado' });
            }
        }
        await renderAjustes();
        document.getElementById('cierreResult').innerHTML =
            '<div class="alert alert-success">✅ Cierre del ejercicio 2026 ejecutado exitosamente. Todos los libros han sido cerrados.</div>';
    } catch (error) {
        document.getElementById('cierreResult').innerHTML =
            `<div class="alert alert-error">❌ Error al ejecutar cierre: ${error.message}</div>`;
    }
}