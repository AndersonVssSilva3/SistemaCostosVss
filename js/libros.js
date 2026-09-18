// ==================== LIBROS - TODAS LAS FUNCIONES ====================

// ==================== INIT ====================
async function initLibros() {
    console.log('📚 Iniciando módulo Libros...');
    try {
        await updateCuentaSelects();
        await renderCompras();
        await renderVentas();
        await renderInventarios();
        await renderPlanillas();
        await generarLibroDiario();
        console.log('✅ Módulo Libros listo');
    } catch (error) {
        console.error('❌ Error inicializando Libros:', error);
        showAlert('Error al cargar libros: ' + error.message, 'error');
    }
}

// ==================== SELECT DE CUENTAS ====================
async function updateCuentaSelects() {
    try {
        const todas = await DB.getAll('cuentas');
        const cuentas = todas.filter(c => !c.es_padre);  // Solo subcuentas
        const options = cuentas.map(c =>
            `<option value="${textCell(c.codigo)}">${textCell(c.codigo)} - ${textCell(c.nombre)}</option>`
        ).join('');
        const el = document.getElementById('mayorCuenta');
        if (el) el.innerHTML = '<option value="">Seleccione...</option>' + options;
        console.log(`✅ ${cuentas.length} subcuentas cargadas en el select del Mayor`);
    } catch (error) {
        console.error('Error cargando cuentas:', error);
    }
}

// ==================== LIBRO DIARIO ====================
async function generarLibroDiario() {
    try {
        const asientos = await DB.getAll('asientos');
        const desde = document.getElementById('libroDiarioDesde')?.value || '2026-01-01';
        const hasta = document.getElementById('libroDiarioHasta')?.value || '2026-12-31';
        const filtered = asientos.filter(a => a.fecha >= desde && a.fecha <= hasta);

        let html = '';
        filtered.forEach(a => {
            const lineas = a.lineas || [];
            lineas.forEach((l, i) => {
                html += `<tr>
                    ${i === 0 ? `<td rowspan="${lineas.length}">${textCell(a.fecha)}</td>
                    <td rowspan="${lineas.length}">${textCell(a.numero)}</td>` : ''}
                    <td>${textCell(l.cuenta)}</td>
                    <td>${textCell(l.nombre || '')}<br><small>${textCell(a.glosa || '')}</small></td>
                    <td style="text-align:right;">${Number(l.debe) > 0 ? Number(l.debe).toFixed(2) : ''}</td>
                    <td style="text-align:right;">${Number(l.haber) > 0 ? Number(l.haber).toFixed(2) : ''}</td>
                </tr>`;
            });
        });

        document.getElementById('libroDiarioTable').innerHTML =
            html || '<tr><td colspan="6" style="text-align:center; color:#999;">Sin registros para el rango seleccionado</td></tr>';
        console.log(`✅ Libro Diario: ${filtered.length} asientos mostrados`);
    } catch (error) {
        console.error('Error generando Libro Diario:', error);
        document.getElementById('libroDiarioTable').innerHTML =
            `<tr><td colspan="6" style="text-align:center; color:#c00;">Error: ${textCell(error.message)}</td></tr>`;
    }
}

// ==================== LIBRO MAYOR ====================
async function generarLibroMayor() {
    try {
        const cuenta = document.getElementById('mayorCuenta')?.value;
        if (!cuenta) {
            document.getElementById('libroMayorTable').innerHTML =
                '<tr><td colspan="5" style="text-align:center; color:#999;">Seleccione una cuenta</td></tr>';
            return;
        }

        const asientos = await DB.getAll('asientos');
        let saldo = 0, html = '';

        asientos
            .filter(a => a.fecha)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .forEach(a => {
                (a.lineas || []).forEach(l => {
                    if (l.cuenta === cuenta) {
                        saldo += (Number(l.debe) || 0) - (Number(l.haber) || 0);
                        html += `<tr>
                            <td>${textCell(a.fecha)}</td>
                            <td>${textCell(a.numero)} - ${textCell((a.glosa || '').substring(0, 40))}</td>
                            <td style="text-align:right;">${Number(l.debe) > 0 ? Number(l.debe).toFixed(2) : ''}</td>
                            <td style="text-align:right;">${Number(l.haber) > 0 ? Number(l.haber).toFixed(2) : ''}</td>
                            <td style="text-align:right;"><strong>${saldo.toFixed(2)}</strong></td>
                        </tr>`;
                    }
                });
            });

        document.getElementById('libroMayorTable').innerHTML =
            html || '<tr><td colspan="5" style="text-align:center; color:#999;">Sin movimientos para esta cuenta</td></tr>';
        console.log(`✅ Libro Mayor de cuenta ${cuenta}`);
    } catch (error) {
        console.error('Error generando Libro Mayor:', error);
    }
}

