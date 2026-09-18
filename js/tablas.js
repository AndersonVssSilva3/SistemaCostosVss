// ==================== TABLAS - DATOS MAESTROS ====================

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

async function initTablas() {
    await Promise.all([
        renderCuentas(),
        renderProductos(),
        renderMercaderias(),
        renderActivoFijo(),
        renderCentrosCosto(),
        renderInductores(),
        renderRepuestos()
    ]);
}

// ==================== CUENTAS ====================
async function guardarCuenta() {
    const codigo = document.getElementById('cuentaCodigo').value.trim();
    const nombre = document.getElementById('cuentaNombre').value.trim();
    if (!codigo || !nombre) { showAlert('Complete todos los campos', 'error'); return; }
    
    try {
        // Verificar si ya existe
        const cuentas = await DB.getAll('cuentas');
        if (cuentas.some(c => c.codigo === codigo)) {
            showAlert('El código ya existe', 'error');
            return;
        }
        
        await DB.insert('cuentas', {
            codigo,
            nombre,
            tipo: document.getElementById('cuentaTipo').value,
            naturaleza: document.getElementById('cuentaNaturaleza').value,
            es_padre: false
        });
        
        closeModal('modalCuenta');
        await renderCuentas();
        showAlert('Cuenta guardada', 'success');
        document.getElementById('cuentaCodigo').value = '';
        document.getElementById('cuentaNombre').value = '';
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderCuentas() {
    const cuentas = await DB.getAll('cuentas');
    const tbody = document.getElementById('cuentasTable');
    if (!tbody) return;
    
    tbody.innerHTML = cuentas.map(c => `
        <tr>
            <td><strong>${textCell(c.codigo)}</strong></td>
            <td>${textCell(c.nombre)}</td>
            <td><span class="status-badge status-valid">${textCell(c.tipo)}</span></td>
            <td>${textCell(c.naturaleza)}</td>
            <td><button class="delete-btn" onclick="eliminarCuenta(${c.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function eliminarCuenta(id) {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    try {
        await DB.delete('cuentas', id);
        await renderCuentas();
        showAlert('Cuenta eliminada', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

function filterCuentas() {
    const search = document.getElementById('searchCuenta').value.toLowerCase();
    document.querySelectorAll('#cuentasTable tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
}

// ==================== PRODUCTOS ====================
async function guardarProducto() {
    try {
        await DB.insert('productos', {
            codigo: document.getElementById('prodCodigo').value,
            nombre: document.getElementById('prodNombre').value,
            categoria: document.getElementById('prodCategoria').value,
            precio: parseFloat(document.getElementById('prodPrecio').value) || 0,
            stock: parseInt(document.getElementById('prodStock').value) || 0
        });
        closeModal('modalProducto');
        await renderProductos();
        showAlert('Producto guardado', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderProductos() {
    const productos = await DB.getAll('productos');
    const tbody = document.getElementById('productosTable');
    if (!tbody) return;
    
    tbody.innerHTML = productos.map(p => `
        <tr>
            <td>${textCell(p.codigo)}</td>
            <td>${textCell(p.nombre)}</td>
            <td>${textCell(p.categoria)}</td>
            <td style="text-align:right;">${Number(p.precio).toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><button class="delete-btn" onclick="eliminarProducto(${p.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar?')) return;
    try {
        await DB.delete('productos', id);
        await renderProductos();
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== MERCADERÍAS ====================
async function guardarMercaderia() {
    try {
        await DB.insert('mercaderias', {
            codigo: document.getElementById('mercCodigo').value,
            descripcion: document.getElementById('mercDesc').value,
            unidad: document.getElementById('mercUnidad').value,
            stock: parseInt(document.getElementById('mercStock').value) || 0,
            costo: parseFloat(document.getElementById('mercCosto').value) || 0
        });
        closeModal('modalMercaderia');
        await renderMercaderias();
        showAlert('Mercadería guardada', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderMercaderias() {
    const mercs = await DB.getAll('mercaderias');
    const tbody = document.getElementById('mercaderiasTable');
    if (!tbody) return;
    
    tbody.innerHTML = mercs.map(m => `
        <tr>
            <td>${textCell(m.codigo)}</td>
            <td>${textCell(m.descripcion)}</td>
            <td>${textCell(m.unidad)}</td>
            <td>${m.stock}</td>
            <td style="text-align:right;">${Number(m.costo).toFixed(2)}</td>
            <td><button class="delete-btn" onclick="eliminarMercaderia(${m.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function eliminarMercaderia(id) {
    if (!confirm('¿Eliminar?')) return;
    try {
        await DB.delete('mercaderias', id);
        await renderMercaderias();
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== ACTIVO FIJO ====================
async function guardarActivo() {
    try {
        await DB.insert('activoFijo', {
            codigo: document.getElementById('actCodigo').value,
            descripcion: document.getElementById('actDesc').value,
            fecha: document.getElementById('actFecha').value,
            costo: parseFloat(document.getElementById('actCosto').value) || 0,
            dep: parseFloat(document.getElementById('actDep').value) || 0
        });
        closeModal('modalActivo');
        await renderActivoFijo();
        showAlert('Activo fijo guardado', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderActivoFijo() {
    const activos = await DB.getAll('activoFijo');
    const tbody = document.getElementById('activoFijoTable');
    if (!tbody) return;
    
    tbody.innerHTML = activos.map(a => `
        <tr>
            <td>${textCell(a.codigo)}</td>
            <td>${textCell(a.descripcion)}</td>
            <td>${textCell(a.fecha)}</td>
            <td style="text-align:right;">${Number(a.costo).toFixed(2)}</td>
            <td style="text-align:right;">${Number(a.dep).toFixed(2)}</td>
            <td style="text-align:right;"><strong>${(Number(a.costo) - Number(a.dep)).toFixed(2)}</strong></td>
            <td><button class="delete-btn" onclick="eliminarActivo(${a.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function eliminarActivo(id) {
    if (!confirm('¿Eliminar?')) return;
    try {
        await DB.delete('activoFijo', id);
        await renderActivoFijo();
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== CENTROS DE COSTO ====================
async function guardarCentro() {
    try {
        await DB.insert('centrosCosto', {
            codigo: document.getElementById('centroCodigo').value,
            nombre: document.getElementById('centroNombre').value,
            responsable: document.getElementById('centroResp').value,
            presupuesto: parseFloat(document.getElementById('centroPresup').value) || 0,
            gastado: parseFloat(document.getElementById('centroGastado').value) || 0
        });
        closeModal('modalCentro');
        await renderCentrosCosto();
        showAlert('Centro guardado', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderCentrosCosto() {
    const centros = await DB.getAll('centrosCosto');
    const tbody = document.getElementById('centrosCostoTable');
    if (!tbody) return;
    
    tbody.innerHTML = centros.map(c => {
        const presup = Number(c.presupuesto);
        const gast = Number(c.gastado);
        const pct = presup > 0 ? ((gast / presup) * 100).toFixed(1) : 0;
        return `
        <tr>
            <td>${textCell(c.codigo)}</td>
            <td>${textCell(c.nombre)}</td>
            <td>${textCell(c.responsable)}</td>
            <td style="text-align:right;">${presup.toFixed(2)}</td>
            <td style="text-align:right;">${gast.toFixed(2)}</td>
            <td>
                <div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div>
                <small>${pct}%</small>
            </td>
            <td><button class="delete-btn" onclick="eliminarCentro(${c.id})">🗑️</button></td>
        </tr>`;
    }).join('');
}

async function eliminarCentro(id) {
    if (!confirm('¿Eliminar?')) return;
    try {
        await DB.delete('centrosCosto', id);
        await renderCentrosCosto();
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== INDUCTORES ====================
async function renderInductores() {
    const inductores = await DB.getAll('inductores');
    const tbody = document.getElementById('inductoresTable');
    if (!tbody) return;
    
    tbody.innerHTML = inductores.map(ind => `
        <tr>
            <td>${textCell(ind.codigo)}</td>
            <td>${textCell(ind.inductor)}</td>
            <td>${textCell(ind.unidad)}</td>
            <td style="text-align:right;">${Number(ind.valor).toFixed(2)}</td>
        </tr>
    `).join('');
}

// ==================== REPUESTOS ====================
async function guardarRepuesto() {
    try {
        await DB.insert('repuestos', {
            codigo: document.getElementById('repCodigo').value,
            descripcion: document.getElementById('repDesc').value,
            stock: parseInt(document.getElementById('repStock').value) || 0,
            costo: parseFloat(document.getElementById('repCosto').value) || 0
        });
        closeModal('modalRepuesto');
        await renderRepuestos();
        showAlert('Repuesto guardado', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderRepuestos() {
    const reps = await DB.getAll('repuestos');
    const tbody = document.getElementById('repuestosTable');
    if (!tbody) return;
    
    tbody.innerHTML = reps.map(r => `
        <tr>
            <td>${textCell(r.codigo)}</td>
            <td>${textCell(r.descripcion)}</td>
            <td>${r.stock}</td>
            <td style="text-align:right;">${Number(r.costo).toFixed(2)}</td>
            <td><button class="delete-btn" onclick="eliminarRepuesto(${r.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function eliminarRepuesto(id) {
    if (!confirm('¿Eliminar?')) return;
    try {
        await DB.delete('repuestos', id);
        await renderRepuestos();
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}