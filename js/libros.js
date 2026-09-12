function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function initLibros() {
    updateCuentaSelects();
    renderCompras();
    renderVentas();
    renderInventarios();
    renderPlanillas();
    generarLibroDiario();
}

function updateCuentaSelects() {
    const cuentas = DB.getAll('cuentas').filter(c => !c.esPadre);  // solo subcuentas
    const options = cuentas.map(c => `<option value="${textCell(c.codigo)}">${textCell(c.codigo)} - ${textCell(c.nombre)}</option>`).join('');
    const el = document.getElementById('mayorCuenta');
    if (el) el.innerHTML = '<option value="">Seleccione...</option>' + options;
}

// ==================== LIBRO DIARIO ====================
function generarLibroDiario() {
    const asientos = DB.getAll('asientos');
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

// ==================== LIBRO MAYOR ====================
function generarLibroMayor() {
    const cuenta = document.getElementById('mayorCuenta').value;
    if (!cuenta) return;
    const asientos = DB.getAll('asientos');
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
function calcCompraIGV() {
    const base = parseFloat(document.getElementById('compraBase').value) || 0;
    const igv = base * 0.18;
    document.getElementById('compraIgv').value = igv.toFixed(2);
    document.getElementById('compraTotal').value = (base + igv).toFixed(2);
}

function guardarCompra() {
    const compras = DB.getAll('compras');
    compras.push({
        id: Date.now(),
        fecha: document.getElementById('compraFecha').value,
        proveedor: document.getElementById('compraProveedor').value,
        ruc: document.getElementById('compraRuc').value,
        tipo: document.getElementById('compraTipo').value,
        numero: document.getElementById('compraNumero').value,
        base: parseFloat(document.getElementById('compraBase').value) || 0,
        igv: parseFloat(document.getElementById('compraIgv').value) || 0,
        total: parseFloat(document.getElementById('compraTotal').value) || 0
    });
    DB.set('compras', compras);
    closeModal('modalCompra');
    renderCompras();
    showAlert('Compra registrada', 'success');
}

function renderCompras() {
    const compras = DB.getAll('compras');
    document.getElementById('comprasTable').innerHTML = compras.map((c, i) => `
        <tr>
            <td>${textCell(c.fecha)}</td><td>${textCell(c.proveedor)}</td><td>${textCell(c.ruc)}</td>
            <td>${textCell(c.tipo)}</td><td>${textCell(c.numero)}</td>
            <td style="text-align:right;">${c.base.toFixed(2)}</td>
            <td style="text-align:right;">${c.igv.toFixed(2)}</td>
            <td style="text-align:right;"><strong>${c.total.toFixed(2)}</strong></td>
            <td><button class="delete-btn" onclick="eliminarCompra(${i})">🗑️</button></td>
        </tr>
    `).join('');
}

function eliminarCompra(index) {
    if (!confirm('¿Eliminar esta compra?')) return;
    const compras = DB.getAll('compras');
    compras.splice(index, 1);
    DB.set('compras', compras);
    renderCompras();
}

// ==================== VENTAS ====================
function calcVentaIGV() {
    const base = parseFloat(document.getElementById('ventaBase').value) || 0;
    const igv = base * 0.18;
    document.getElementById('ventaIgv').value = igv.toFixed(2);
    document.getElementById('ventaTotal').value = (base + igv).toFixed(2);
}

function guardarVenta() {
    const ventas = DB.getAll('ventas');
    ventas.push({
        id: Date.now(),
        fecha: document.getElementById('ventaFecha').value,
        cliente: document.getElementById('ventaCliente').value,
        ruc: document.getElementById('ventaRuc').value,
        tipo: document.getElementById('ventaTipo').value,
        numero: document.getElementById('ventaNumero').value,
        base: parseFloat(document.getElementById('ventaBase').value) || 0,
        igv: parseFloat(document.getElementById('ventaIgv').value) || 0,
        total: parseFloat(document.getElementById('ventaTotal').value) || 0
    });
    DB.set('ventas', ventas);
    closeModal('modalVenta');
    renderVentas();
    showAlert('Venta registrada', 'success');
}

function renderVentas() {
    const ventas = DB.getAll('ventas');
    document.getElementById('ventasTable').innerHTML = ventas.map((v, i) => `
        <tr>
            <td>${textCell(v.fecha)}</td><td>${textCell(v.cliente)}</td><td>${textCell(v.ruc)}</td>
            <td>${textCell(v.tipo)}</td><td>${textCell(v.numero)}</td>
            <td style="text-align:right;">${v.base.toFixed(2)}</td>
            <td style="text-align:right;">${v.igv.toFixed(2)}</td>
            <td style="text-align:right;"><strong>${v.total.toFixed(2)}</strong></td>
            <td><button class="delete-btn" onclick="eliminarVenta(${i})">🗑️</button></td>
        </tr>
    `).join('');
}

function eliminarVenta(index) {
    if (!confirm('¿Eliminar esta venta?')) return;
    const ventas = DB.getAll('ventas');
    ventas.splice(index, 1);
    DB.set('ventas', ventas);
    renderVentas();
}

// ==================== INVENTARIOS ====================
function renderInventarios() {
    const mercs = DB.getAll('mercaderias');
    document.getElementById('inventariosTable').innerHTML = mercs.map(m => `
        <tr>
            <td>${textCell(m.codigo)}</td><td>${textCell(m.descripcion)}</td><td>${textCell(m.unidad)}</td>
            <td>${m.stock}</td>
            <td style="text-align:right;">${m.costo.toFixed(2)}</td>
            <td style="text-align:right;"><strong>${(m.stock * m.costo).toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

// ==================== PLANILLAS ====================
function guardarPlanilla() {
    const planillas = DB.getAll('planillas');
    planillas.push({
        codigo: document.getElementById('planCodigo').value,
        nombre: document.getElementById('planNombre').value,
        cargo: document.getElementById('planCargo').value,
        sueldo: parseFloat(document.getElementById('planSueldo').value) || 0
    });
    DB.set('planillas', planillas);
    closeModal('modalPlanilla');
    renderPlanillas();
    showAlert('Trabajador agregado', 'success');
}

function renderPlanillas() {
    const planillas = DB.getAll('planillas');
    document.getElementById('planillasTable').innerHTML = planillas.map((p, i) => {
        const afp = p.sueldo * 0.13;
        const essalud = p.sueldo * 0.09;
        const impuesto = p.sueldo > 3500 ? (p.sueldo - 3500) * 0.08 : 0;
        const neto = p.sueldo - afp - impuesto;
        return `
        <tr>
            <td>${textCell(p.codigo)}</td><td>${textCell(p.nombre)}</td><td>${textCell(p.cargo)}</td>
            <td style="text-align:right;">${p.sueldo.toFixed(2)}</td>
            <td style="text-align:right;">${afp.toFixed(2)}</td>
            <td style="text-align:right;">${essalud.toFixed(2)}</td>
            <td style="text-align:right;">${impuesto.toFixed(2)}</td>
            <td style="text-align:right;"><strong>${neto.toFixed(2)}</strong></td>
            <td><button class="delete-btn" onclick="eliminarPlanilla(${i})">🗑️</button></td>
        </tr>`;
    }).join('');
}

function eliminarPlanilla(index) {
    if (!confirm('¿Eliminar?')) return;
    const p = DB.getAll('planillas');
    p.splice(index, 1);
    DB.set('planillas', p);
    renderPlanillas();
}