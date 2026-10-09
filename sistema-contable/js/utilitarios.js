// ==================== UTILITARIOS - BACKUP, ESTADÍSTICAS, MANUAL ====================

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// ==================== BACKUP ====================
async function exportarBackup() {
    try {
        showAlert('Generando respaldo...', 'info');
        
        const data = {};
        const keys = ['cuentas', 'planJerarquico', 'asientos', 'compras', 'ventas', 'productos',
                      'mercaderias', 'activoFijo', 'centrosCosto', 'inductores', 'repuestos',
                      'ajustes', 'planillas'];
        
        for (const k of keys) {
            data[k] = await DB.getAll(k);
        }
        
        data._meta = {
            exported_at: new Date().toISOString(),
            version: '2.0-supabase',
            total_records: keys.reduce((s, k) => s + data[k].length, 0)
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'omega_sac_backup_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        
        document.getElementById('backupInfo').innerHTML = `
            <div class="alert alert-success">
                ✅ Respaldo generado: ${data._meta.total_records} registros.
            </div>
        `;
        showAlert('Backup exportado exitosamente', 'success');
    } catch (error) {
        showAlert('Error al exportar: ' + error.message, 'error');
    }
}

async function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!confirm('Esto reemplazará los datos actuales. ¿Continuar?')) return;
            
            // Eliminar datos existentes (excepto cuentas y planJerarquico que son catálogo base)
            const keysToReplace = ['asientos', 'compras', 'ventas', 'productos', 'mercaderias',
                                    'activoFijo', 'centrosCosto', 'inductores', 'repuestos',
                                    'ajustes', 'planillas'];
            
            for (const k of keysToReplace) {
                if (Array.isArray(data[k]) && data[k].length > 0) {
                    await DB.deleteAll(k);
                    // Eliminar el campo id para que Supabase lo regenere
                    const clean = data[k].map(({ id, created_at, ...rest }) => rest);
                    await DB.bulkInsert(k, clean);
                }
            }
            
            showAlert(`Backup importado: ${keysToReplace.length} tablas procesadas`, 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            showAlert('Error al importar: ' + err.message, 'error');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

async function limpiarTodo() {
    if (!confirm('¿Está seguro de eliminar TODOS los datos?')) return;
    if (!confirm('CONFIRMACIÓN FINAL: Se borrarán todos los datos del sistema.')) return;
    
    try {
        const keys = ['asientos', 'compras', 'ventas', 'productos', 'mercaderias',
                      'activoFijo', 'centrosCosto', 'inductores', 'repuestos',
                      'ajustes', 'planillas'];
        
        for (const k of keys) {
            await DB.deleteAll(k);
        }
        
        showAlert('Todos los datos han sido eliminados', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== ESTADÍSTICAS ====================
async function generarEstadisticas() {
    try {
        const asientos = await DB.getAll('asientos');
        const ventas = await DB.getAll('ventas');
        const compras = await DB.getAll('compras');
        const cuentas = await DB.getAll('cuentas');
        const centros = await DB.getAll('centrosCosto');
        
        document.getElementById('statAsientos').textContent = asientos.length;
        document.getElementById('statVentas').textContent = 'S/ ' + 
            ventas.reduce((s, v) => s + Number(v.total || 0), 0).toFixed(2);
        document.getElementById('statCompras').textContent = 'S/ ' + 
            compras.reduce((s, c) => s + Number(c.total || 0), 0).toFixed(2);
        document.getElementById('statCuentas').textContent = cuentas.length;
        
        const maxVal = Math.max(...centros.map(c => Number(c.gastado || 0)), 1);
        const chart = document.getElementById('statsChart');
        if (chart) {
            chart.innerHTML = centros.map(c => {
                const gastado = Number(c.gastado || 0);
                const height = (gastado / maxVal) * 150;
                return `<div class="chart-bar" style="height:${height}px;">
                    <span class="value-label">${gastado.toFixed(0)}</span>
                    <span class="label">${textCell(c.nombre)}</span>
                </div>`;
            }).join('');
        }
    } catch (error) {
        console.error('Error generando estadísticas:', error);
        showAlert('Error al generar estadísticas: ' + error.message, 'error');
    }
}