// ==================== COMPRAS ====================
async function guardarCompra() {
    try {
        await DB.insert('compras', {
            fecha: document.getElementById('compraFecha').value,
            proveedor: document.getElementById('compraProveedor').value,
            ruc: document.getElementById('compraRuc').value,
            tipo: document.getElementById('compraTipo').value,
            numero: document.getElementById('compraNumero').value,
            base: parseFloat(document.getElementById('compraBase').value) || 0,
            igv: parseFloat(document.getElementById('compraIgv').value) || 0,
            total: parseFloat(document.getElementById('compraTotal').value) || 0
        });
        closeModal('modalCompra');
        await renderCompras();
        showAlert('Compra registrada', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderCompras() {
    try {
        const compras = await DB.getAll('compras');
        const tbody = document.getElementById('comprasTable');
        if (!tbody) return;

        tbody.innerHTML = compras.map(c => `
            <tr>
                <td>${textCell(c.fecha)}</td>
                <td>${textCell(c.proveedor)}</td>
                <td>${textCell(c.ruc)}</td>
                <td>${textCell(c.tipo)}</td>
                <td>${textCell(c.numero)}</td>
                <td style="text-align:right;">${Number(c.base).toFixed(2)}</td>
                <td style="text-align:right;">${Number(c.igv).toFixed(2)}</td>
                <td style="text-align:right;"><strong>${Number(c.total).toFixed(2)}</strong></td>
                <td><button class="delete-btn" onclick="eliminarCompra(${c.id})">🗑️</button></td>
            </tr>
        `).join('') || '<tr><td colspan="9" style="text-align:center; color:#999;">Sin compras registradas</td></tr>';
    } catch (error) {
        console.error('Error renderizando compras:', error);
    }
}

async function eliminarCompra(id) {
    if (!confirm('¿Eliminar esta compra?')) return;
    try {
        await DB.delete('compras', id);
        await renderCompras();
        showAlert('Compra eliminada', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== VENTAS ====================
async function guardarVenta() {
    try {
        await DB.insert('ventas', {
            fecha: document.getElementById('ventaFecha').value,
            cliente: document.getElementById('ventaCliente').value,
            ruc: document.getElementById('ventaRuc').value,
            tipo: document.getElementById('ventaTipo').value,
            numero: document.getElementById('ventaNumero').value,
            base: parseFloat(document.getElementById('ventaBase').value) || 0,
            igv: parseFloat(document.getElementById('ventaIgv').value) || 0,
            total: parseFloat(document.getElementById('ventaTotal').value) || 0
        });
        closeModal('modalVenta');
        await renderVentas();
        showAlert('Venta registrada', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderVentas() {
    try {
        const ventas = await DB.getAll('ventas');
        const tbody = document.getElementById('ventasTable');
        if (!tbody) return;

        tbody.innerHTML = ventas.map(v => `
            <tr>
                <td>${textCell(v.fecha)}</td>
                <td>${textCell(v.cliente)}</td>
                <td>${textCell(v.ruc)}</td>
                <td>${textCell(v.tipo)}</td>
                <td>${textCell(v.numero)}</td>
                <td style="text-align:right;">${Number(v.base).toFixed(2)}</td>
                <td style="text-align:right;">${Number(v.igv).toFixed(2)}</td>
                <td style="text-align:right;"><strong>${Number(v.total).toFixed(2)}</strong></td>
                <td><button class="delete-btn" onclick="eliminarVenta(${v.id})">🗑️</button></td>
            </tr>
        `).join('') || '<tr><td colspan="9" style="text-align:center; color:#999;">Sin ventas registradas</td></tr>';
    } catch (error) {
        console.error('Error renderizando ventas:', error);
    }
}

async function eliminarVenta(id) {
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
        await DB.delete('ventas', id);
        await renderVentas();
        showAlert('Venta eliminada', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== INVENTARIOS ====================
async function renderInventarios() {
    try {
        const mercs = await DB.getAll('mercaderias');
        const tbody = document.getElementById('inventariosTable');
        if (!tbody) return;

        tbody.innerHTML = mercs.map(m => `
            <tr>
                <td>${textCell(m.codigo)}</td>
                <td>${textCell(m.descripcion)}</td>
                <td>${textCell(m.unidad)}</td>
                <td>${m.stock}</td>
                <td style="text-align:right;">${Number(m.costo).toFixed(2)}</td>
                <td style="text-align:right;"><strong>${(Number(m.stock) * Number(m.costo)).toFixed(2)}</strong></td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center; color:#999;">Sin mercaderías registradas</td></tr>';
    } catch (error) {
        console.error('Error renderizando inventarios:', error);
    }
}

// ==================== PLANILLAS ====================
async function guardarPlanilla() {
    try {
        await DB.insert('planillas', {
            codigo: document.getElementById('planCodigo').value,
            nombre: document.getElementById('planNombre').value,
            cargo: document.getElementById('planCargo').value,
            sueldo: parseFloat(document.getElementById('planSueldo').value) || 0
        });
        closeModal('modalPlanilla');
        await renderPlanillas();
        showAlert('Trabajador agregado', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderPlanillas() {
    try {
        const planillas = await DB.getAll('planillas');
        const tbody = document.getElementById('planillasTable');
        if (!tbody) return;

        tbody.innerHTML = planillas.map(p => {
            const sueldo = Number(p.sueldo);
            const afp = sueldo * 0.13;
            const essalud = sueldo * 0.09;
            const impuesto = sueldo > 3500 ? (sueldo - 3500) * 0.08 : 0;
            const neto = sueldo - afp - impuesto;
            return `
            <tr>
                <td>${textCell(p.codigo)}</td>
                <td>${textCell(p.nombre)}</td>
                <td>${textCell(p.cargo)}</td>
                <td style="text-align:right;">${sueldo.toFixed(2)}</td>
                <td style="text-align:right;">${afp.toFixed(2)}</td>
                <td style="text-align:right;">${essalud.toFixed(2)}</td>
                <td style="text-align:right;">${impuesto.toFixed(2)}</td>
                <td style="text-align:right;"><strong>${neto.toFixed(2)}</strong></td>
                <td><button class="delete-btn" onclick="eliminarPlanilla(${p.id})">🗑️</button></td>
            </tr>`;
        }).join('') || '<tr><td colspan="9" style="text-align:center; color:#999;">Sin trabajadores registrados</td></tr>';
    } catch (error) {
        console.error('Error renderizando planillas:', error);
    }
}

async function eliminarPlanilla(id) {
    if (!confirm('¿Eliminar?')) return;
    try {
        await DB.delete('planillas', id);
        await renderPlanillas();
        showAlert('Trabajador eliminado', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== UTILIDADES ====================
function calcCompraIGV() {
    const base = parseFloat(document.getElementById('compraBase').value) || 0;
    const igv = base * 0.18;
    document.getElementById('compraIgv').value = igv.toFixed(2);
    document.getElementById('compraTotal').value = (base + igv).toFixed(2);
}

function calcVentaIGV() {
    const base = parseFloat(document.getElementById('ventaBase').value) || 0;
    const igv = base * 0.18;
    document.getElementById('ventaIgv').value = igv.toFixed(2);
    document.getElementById('ventaTotal').value = (base + igv).toFixed(2);
}

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Cargar datos específicos del tab activo
    if (tabId === 'lib-mayor') updateCuentaSelects().then(() => generarLibroMayor());
    if (tabId === 'lib-diario') generarLibroDiario();
    if (tabId === 'lib-compras') renderCompras();
    if (tabId === 'lib-ventas') renderVentas();
    if (tabId === 'lib-inventarios') renderInventarios();
    if (tabId === 'lib-planillas') renderPlanillas();
}