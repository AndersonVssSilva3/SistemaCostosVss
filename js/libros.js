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
        const sueldo = parseFloat(document.getElementById('planSueldo').value) || 0;
        const sistema = 'ONP';  // Por defecto
        const asig = 0;
        const bonif = 0;
        const bruto = sueldo + asig + bonif;
        const descOnp = sistema === 'ONP' ? Math.round(bruto * 0.13 * 100) / 100 : 0;
        const descAfp = sistema === 'AFP' ? Math.round(bruto * 0.13 * 100) / 100 : 0;
        const descIr = bruto > 3500 ? Math.round((bruto - 3500) * 0.14 * 100) / 100 : 0;
        const neto = bruto - descOnp - descAfp - descIr;
        const essalud = Math.round(sueldo * 0.09 * 100) / 100;
        const cts = Math.round(sueldo * 0.0833 * 100) / 100;
        
        // Generar período actual
        const hoy = new Date();
        const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
        
        await DB.insert('planillas', {
            empleado_nombre: document.getElementById('planNombre').value,
            empleado_dni: document.getElementById('planCodigo').value,  // Reutilizamos el campo código para DNI
            empleado_cargo: document.getElementById('planCargo').value,
            periodo: periodo,
            fecha_pago: new Date().toISOString().split('T')[0],
            sistema_pension: sistema,
            sueldo_basico: sueldo,
            asignacion_familiar: asig,
            bonificacion: bonif,
            total_bruto: bruto,
            descuento_onp: descOnp,
            descuento_afp: descAfp,
            descuento_ir: descIr,
            total_descuentos: descOnp + descAfp + descIr,
            total_neto: neto,
            essalud: essalud,
            cts: cts,
            costo_total_empleador: neto + essalud + cts,
            estado: 'validado'
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

        if (planillas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" style="text-align:center; color:#999;">Sin planillas registradas</td></tr>';
            return;
        }

        // Ordenar por período descendente
        const ordenadas = planillas.sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));

        tbody.innerHTML = ordenadas.map(p => {
            const sueldo = Number(p.sueldo_basico) || 0;
            const asigFam = Number(p.asignacion_familiar) || 0;
            const bonif = Number(p.bonificacion) || 0;
            const gratif = (Number(p.gratificacion_julio) || 0) + (Number(p.gratificacion_diciembre) || 0);
            const bruto = Number(p.total_bruto) || 0;
            const onp = Number(p.descuento_onp) || 0;
            const afp = Number(p.descuento_afp) || 0;
            const ir = Number(p.descuento_ir) || 0;
            const neto = Number(p.total_neto) || 0;
            const essalud = Number(p.essalud) || 0;
            const cts = Number(p.cts) || 0;
            
            return `
            <tr>
                <td>${textCell(p.periodo)}</td>
                <td>${textCell(p.empleado_nombre)}</td>
                <td>${textCell(p.empleado_dni)}</td>
                <td>${textCell(p.empleado_cargo)}</td>
                <td style="text-align:right;">${sueldo.toFixed(2)}</td>
                <td style="text-align:right;">${asigFam > 0 ? asigFam.toFixed(2) : '—'}</td>
                <td style="text-align:right;">${bonif > 0 ? bonif.toFixed(2) : '—'}</td>
                <td style="text-align:right;">${gratif > 0 ? gratif.toFixed(2) : '—'}</td>
                <td style="text-align:right;"><strong>${bruto.toFixed(2)}</strong></td>
                <td style="text-align:right;">${(onp + afp).toFixed(2)}</td>
                <td style="text-align:right;">${ir.toFixed(2)}</td>
                <td style="text-align:right; color:#087565; font-weight:700;">${neto.toFixed(2)}</td>
                <td style="text-align:right;">${essalud.toFixed(2)}</td>
                <td style="text-align:right;">${cts.toFixed(2)}</td>
            </tr>`;
        }).join('');

        console.log(`✅ Planillas renderizadas: ${ordenadas.length} registros`);
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
    const tabEl = document.getElementById(tabId);
    if (tabEl) tabEl.classList.add('active');
    
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Cargar datos específicos del tab activo
    console.log('📂 Cambiando a tab:', tabId);
    
    if (tabId === 'lib-mayor') updateCuentaSelects().then(() => generarLibroMayor());
    if (tabId === 'lib-diario') generarLibroDiario();
    if (tabId === 'lib-compras') renderCompras();
    if (tabId === 'lib-ventas') renderVentas();
    if (tabId === 'lib-inventarios') renderInventarios();
    if (tabId === 'lib-planillas') {
        console.log('👥 Cargando planillas...');
        renderPlanillas();
    }
}
async function exportarPlanillasCSV() {
    const planillas = await DB.getAll('planillas');
    let csv = '\uFEFFPeríodo;Empleado;DNI;Cargo;Sueldo Base;Asig Fam;Bonif;Gratif;Total Bruto;ONP/AFP;IR 5ta;Neto;Essalud;CTS\n';
    planillas.forEach(p => {
        csv += `"${p.periodo}";"${p.empleado_nombre}";"${p.empleado_dni}";"${p.empleado_cargo}";${p.sueldo_basico};${p.asignacion_familiar};${p.bonificacion};${p.gratificacion_julio};${p.total_bruto};${(Number(p.descuento_onp) + Number(p.descuento_afp))};${p.descuento_ir};${p.total_neto};${p.essalud};${p.cts}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planillas-plaza-vea.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Planillas exportadas', 'success');
}