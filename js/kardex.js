// ==================== KARDEX v2.0 - CONTABLEMENTE CORRECTO ====================
// Método: PROMEDIO PONDERADO MÓVIL
//
// REGLAS CONTABLES:
//   · ENTRADA → NO genera asiento (la compra ya lo hizo en módulo Compras)
//   · SALIDA  → SÍ genera asiento: DEBE 691 / HABER 201
//   · AJUSTE  → SÍ genera asiento: DEBE 659 / HABER 201 (o al revés)
//   · El Kardex solo actualiza stock, no duplica contabilidad

let kardexTipoActual = 'entrada';

// ==================== INIT ====================
async function initKardex() {
    console.log('📦 Iniciando módulo Kardex v2.0...');
    try {
        await cargarSelectProductos();
        await renderKardex();
        await renderAjustes();
        console.log('✅ Módulo Kardex listo');
    } catch (error) {
        console.error('❌ Error inicializando Kardex:', error);
        showAlert('Error al cargar Kardex: ' + error.message, 'error');
    }
}

// ==================== SELECT DE PRODUCTOS ====================
async function cargarSelectProductos() {
    try {
        const productos = await DB.getAll('productos');
        const mercaderias = await DB.getAll('mercaderias');

        const todos = [
            ...productos.map(p => ({ codigo: p.codigo, nombre: p.nombre, unidad: 'UND' })),
            ...mercaderias.map(m => ({ codigo: m.codigo, nombre: m.descripcion, unidad: m.unidad || 'UND' }))
        ];

        const options = todos.map(p =>
            `<option value="${textCell(p.codigo)}">${textCell(p.codigo)} - ${textCell(p.nombre)} (${textCell(p.unidad)})</option>`
        ).join('');

        const kxProducto = document.getElementById('kxProducto');
        if (kxProducto) kxProducto.innerHTML = '<option value="">Seleccione producto...</option>' + options;

        const kardexProducto = document.getElementById('kardexProducto');
        if (kardexProducto) kardexProducto.innerHTML = '<option value="">Seleccione producto...</option>' + options;

        console.log(`✅ ${todos.length} productos cargados en selects`);
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// ==================== MODAL ====================
function openModalKardex(tipo) {
    kardexTipoActual = tipo;
    document.getElementById('kxTipo').value = tipo.toUpperCase();
    document.getElementById('kardexModalTitulo').textContent = `Nuevo movimiento: ${tipo.toUpperCase()}`;
    document.getElementById('kxFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('kxDocumento').value = '';
    document.getElementById('kxDescripcion').value = '';
    document.getElementById('kxCantidad').value = '';
    document.getElementById('kxCostoUnit').value = '';
    document.getElementById('kxCostoTotal').value = '';
    openModal('modalKardexMov');
}

function calcKardexTotal() {
    const cant = parseFloat(document.getElementById('kxCantidad').value) || 0;
    const costo = parseFloat(document.getElementById('kxCostoUnit').value) || 0;
    document.getElementById('kxCostoTotal').value = (cant * costo).toFixed(4);
}

// ==================== GUARDAR MOVIMIENTO ====================
async function guardarMovimientoKardex() {
    const producto_codigo = document.getElementById('kxProducto').value;
    const fecha = document.getElementById('kxFecha').value;
    const cantidad = parseFloat(document.getElementById('kxCantidad').value) || 0;
    const costo_unitario = parseFloat(document.getElementById('kxCostoUnit').value) || 0;
    const documento = document.getElementById('kxDocumento').value || '';
    const descripcion = document.getElementById('kxDescripcion').value || '';

    if (!producto_codigo) { showAlert('Seleccione un producto', 'error'); return; }
    if (!fecha) { showAlert('Ingrese la fecha', 'error'); return; }
    if (cantidad <= 0) { showAlert('La cantidad debe ser mayor a 0', 'error'); return; }

    try {
        // Buscar producto
        const productos = await DB.getAll('productos');
        const mercaderias = await DB.getAll('mercaderias');
        const prod = productos.find(p => p.codigo === producto_codigo)
                  || mercaderias.find(m => m.codigo === producto_codigo);
        const producto_nombre = prod ? (prod.nombre || prod.descripcion) : producto_codigo;

        // Obtener saldo actual ANTES del movimiento
        const movimientos = await DB.getAll('kardex');
        const delProducto = movimientos
            .filter(m => m.producto_codigo === producto_codigo)
            .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

        let saldoCantidad = 0, saldoTotal = 0;
        if (delProducto.length > 0) {
            const ultimo = delProducto[delProducto.length - 1];
            saldoCantidad = Number(ultimo.saldo_cantidad) || 0;
            saldoTotal = Number(ultimo.saldo_total) || 0;
        }

        // Calcular costo unitario
        let costo_unit_final = costo_unitario;
        if (kardexTipoActual === 'salida') {
            costo_unit_final = saldoCantidad > 0 ? saldoTotal / saldoCantidad : costo_unitario;
        }

        const costo_total = cantidad * costo_unit_final;

        // Nuevos saldos
        let nuevoSaldoCantidad, nuevoSaldoTotal;
        if (kardexTipoActual === 'salida') {
            nuevoSaldoCantidad = saldoCantidad - cantidad;
            nuevoSaldoTotal = saldoTotal - costo_total;
        } else {
            // entrada o ajuste positivo
            nuevoSaldoCantidad = saldoCantidad + cantidad;
            nuevoSaldoTotal = saldoTotal + costo_total;
        }

        const nuevoSaldoCostoUnit = nuevoSaldoCantidad > 0 ? nuevoSaldoTotal / nuevoSaldoCantidad : 0;

        // ==================== GENERAR ASIENTO CONTABLE ====================
        // SOLO si es salida o ajuste. Entrada NO genera asiento.
        let asientoCreado = null;
        let numAsiento = null;

        if (kardexTipoActual === 'salida') {
            // Salida por consumo/venta: DEBE 691 / HABER 201
            const asientos = await DB.getAll('asientos');
            numAsiento = 'AS-' + String(asientos.length + 1).padStart(3, '0');

            asientoCreado = await DB.insert('asientos', {
                numero: numAsiento,
                fecha,
                tipo: 'normal',
                glosa: `Salida de inventario · ${producto_nombre} · ${documento}`,
                lineas: [
                    { cuenta: '691', nombre: 'Costo de Mercaderías Vendidas', debe: costo_total, haber: 0 },
                    { cuenta: '201', nombre: 'Mercaderías - Costo',           debe: 0,           haber: costo_total }
                ],
                estado: 'validado'
            });
            console.log('✅ Asiento de salida generado:', numAsiento);

        } else if (kardexTipoActual === 'ajuste') {
            // Ajuste: puede ser positivo (sobrante) o negativo (faltante)
            const asientos = await DB.getAll('asientos');
            numAsiento = 'AS-' + String(asientos.length + 1).padStart(3, '0');

            const esSobrante = cantidad > 0;
            const lineas = esSobrante ? [
                { cuenta: '201', nombre: 'Mercaderías - Costo',      debe: costo_total, haber: 0 },
                { cuenta: '659', nombre: 'Otros Gastos de Gestión',  debe: 0,           haber: costo_total }
            ] : [
                { cuenta: '659', nombre: 'Otros Gastos de Gestión',  debe: costo_total, haber: 0 },
                { cuenta: '201', nombre: 'Mercaderías - Costo',      debe: 0,           haber: costo_total }
            ];

            asientoCreado = await DB.insert('asientos', {
                numero: numAsiento,
                fecha,
                tipo: 'ajuste',
                glosa: `Ajuste de inventario · ${producto_nombre} · ${documento}`,
                lineas,
                estado: 'validado'
            });
            console.log('✅ Asiento de ajuste generado:', numAsiento);

        } else {
            // ENTRADA: NO genera asiento
            console.log('ℹ️ Entrada registrada sin asiento (ya existe en módulo Compras)');
        }

        // ==================== GUARDAR MOVIMIENTO KARDEX ====================
        await DB.insert('kardex', {
            producto_codigo,
            producto_nombre,
            fecha,
            tipo_movimiento: kardexTipoActual,
            documento,
            descripcion,
            cantidad,
            costo_unitario: costo_unit_final,
            costo_total,
            saldo_cantidad: nuevoSaldoCantidad,
            saldo_costo_unitario: nuevoSaldoCostoUnit,
            saldo_total: nuevoSaldoTotal,
            metodo_valorizacion: 'promedio',
            asiento_id: asientoCreado?.id || null
        });

        // ==================== ACTUALIZAR STOCK ====================
        if (prod) {
            const tabla = productos.includes(prod) ? 'productos' : 'mercaderias';
            const updateData = { stock: nuevoSaldoCantidad };
            if (tabla === 'mercaderias') {
                updateData.costo = nuevoSaldoCostoUnit;
            }
            await DB.update(tabla, prod.id, updateData);
        }

        closeModal('modalKardexMov');
        
        if (kardexTipoActual === 'entrada') {
            showAlert(`✅ Entrada registrada · Stock actualizado (sin asiento, ya está en Compras)`, 'success');
        } else {
            showAlert(`✅ ${kardexTipoActual === 'salida' ? 'Salida' : 'Ajuste'} registrado · Asiento ${numAsiento} generado`, 'success');
        }
        
        await renderKardex();

    } catch (error) {
        console.error('Error guardando movimiento:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== RENDER MOVIMIENTOS ====================
async function renderKardex() {
    try {
        const movimientos = await DB.getAll('kardex');
        const tbody = document.getElementById('kardexTable');
        if (!tbody) return;

        const ordenados = movimientos.sort((a, b) => {
            const f = (b.fecha || '').localeCompare(a.fecha || '');
            return f !== 0 ? f : (b.id - a.id);
        });

        tbody.innerHTML = ordenados.map(m => `
            <tr>
                <td>${textCell(m.fecha)}</td>
                <td>${textCell(m.producto_codigo)} - ${textCell(m.producto_nombre)}</td>
                <td>
                    <span class="status-badge status-${m.tipo_movimiento === 'entrada' ? 'valid' : m.tipo_movimiento === 'salida' ? 'pending' : 'valid'}">
                        ${textCell(m.tipo_movimiento)}
                    </span>
                </td>
                <td>${textCell(m.documento)}</td>
                <td>${textCell(m.descripcion)}</td>
                <td style="text-align:right;">${Number(m.cantidad).toFixed(3)}</td>
                <td style="text-align:right;">${Number(m.costo_unitario).toFixed(4)}</td>
                <td style="text-align:right;">${Number(m.costo_total).toFixed(2)}</td>
                <td style="text-align:right;"><strong>${Number(m.saldo_cantidad).toFixed(3)}</strong></td>
                <td><button class="delete-btn" onclick="eliminarMovimientoKardex(${m.id})">🗑️</button></td>
            </tr>
        `).join('') || '<tr><td colspan="10" style="text-align:center; color:#999;">Sin movimientos registrados</td></tr>';

        console.log(`✅ Kardex: ${ordenados.length} movimientos`);
    } catch (error) {
        console.error('Error renderizando Kardex:', error);
    }
}

async function eliminarMovimientoKardex(id) {
    if (!confirm('¿Eliminar este movimiento? Se recalcularán los saldos posteriores.')) return;
    try {
        await DB.delete('kardex', id);
        await renderKardex();
        showAlert('Movimiento eliminado', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== KARDEX DETALLADO POR PRODUCTO ====================
async function generarKardexProducto() {
    const codigo = document.getElementById('kardexProducto').value;
    if (!codigo) {
        document.getElementById('kardexProductoTable').innerHTML =
            '<tr><td colspan="12" style="text-align:center; color:#999;">Seleccione un producto</td></tr>';
        return;
    }

    try {
        const desde = document.getElementById('kardexDesde').value;
        const hasta = document.getElementById('kardexHasta').value;

        const movimientos = (await DB.getAll('kardex'))
            .filter(m => m.producto_codigo === codigo && m.fecha >= desde && m.fecha <= hasta)
            .sort((a, b) => a.fecha.localeCompare(b.fecha));

        let html = '';
        let saldoCant = 0, saldoTotal = 0;

        movimientos.forEach(m => {
            const esEntrada = m.tipo_movimiento === 'entrada';
            const esSalida = m.tipo_movimiento === 'salida';
            const esAjuste = m.tipo_movimiento === 'ajuste';

            if (esEntrada || (esAjuste && Number(m.cantidad) > 0)) {
                saldoCant += Number(m.cantidad);
                saldoTotal += Number(m.costo_total);
            } else {
                saldoCant -= Number(m.cantidad);
                saldoTotal -= Number(m.costo_total);
            }

            const costoProm = saldoCant > 0 ? saldoTotal / saldoCant : 0;

            html += `<tr>
                <td>${textCell(m.fecha)}</td>
                <td>${textCell(m.documento)}</td>
                <td>${textCell(m.descripcion)}</td>
                <td style="text-align:right; background:#e8f5e9;">${esEntrada ? Number(m.cantidad).toFixed(3) : ''}</td>
                <td style="text-align:right; background:#e8f5e9;">${esEntrada ? Number(m.costo_unitario).toFixed(4) : ''}</td>
                <td style="text-align:right; background:#e8f5e9;">${esEntrada ? Number(m.costo_total).toFixed(2) : ''}</td>
                <td style="text-align:right; background:#ffebee;">${esSalida ? Number(m.cantidad).toFixed(3) : ''}</td>
                <td style="text-align:right; background:#ffebee;">${esSalida ? Number(m.costo_unitario).toFixed(4) : ''}</td>
                <td style="text-align:right; background:#ffebee;">${esSalida ? Number(m.costo_total).toFixed(2) : ''}</td>
                <td style="text-align:right; background:#e3f2fd;"><strong>${saldoCant.toFixed(3)}</strong></td>
                <td style="text-align:right; background:#e3f2fd;">${costoProm.toFixed(4)}</td>
                <td style="text-align:right; background:#e3f2fd;"><strong>${saldoTotal.toFixed(2)}</strong></td>
            </tr>`;
        });

        document.getElementById('kardexProductoTable').innerHTML =
            html || '<tr><td colspan="12" style="text-align:center; color:#999;">Sin movimientos en el rango</td></tr>';

        const prod = movimientos[0];
        document.getElementById('kardexResumen').innerHTML = prod ? `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <h4>Producto</h4>
                    <div class="value" style="font-size:1.2em;">${textCell(prod.producto_nombre)}</div>
                </div>
                <div class="stat-card">
                    <h4>Saldo Cantidad</h4>
                    <div class="value">${saldoCant.toFixed(3)}</div>
                </div>
                <div class="stat-card">
                    <h4>Costo Promedio</h4>
                    <div class="value">S/ ${(saldoCant > 0 ? saldoTotal / saldoCant : 0).toFixed(4)}</div>
                </div>
                <div class="stat-card">
                    <h4>Valor Total</h4>
                    <div class="value">S/ ${saldoTotal.toFixed(2)}</div>
                </div>
            </div>
        ` : '';
    } catch (error) {
        console.error('Error generando Kardex por producto:', error);
    }
}

// ==================== INVENTARIO VALORIZADO ====================
async function generarInventarioValorizado() {
    try {
        const hasta = document.getElementById('invValFecha').value;
        const movimientos = await DB.getAll('kardex');

        const productos = {};
        movimientos.filter(m => m.fecha <= hasta).forEach(m => {
            if (!productos[m.producto_codigo]) {
                productos[m.producto_codigo] = {
                    codigo: m.producto_codigo,
                    nombre: m.producto_nombre,
                    cantidad: 0,
                    total: 0
                };
            }
            const esEntrada = m.tipo_movimiento === 'entrada';
            const esAjuste = m.tipo_movimiento === 'ajuste';

            if (esEntrada || (esAjuste && Number(m.cantidad) > 0)) {
                productos[m.producto_codigo].cantidad += Number(m.cantidad);
                productos[m.producto_codigo].total += Number(m.costo_total);
            } else {
                productos[m.producto_codigo].cantidad -= Number(m.cantidad);
                productos[m.producto_codigo].total -= Number(m.costo_total);
            }
        });

        let totalGeneral = 0;
        const rows = Object.values(productos).map(p => {
            const costoProm = p.cantidad > 0 ? p.total / p.cantidad : 0;
            totalGeneral += p.total;
            return `<tr>
                <td>${textCell(p.codigo)}</td>
                <td>${textCell(p.nombre)}</td>
                <td>UND</td>
                <td style="text-align:right;">${p.cantidad.toFixed(3)}</td>
                <td style="text-align:right;">S/ ${costoProm.toFixed(4)}</td>
                <td style="text-align:right;"><strong>S/ ${p.total.toFixed(2)}</strong></td>
            </tr>`;
        });

        document.getElementById('invValTable').innerHTML =
            rows.join('') || '<tr><td colspan="6" style="text-align:center; color:#999;">Sin inventario</td></tr>';
        document.getElementById('invValTotal').textContent = 'S/ ' + totalGeneral.toFixed(2);
    } catch (error) {
        console.error('Error generando inventario valorizado:', error);
    }
}

// ==================== AJUSTES ====================
async function renderAjustes() {
    try {
        const movimientos = (await DB.getAll('kardex'))
            .filter(m => m.tipo_movimiento === 'ajuste')
            .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

        const tbody = document.getElementById('kardexAjustesTable');
        if (!tbody) return;

        tbody.innerHTML = movimientos.map(m => `
            <tr>
                <td>${textCell(m.fecha)}</td>
                <td>${textCell(m.producto_codigo)} - ${textCell(m.producto_nombre)}</td>
                <td>${textCell(m.documento)}</td>
                <td>${textCell(m.descripcion)}</td>
                <td style="text-align:right;">${Number(m.cantidad).toFixed(3)}</td>
                <td style="text-align:right;">S/ ${Number(m.costo_total).toFixed(2)}</td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center; color:#999;">Sin ajustes registrados</td></tr>';
    } catch (error) {
        console.error('Error renderizando ajustes:', error);
    }
}

// ==================== FILTROS ====================
function filterKardex() {
    const search = (document.getElementById('kxSearchProducto').value || '').toLowerCase();
    const tipo = document.getElementById('kxFilterTipo').value;

    document.querySelectorAll('#kardexTable tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        let visible = text.includes(search);
        if (tipo && !row.textContent.toLowerCase().includes(tipo)) visible = false;
        row.style.display = visible ? '' : 'none';
    });
}

// ==================== TABS ====================
function showTabKardex(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (tabId === 'kx-movimientos') renderKardex();
    if (tabId === 'kx-kardex') cargarSelectProductos();
    if (tabId === 'kx-valorizado') generarInventarioValorizado();
    if (tabId === 'kx-ajustes') renderAjustes();
}