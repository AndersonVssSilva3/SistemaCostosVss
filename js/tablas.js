function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function initTablas() {
    renderCuentas();
    renderProductos();
    renderMercaderias();
    renderActivoFijo();
    renderCentrosCosto();
    renderInductores();
    renderRepuestos();
}

// ==================== CUENTAS ====================
function guardarCuenta() {
    const codigo = document.getElementById('cuentaCodigo').value;
    const nombre = document.getElementById('cuentaNombre').value;
    if (!codigo || !nombre) { showAlert('Complete todos los campos', 'error'); return; }
    const cuentas = DB.getAll('cuentas');
    cuentas.push({
        codigo, nombre,
        tipo: document.getElementById('cuentaTipo').value,
        naturaleza: document.getElementById('cuentaNaturaleza').value
    });
    DB.set('cuentas', cuentas);
    closeModal('modalCuenta');
    renderCuentas();
    showAlert('Cuenta guardada', 'success');
    document.getElementById('cuentaCodigo').value = '';
    document.getElementById('cuentaNombre').value = '';
}

function renderCuentas() {
    const cuentas = DB.getAll('cuentas');
    document.getElementById('cuentasTable').innerHTML = cuentas.map((c, i) => `
        <tr>
            <td><strong>${textCell(c.codigo)}</strong></td>
            <td>${textCell(c.nombre)}</td>
            <td><span class="status-badge status-valid">${textCell(c.tipo)}</span></td>
            <td>${textCell(c.naturaleza)}</td>
            <td><button class="delete-btn" onclick="eliminarCuenta(${i})">🗑️</button></td>
        </tr>
    `).join('');
}

function eliminarCuenta(index) {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    const cuentas = DB.getAll('cuentas');
    cuentas.splice(index, 1);
    DB.set('cuentas', cuentas);
    renderCuentas();
}

