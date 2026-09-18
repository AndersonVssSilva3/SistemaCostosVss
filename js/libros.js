async function initLibros() {
    await updateCuentaSelects();
    await renderCompras();
    await renderVentas();
    await renderInventarios();
    await renderPlanillas();
    await generarLibroDiario();
}

async function updateCuentaSelects() {
    const cuentas = (await DB.getAll('cuentas')).filter(c => !c.es_padre);
    const options = cuentas.map(c => `<option value="${textCell(c.codigo)}">${textCell(c.codigo)} - ${textCell(c.nombre)}</option>`).join('');
    const el = document.getElementById('mayorCuenta');
    if (el) el.innerHTML = '<option value="">Seleccione...</option>' + options;
}

async function generarLibroDiario() {
    const asientos = await DB.getAll('asientos');
    const desde = document.getElementById('libroDiarioDesde').value;
    const hasta = document.getElementById('libroDiarioHasta').value;
    const filtered = asientos.filter(a => a.fecha >= desde && a.fecha <= hasta);
    let html = '';
    filtered.forEach(a => {
        a.lineas.forEach((l, i) => {
            html += `<tr>
                ${i === 0 ? `<td rowspan="${a.lineas.length}">${textCell(a.fecha)}</td>
                <td rowspan="${a.lineas.length}">${textCell(a.numero)}</td>` : ''}
                <td>${textCell(l.cuenta)}</td>
                <td>${textCell(l.nombre)}</td>
                <td style="text-align:right;">${l.debe > 0 ? l.debe.toFixed(2) : ''}</td>
                <td style="text-align:right;">${l.haber > 0 ? l.haber.toFixed(2) : ''}</td>
            </tr>`;
        });
    });
    document.getElementById('libroDiarioTable').innerHTML =
        html || '<tr><td colspan="6" style="text-align:center; color:#999;">Sin registros</td></tr>';
}

async function generarLibroMayor() {
    const cuenta = document.getElementById('mayorCuenta').value;
    if (!cuenta) return;
    const asientos = await DB.getAll('asientos');
    let saldo = 0, html = '';
    asientos.forEach(a => {
        a.lineas.forEach(l => {
            if (l.cuenta === cuenta) {
                saldo += l.debe - l.haber;
                html += `<tr>
                    <td>${textCell(a.fecha)}</td>
                    <td>${textCell(a.numero)} - ${(a.glosa || '').substring(0, 40)}</td>
                    <td style="text-align:right;">${l.debe > 0 ? l.debe.toFixed(2) : ''}</td>
                    <td style="text-align:right;">${l.haber > 0 ? l.haber.toFixed(2) : ''}</td>
                    <td style="text-align:right;"><strong>${saldo.toFixed(2)}</strong></td>
                </tr>`;
            }
        });
    });
    document.getElementById('libroMayorTable').innerHTML =
        html || '<tr><td colspan="5" style="text-align:center; color:#999;">Sin movimientos</td></tr>';
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
    const compras = await DB.getAll('compras');
    document.getElementById('comprasTable').innerHTML = compras.map(c => `
        <tr>
            <td>${textCell(c.fecha)}</td><td>${textCell(c.proveedor)}</td><td>${textCell(c.ruc)}</td>
            <td>${textCell(c.tipo)}</td><td>${textCell(c.numero)}</td>
            <td style="text-align:right;">${Number(c.base).toFixed(2)}</td>
            <td style="text-align:right;">${Number(c.igv).toFixed(2)}</td>
            <td style="text-align:right;"><strong>${Number(c.total).toFixed(2)}</strong></td>
            <td><button class="delete-btn" onclick="eliminarCompra(${c.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function eliminarCompra(id) {
    if (!confirm('¿Eliminar esta compra?')) return;
    await DB.delete('compras', id);
    await renderCompras();
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
    const ventas = await DB.getAll('ventas');
    document.getElementById('ventasTable').innerHTML = ventas.map(v => `
        <tr>
            <td>${textCell(v.fecha)}</td><td>${textCell(v.cliente)}</td><td>${textCell(v.ruc)}</td>
            <td>${textCell(v.tipo)}</td><td>${textCell(v.numero)}</td>
            <td style="text-align:right;">${Number(v.base).toFixed(2)}</td>
            <td style="text-align:right;">${Number(v.igv).toFixed(2)}</td>
            <td style="text-align:right;"><strong>${Number(v.total).toFixed(2)}</strong></td>
            <td><button class="delete-btn" onclick="eliminarVenta(${v.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function eliminarVenta(id) {
    if (!confirm('¿Eliminar esta venta?')) return;
    await DB.delete('ventas', id);
    await renderVentas();
}

// ==================== INVENTARIOS ====================
async function renderInventarios() {
    const mercs = await DB.getAll('mercaderias');
    document.getElementById('inventariosTable').innerHTML = mercs.map(m => `
        <tr>
            <td>${textCell(m.codigo)}</td><td>${textCell(m.descripcion)}</td><td>${textCell(m.unidad)}</td>
            <td>${m.stock}</td>
            <td style="text-align:right;">${Number(m.costo).toFixed(2)}</td>
            <td style="text-align:right;"><strong>${(m.stock * m.costo).toFixed(2)}</strong></td>
        </tr>
    `).join('');
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
    const planillas = await DB.getAll('planillas');
    document.getElementById('planillasTable').innerHTML = planillas.map(p => {
        const sueldo = Number(p.sueldo);
        const afp = sueldo * 0.13;
        const essalud = sueldo * 0.09;
        const impuesto = sueldo > 3500 ? (sueldo - 3500) * 0.08 : 0;
        const neto = sueldo - afp - impuesto;
        return `
        <tr>
            <td>${textCell(p.codigo)}</td><td>${textCell(p.nombre)}</td><td>${textCell(p.cargo)}</td>
            <td style="text-align:right;">${sueldo.toFixed(2)}</td>
            <td style="text-align:right;">${afp.toFixed(2)}</td>
            <td style="text-align:right;">${essalud.toFixed(2)}</td>
            <td style="text-align:right;">${impuesto.toFixed(2)}</td>
            <td style="text-align:right;"><strong>${neto.toFixed(2)}</strong></td>
            <td><button class="delete-btn" onclick="eliminarPlanilla(${p.id})">🗑️</button></td>
        </tr>`;
    }).join('');
}

async function eliminarPlanilla(id) {
    if (!confirm('¿Eliminar?')) return;
    await DB.delete('planillas', id);
    await renderPlanillas();
}