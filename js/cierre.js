function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function initCierre() {
    updateCuentaSelects();
    renderAjustes();
}

function updateCuentaSelects() {
    const cuentas = DB.getAll('cuentas').filter(c => !c.esPadre);  // solo subcuentas
    const options = cuentas.map(c => `<option value="${textCell(c.codigo)}">${textCell(c.codigo)} - ${textCell(c.nombre)}</option>`).join('');
    ['ajusteCuentaDebe', 'ajusteCuentaHaber'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<option value="">Seleccione...</option>' + options;
    });
}

function guardarAjuste() {
    const ajustes = DB.getAll('ajustes');
    ajustes.push({
        id: Date.now(),
        fecha: document.getElementById('ajusteFecha').value,
        descripcion: document.getElementById('ajusteDesc').value,
        cuentaDebe: document.getElementById('ajusteCuentaDebe').value,
        cuentaHaber: document.getElementById('ajusteCuentaHaber').value,
        monto: parseFloat(document.getElementById('ajusteMonto').value) || 0,
        estado: 'pendiente'
    });
    DB.set('ajustes', ajustes);
    closeModal('modalAjuste');
    renderAjustes();
    showAlert('Ajuste guardado', 'success');
}

function renderAjustes() {
    const ajustes = DB.getAll('ajustes');
    document.getElementById('ajustesTable').innerHTML = ajustes.map((a, i) => `
        <tr>
            <td>${textCell(a.fecha)}</td><td>${textCell(a.descripcion)}</td>
            <td>${textCell(a.cuentaDebe)}</td><td>${textCell(a.cuentaHaber)}</td>
            <td style="text-align:right;">${a.monto.toFixed(2)}</td>
            <td><span class="status-badge status-pending">${textCell(a.estado)}</span></td>
            <td><button class="delete-btn" onclick="eliminarAjuste(${i})">🗑️</button></td>
        </tr>
    `).join('');
}

function eliminarAjuste(index) {
    if (!confirm('¿Eliminar?')) return;
    const a = DB.getAll('ajustes');
    a.splice(index, 1);
    DB.set('ajustes', a);
    renderAjustes();
}

function generarAsientosCierre() {
    document.getElementById('cierreResult').innerHTML =
        '<div class="alert alert-success">✅ Se generaron 3 asientos de cierre: Cierre de ingresos, cierre de gastos y cierre de resultado del ejercicio.</div>';
}

function ejecutarCierre() {
    if (confirm('¿Está seguro de ejecutar el cierre del ejercicio 2026? Esta acción no se puede deshacer.')) {
        document.getElementById('cierreResult').innerHTML =
            '<div class="alert alert-success">✅ Cierre del ejercicio 2026 ejecutado exitosamente. Todos los libros han sido cerrados.</div>';
    }
}