function filterCuentas() {
    const search = document.getElementById('searchCuenta').value.toLowerCase();
    document.querySelectorAll('#cuentasTable tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
}

// ==================== PRODUCTOS ====================
function guardarProducto() {
    const productos = DB.getAll('productos');
    productos.push({
        codigo: document.getElementById('prodCodigo').value,
        nombre: document.getElementById('prodNombre').value,
        categoria: document.getElementById('prodCategoria').value,
        precio: parseFloat(document.getElementById('prodPrecio').value) || 0,
        stock: parseInt(document.getElementById('prodStock').value) || 0
    });
    DB.set('productos', productos);
    closeModal('modalProducto');
    renderProductos();
    showAlert('Producto guardado', 'success');
}

function renderProductos() {
    const productos = DB.getAll('productos');
    document.getElementById('productosTable').innerHTML = productos.map((p, i) => `
        <tr>
            <td>${textCell(p.codigo)}</td><td>${textCell(p.nombre)}</td><td>${textCell(p.categoria)}</td>
            <td style="text-align:right;">${p.precio.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><button class="delete-btn" onclick="eliminarProducto(${i})">🗑️</button></td>
        </tr>
    `).join('');
}

function eliminarProducto(index) {
    if (!confirm('¿Eliminar?')) return;
    const p = DB.getAll('productos');
    p.splice(index, 1);
    DB.set('productos', p);
    renderProductos();
}

// ==================== MERCADERÍAS ====================
function guardarMercaderia() {
    const mercs = DB.getAll('mercaderias');
    mercs.push({
        codigo: document.getElementById('mercCodigo').value,
        descripcion: document.getElementById('mercDesc').value,
        unidad: document.getElementById('mercUnidad').value,
        stock: parseInt(document.getElementById('mercStock').value) || 0,
        costo: parseFloat(document.getElementById('mercCosto').value) || 0
    });
    DB.set('mercaderias', mercs);
    closeModal('modalMercaderia');
    renderMercaderias();
    showAlert('Mercadería guardada', 'success');
}

function renderMercaderias() {
    const mercs = DB.getAll('mercaderias');
    document.getElementById('mercaderiasTable').innerHTML = mercs.map((m, i) => `
        <tr>
            <td>${textCell(m.codigo)}</td><td>${textCell(m.descripcion)}</td><td>${textCell(m.unidad)}</td>
            <td>${m.stock}</td>
            <td style="text-align:right;">${m.costo.toFixed(2)}</td>
            <td><button class="delete-btn" onclick="eliminarMercaderia(${i})">🗑️</button></td>
        </tr>
    `).join('');
}

function eliminarMercaderia(index) {
    if (!confirm('¿Eliminar?')) return;
    const m = DB.getAll('mercaderias');
    m.splice(index, 1);
    DB.set('mercaderias', m);
    renderMercaderias();
}

// ==================== ACTIVO FIJO ====================
function guardarActivo() {
    const activos = DB.getAll('activoFijo');
    activos.push({
        codigo: document.getElementById('actCodigo').value,
        descripcion: document.getElementById('actDesc').value,
        fecha: document.getElementById('actFecha').value,
        costo: parseFloat(document.getElementById('actCosto').value) || 0,
        dep: parseFloat(document.getElementById('actDep').value) || 0
    });
    DB.set('activoFijo', activos);
    closeModal('modalActivo');
    renderActivoFijo();
    showAlert('Activo fijo guardado', 'success');
}

function renderActivoFijo() {
    const activos = DB.getAll('activoFijo');
    document.getElementById('activoFijoTable').innerHTML = activos.map((a, i) => `
        <tr>
            <td>${textCell(a.codigo)}</td><td>${textCell(a.descripcion)}</td><td>${textCell(a.fecha)}</td>
            <td style="text-align:right;">${a.costo.toFixed(2)}</td>
            <td style="text-align:right;">${a.dep.toFixed(2)}</td>
            <td style="text-align:right;"><strong>${(a.costo - a.dep).toFixed(2)}</strong></td>
            <td><button class="delete-btn" onclick="eliminarActivo(${i})">🗑️</button></td>
        </tr>
    `).join('');
}

function eliminarActivo(index) {
    if (!confirm('¿Eliminar?')) return;
    const a = DB.getAll('activoFijo');
    a.splice(index, 1);
    DB.set('activoFijo', a);
    renderActivoFijo();
}

// ==================== CENTROS ====================
function guardarCentro() {
    const centros = DB.getAll('centrosCosto');
    centros.push({
        codigo: document.getElementById('centroCodigo').value,
        nombre: document.getElementById('centroNombre').value,
        responsable: document.getElementById('centroResp').value,
        presupuesto: parseFloat(document.getElementById('centroPresup').value) || 0,
        gastado: parseFloat(document.getElementById('centroGastado').value) || 0
    });
    DB.set('centrosCosto', centros);
    closeModal('modalCentro');
    renderCentrosCosto();
    showAlert('Centro guardado', 'success');
}

function renderCentrosCosto() {
    const centros = DB.getAll('centrosCosto');
    document.getElementById('centrosCostoTable').innerHTML = centros.map((c, i) => {
        const pct = c.presupuesto > 0 ? ((c.gastado / c.presupuesto) * 100).toFixed(1) : 0;
        return `
        <tr>
            <td>${textCell(c.codigo)}</td><td>${textCell(c.nombre)}</td><td>${textCell(c.responsable)}</td>
            <td style="text-align:right;">${c.presupuesto.toFixed(2)}</td>
            <td style="text-align:right;">${c.gastado.toFixed(2)}</td>
            <td><div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div><small>${pct}%</small></td>
            <td><button class="delete-btn" onclick="eliminarCentro(${i})">🗑️</button></td>
        </tr>`;
    }).join('');
}

function eliminarCentro(index) {
    if (!confirm('¿Eliminar?')) return;
    const c = DB.getAll('centrosCosto');
    c.splice(index, 1);
    DB.set('centrosCosto', c);
    renderCentrosCosto();
}

// ==================== INDUCTORES ====================
function renderInductores() {
    const inductores = DB.getAll('inductores');
    document.getElementById('inductoresTable').innerHTML = inductores.map(ind => `
        <tr>
            <td>${textCell(ind.codigo)}</td><td>${textCell(ind.inductor)}</td><td>${textCell(ind.unidad)}</td>
            <td style="text-align:right;">${ind.valor.toFixed(2)}</td>
        </tr>
    `).join('');
}

// ==================== REPUESTOS ====================
function guardarRepuesto() {
    const reps = DB.getAll('repuestos');
    reps.push({
        codigo: document.getElementById('repCodigo').value,
        descripcion: document.getElementById('repDesc').value,
        stock: parseInt(document.getElementById('repStock').value) || 0,
        costo: parseFloat(document.getElementById('repCosto').value) || 0
    });
    DB.set('repuestos', reps);
    closeModal('modalRepuesto');
    renderRepuestos();
    showAlert('Repuesto guardado', 'success');
}

function renderRepuestos() {
    const reps = DB.getAll('repuestos');
    document.getElementById('repuestosTable').innerHTML = reps.map((r, i) => `
        <tr>
            <td>${textCell(r.codigo)}</td><td>${textCell(r.descripcion)}</td><td>${r.stock}</td>
            <td style="text-align:right;">${r.costo.toFixed(2)}</td>
            <td><button class="delete-btn" onclick="eliminarRepuesto(${i})">🗑️</button></td>
        </tr>
    `).join('');
}

function eliminarRepuesto(index) {
    if (!confirm('¿Eliminar?')) return;
    const r = DB.getAll('repuestos');
    r.splice(index, 1);
    DB.set('repuestos', r);
    renderRepuestos();
}