function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function exportarBackup() {
    const data = {};
    const keys = ['cuentas', 'asientos', 'compras', 'ventas', 'productos', 'mercaderias',
                  'activoFijo', 'centrosCosto', 'inductores', 'repuestos', 'ajustes', 'planillas'];
    keys.forEach(k => { data[k] = DB.getAll(k); });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omega_sac_backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('Backup exportado exitosamente', 'success');
}

function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            Object.entries(data).forEach(([key, value]) => DB.set(key, value));
            showAlert('Backup importado exitosamente. Recargue la página.', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            showAlert('Error al importar: archivo inválido', 'error');
        }
    };
    reader.readAsText(file);
}

function limpiarTodo() {
    if (confirm('¿Está seguro de eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
        if (confirm('CONFIRMACIÓN FINAL: Se borrarán todos los datos del sistema.')) {
            const keys = ['cuentas', 'asientos', 'compras', 'ventas', 'productos', 'mercaderias',
                          'activoFijo', 'centrosCosto', 'inductores', 'repuestos', 'ajustes', 'planillas'];
            keys.forEach(k => localStorage.removeItem('omega_' + k));
            showAlert('Todos los datos han sido eliminados', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    }
}

function generarEstadisticas() {
    const asientos = DB.getAll('asientos');
    const ventas = DB.getAll('ventas');
    const compras = DB.getAll('compras');
    const cuentas = DB.getAll('cuentas');

    document.getElementById('statAsientos').textContent = asientos.length;
    document.getElementById('statVentas').textContent = 'S/ ' + ventas.reduce((s, v) => s + v.total, 0).toFixed(2);
    document.getElementById('statCompras').textContent = 'S/ ' + compras.reduce((s, c) => s + c.total, 0).toFixed(2);
    document.getElementById('statCuentas').textContent = cuentas.length;

    const centros = DB.getAll('centrosCosto');
    const maxVal = Math.max(...centros.map(c => c.gastado), 1);
    document.getElementById('statsChart').innerHTML = centros.map(c => {
        const height = (c.gastado / maxVal) * 150;
        return `<div class="chart-bar" style="height:${height}px;">
            <span class="value-label">${c.gastado.toFixed(0)}</span>
            <span class="label">${textCell(c.nombre)}</span>
        </div>`;
    }).join('');
}