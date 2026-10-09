// ==================== KARDEX v3.0 - EXISTENCIAS DE VSS FÁBRICA ====================
// Método: PROMEDIO PONDERADO MÓVIL
//
// Artículos: los que existen en la base de datos
//   · materia_prima → Materia Prima        (cuenta 24)
//   · repuestos     → Insumos              (cuenta 25)
//   · productos     → Productos Terminados (cuenta 21)
//   · mercaderias   → Mercaderías          (cuenta 20)
//
// Movimientos: tabla kardex (por código exacto) + consumos de MP en las órdenes de trabajo.
// El saldo inicial de cada artículo es el que cuadra los movimientos con el stock actual.
//
// REGLAS CONTABLES:
//   · ENTRADA → NO genera asiento (la compra ya lo hizo en el módulo Compras)
//   · SALIDA  → SÍ genera asiento: DEBE cuenta de destino / HABER cuenta de existencias
//   · AJUSTE  → SÍ genera asiento: DEBE existencias / HABER 656 (sobrante)

let kardexTipoActual = 'entrada';

const TIPOS_EXISTENCIA = [
    { tabla: 'materia_prima', tipo: 'Materia Prima', campoCosto: 'costo_unitario',
      cuentaInv: '241', nombreInv: 'Materias Primas',
      cuentaSalida: '231', nombreSalida: 'Productos en Proceso - Costo' },
    { tabla: 'repuestos', tipo: 'Insumos', campoCosto: 'costo',
      cuentaInv: '252', nombreInv: 'Suministros',
      cuentaSalida: '656', nombreSalida: 'Gastos Diversos' },
    { tabla: 'productos', tipo: 'Productos Terminados', campoCosto: null,
      cuentaInv: '211', nombreInv: 'Productos Terminados - Costo',
      cuentaSalida: '692', nombreSalida: 'Costo de Productos Terminados Vendidos' },
    { tabla: 'mercaderias', tipo: 'Mercaderías', campoCosto: 'costo',
      cuentaInv: '201', nombreInv: 'Mercaderías - Costo',
      cuentaSalida: '691', nombreSalida: 'Costo de Mercaderías Vendidas' }
];

// ==================== DATOS ====================
async function cargarExistencias() {
    const datos = await Promise.all(TIPOS_EXISTENCIA.map(t => DB.getAll(t.tabla)));
    return TIPOS_EXISTENCIA.flatMap((def, i) => datos[i].map(x => ({
        id: x.id,
        codigo: x.codigo,
        nombre: x.descripcion || x.nombre || x.codigo,
        unidad: x.unidad || 'UND',
        stock: Number(x.stock) || 0,
        costo: Number(def.campoCosto ? x[def.campoCosto] : x.precio) || 0,
        def
    }))).sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));
}

async function cargarDatosKardex() {
    const [existencias, kardex, consumosMP, ordenes] = await Promise.all([
        cargarExistencias(),
        DB.getAll('kardex'),
        DB.getAll('ot_materia_prima'),
        DB.getAll('ordenes_trabajo')
    ]);
    const otMap = {};
    ordenes.forEach(o => otMap[o.id] = o.numero_ot);
    return { existencias, kardex, consumosMP, otMap };
}

const signoMovimiento = m => m.tipo === 'salida' ? -1 : 1;

// Movimientos de un artículo en orden cronológico, con saldos (promedio ponderado)
function movimientosExistencia(item, { kardex, consumosMP, otMap }) {
    const movs = kardex
        .filter(k => k.producto_codigo === item.codigo)
        .map(k => ({
            id: k.id,
            fecha: k.fecha || '',
            orden: k.created_at || k.fecha || '',
            tipo: k.tipo_movimiento,
            documento: k.documento || '',
            descripcion: k.descripcion || '',
            cantidad: Number(k.cantidad) || 0,
            costoUnit: Number(k.costo_unitario) || 0,
            total: Number(k.costo_total) || 0
        }));

    if (item.def.tabla === 'materia_prima') {
        consumosMP
            .filter(c => c.materia_prima_codigo === item.codigo)
            .forEach(c => movs.push({
                id: null,
                fecha: String(c.created_at || '').substring(0, 10),
                orden: c.created_at || '',
                tipo: 'salida',
                documento: otMap[c.ot_id] || 'OT',
                descripcion: `Consumo en ${otMap[c.ot_id] || 'OT'}`,
                cantidad: Number(c.cantidad) || 0,
                costoUnit: Number(c.costo_unitario) || 0,
                total: Number(c.costo_total) || 0
            }));
    }

    movs.sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.orden).localeCompare(String(b.orden)));

    const cantInicial = item.stock - movs.reduce((s, m) => s + signoMovimiento(m) * m.cantidad, 0);
    let saldoCant = cantInicial;
    let saldoTotal = cantInicial * item.costo;
    const inicial = { cantidad: cantInicial, costoUnit: item.costo, total: saldoTotal };

    movs.forEach(m => {
        saldoCant += signoMovimiento(m) * m.cantidad;
        saldoTotal += signoMovimiento(m) * m.total;
        m.saldoCant = saldoCant;
        m.saldoTotal = saldoTotal;
        m.saldoCU = saldoCant !== 0 ? saldoTotal / saldoCant : 0;
    });

    return { inicial, movs };
}

async function siguienteAsientoKardex() {
    const asientos = await DB.getAll('asientos');
    let maxNum = 0;
    asientos.forEach(a => {
        const m = String(a.numero || '').match(/^AS-(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    return 'AS-' + String(maxNum + 1).padStart(3, '0');
}

// ==================== INIT ====================
async function initKardex() {
    console.log('📦 Iniciando módulo Kardex v3.0...');
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

// ==================== SELECT DE ARTÍCULOS ====================
async function cargarSelectProductos() {
    try {
        const existencias = await cargarExistencias();

        const options = TIPOS_EXISTENCIA.map(def => {
            const items = existencias.filter(x => x.def === def);
            if (items.length === 0) return '';
            return `<optgroup label="${textCell(def.tipo)}">` + items.map(p =>
                `<option value="${textCell(p.codigo)}">${textCell(p.codigo)} - ${textCell(p.nombre)} (${textCell(p.unidad)})</option>`
            ).join('') + '</optgroup>';
        }).join('');

        ['kxProducto', 'kardexProducto'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const actual = el.value;
            el.innerHTML = '<option value="">Seleccione artículo...</option>' + options;
            if (actual) el.value = actual;
        });

        console.log(`✅ ${existencias.length} artículos cargados en selects`);
    } catch (error) {
        console.error('Error cargando artículos:', error);
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

    if (!producto_codigo) { showAlert('Seleccione un artículo', 'error'); return; }
    if (!fecha) { showAlert('Ingrese la fecha', 'error'); return; }
    if (cantidad <= 0) { showAlert('La cantidad debe ser mayor a 0', 'error'); return; }

    try {
        const existencias = await cargarExistencias();
        const item = existencias.find(x => x.codigo === producto_codigo);
        if (!item) { showAlert('Artículo no encontrado', 'error'); return; }
        const def = item.def;

        // Saldo actual = stock del catálogo valorizado al costo promedio
        const saldoCantidad = item.stock;
        const saldoTotal = item.stock * item.costo;

        if (kardexTipoActual === 'salida' && cantidad > saldoCantidad &&
            !confirm(`⚠️ Stock insuficiente (${saldoCantidad} ${item.unidad}). ¿Continuar de todos modos?`)) return;

        // La salida sale al costo promedio; la entrada y el ajuste al costo ingresado (o al promedio si no se ingresa)
        const costo_unit_final = kardexTipoActual === 'salida' || costo_unitario <= 0 ? item.costo : costo_unitario;
        const costo_total = cantidad * costo_unit_final;

        const signo = kardexTipoActual === 'salida' ? -1 : 1;
        const nuevoSaldoCantidad = saldoCantidad + signo * cantidad;
        const nuevoSaldoTotal = saldoTotal + signo * costo_total;
        const nuevoSaldoCostoUnit = nuevoSaldoCantidad > 0 ? nuevoSaldoTotal / nuevoSaldoCantidad : item.costo;

        // ==================== ASIENTO CONTABLE ====================
        let numAsiento = null;
        let asientoCreado = null;
        const inventario = { cuenta: def.cuentaInv, nombre: def.nombreInv };

        if (kardexTipoActual === 'salida') {
            numAsiento = await siguienteAsientoKardex();
            asientoCreado = await DB.insert('asientos', {
                numero: numAsiento,
                fecha,
                tipo: 'normal',
                glosa: `Salida de ${def.tipo.toLowerCase()} · ${item.nombre} · ${documento}`,
                lineas: [
                    { cuenta: def.cuentaSalida, nombre: def.nombreSalida, debe: costo_total, haber: 0 },
                    { ...inventario, debe: 0, haber: costo_total }
                ],
                estado: 'validado'
            });
        } else if (kardexTipoActual === 'ajuste') {
            numAsiento = await siguienteAsientoKardex();
            asientoCreado = await DB.insert('asientos', {
                numero: numAsiento,
                fecha,
                tipo: 'ajuste',
                glosa: `Ajuste de inventario (sobrante) · ${item.nombre} · ${documento}`,
                lineas: [
                    { ...inventario, debe: costo_total, haber: 0 },
                    { cuenta: '656', nombre: 'Gastos Diversos', debe: 0, haber: costo_total }
                ],
                estado: 'validado'
            });
        }

        // ==================== MOVIMIENTO KARDEX ====================
        await DB.insert('kardex', {
            producto_codigo,
            producto_nombre: item.nombre,
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

        // ==================== STOCK Y COSTO PROMEDIO ====================
        const updateData = { stock: nuevoSaldoCantidad };
        if (def.campoCosto && kardexTipoActual !== 'salida') updateData[def.campoCosto] = nuevoSaldoCostoUnit;
        await DB.update(def.tabla, item.id, updateData);

        closeModal('modalKardexMov');
        showAlert(kardexTipoActual === 'entrada'
            ? '✅ Entrada registrada · Stock actualizado (sin asiento, ya está en Compras)'
            : `✅ ${kardexTipoActual === 'salida' ? 'Salida' : 'Ajuste'} registrado · Asiento ${numAsiento} generado`, 'success');

        await renderKardex();
        await renderAjustes();
    } catch (error) {
        console.error('Error guardando movimiento:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== RENDER MOVIMIENTOS ====================
async function renderKardex() {
    try {
        const tbody = document.getElementById('kardexTable');
        if (!tbody) return;

        const datos = await cargarDatosKardex();
        const filas = datos.existencias.flatMap(item =>
            movimientosExistencia(item, datos).movs.map(m => ({ ...m, item }))
        ).sort((a, b) => b.fecha.localeCompare(a.fecha) || String(b.orden).localeCompare(String(a.orden)));

        tbody.innerHTML = filas.map(m => `
            <tr>
                <td>${textCell(m.fecha)}</td>
                <td>${textCell(m.item.codigo)} - ${textCell(m.item.nombre)}<br><small style="color:#56677b;">${textCell(m.item.def.tipo)}</small></td>
                <td>
                    <span class="status-badge status-${m.tipo === 'salida' ? 'pending' : 'valid'}">
                        ${textCell(m.tipo)}
                    </span>
                </td>
                <td>${textCell(m.documento)}</td>
                <td>${textCell(m.descripcion)}</td>
                <td style="text-align:right;">${m.cantidad.toFixed(3)}</td>
                <td style="text-align:right;">${m.costoUnit.toFixed(4)}</td>
                <td style="text-align:right;">${m.total.toFixed(2)}</td>
                <td style="text-align:right;"><strong>${m.saldoCant.toFixed(3)}</strong></td>
                <td>${m.id ? `<button class="delete-btn" onclick="eliminarMovimientoKardex(${m.id})">🗑️</button>` : '<small style="color:#56677b;">Desde OT</small>'}</td>
            </tr>
        `).join('') || '<tr><td colspan="10" style="text-align:center; color:#999;">Sin movimientos registrados. El saldo actual de cada artículo se ve en "Kardex por Producto" e "Inventario Valorizado".</td></tr>';

        console.log(`✅ Kardex: ${filas.length} movimientos de ${datos.existencias.length} artículos`);
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

// ==================== KARDEX DETALLADO POR ARTÍCULO ====================
async function generarKardexProducto() {
    const codigo = document.getElementById('kardexProducto').value;
    const tbody = document.getElementById('kardexProductoTable');
    if (!codigo) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; color:#999;">Seleccione un artículo</td></tr>';
        document.getElementById('kardexResumen').innerHTML = '';
        return;
    }

    try {
        const desde = document.getElementById('kardexDesde').value || '0000-01-01';
        const hasta = document.getElementById('kardexHasta').value || '9999-12-31';

        const datos = await cargarDatosKardex();
        const item = datos.existencias.find(x => x.codigo === codigo);
        if (!item) return;

        const { inicial, movs } = movimientosExistencia(item, datos);

        // Saldo de apertura: saldo inicial + movimientos anteriores al rango
        const previos = movs.filter(m => m.fecha < desde);
        const apertura = previos.length
            ? { cantidad: previos[previos.length - 1].saldoCant, total: previos[previos.length - 1].saldoTotal }
            : { cantidad: inicial.cantidad, total: inicial.total };
        const enRango = movs.filter(m => m.fecha >= desde && m.fecha <= hasta);

        const celda = (v, dec, bg) => `<td style="text-align:right; background:${bg};">${v === '' ? '' : Number(v).toFixed(dec)}</td>`;
        const fila = (fecha, doc, desc, ent, sal, saldo) => `<tr>
            <td>${textCell(fecha)}</td>
            <td>${textCell(doc)}</td>
            <td>${textCell(desc)}</td>
            ${celda(ent ? ent.cantidad : '', 3, '#e8f5e9')}${celda(ent ? ent.costoUnit : '', 4, '#e8f5e9')}${celda(ent ? ent.total : '', 2, '#e8f5e9')}
            ${celda(sal ? sal.cantidad : '', 3, '#ffebee')}${celda(sal ? sal.costoUnit : '', 4, '#ffebee')}${celda(sal ? sal.total : '', 2, '#ffebee')}
            <td style="text-align:right; background:#e3f2fd;"><strong>${saldo.cantidad.toFixed(3)}</strong></td>
            ${celda(saldo.cantidad !== 0 ? saldo.total / saldo.cantidad : 0, 4, '#e3f2fd')}
            <td style="text-align:right; background:#e3f2fd;"><strong>${saldo.total.toFixed(2)}</strong></td>
        </tr>`;

        let html = fila(desde === '0000-01-01' ? '' : desde, '', previos.length ? 'Saldo anterior' : 'Saldo inicial', null, null, apertura);
        enRango.forEach(m => {
            const esSalida = m.tipo === 'salida';
            html += fila(m.fecha, m.documento, m.descripcion, esSalida ? null : m, esSalida ? m : null,
                { cantidad: m.saldoCant, total: m.saldoTotal });
        });
        tbody.innerHTML = html;

        const final = enRango.length
            ? { cantidad: enRango[enRango.length - 1].saldoCant, total: enRango[enRango.length - 1].saldoTotal }
            : apertura;
        document.getElementById('kardexResumen').innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <h4>${textCell(item.def.tipo)}</h4>
                    <div class="value" style="font-size:1.2em;">${textCell(item.codigo)} · ${textCell(item.nombre)}</div>
                </div>
                <div class="stat-card">
                    <h4>Saldo Cantidad</h4>
                    <div class="value">${final.cantidad.toFixed(3)} ${textCell(item.unidad)}</div>
                </div>
                <div class="stat-card">
                    <h4>Costo Promedio</h4>
                    <div class="value">S/ ${(final.cantidad !== 0 ? final.total / final.cantidad : 0).toFixed(4)}</div>
                </div>
                <div class="stat-card">
                    <h4>Valor Total · Cuenta ${textCell(item.def.cuentaInv)}</h4>
                    <div class="value">S/ ${final.total.toFixed(2)}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error generando Kardex por artículo:', error);
    }
}

// ==================== INVENTARIO VALORIZADO ====================
async function generarInventarioValorizado() {
    try {
        const hasta = document.getElementById('invValFecha').value || '9999-12-31';
        const datos = await cargarDatosKardex();

        let totalGeneral = 0;
        const rows = TIPOS_EXISTENCIA.map(def => {
            const items = datos.existencias.filter(x => x.def === def);
            if (items.length === 0) return '';

            let subtotal = 0;
            const filas = items.map(item => {
                const { inicial, movs } = movimientosExistencia(item, datos);
                const hastaFecha = movs.filter(m => m.fecha <= hasta);
                const ultimo = hastaFecha[hastaFecha.length - 1];
                const cantidad = ultimo ? ultimo.saldoCant : inicial.cantidad;
                const total = ultimo ? ultimo.saldoTotal : inicial.total;
                subtotal += total;
                return `<tr>
                    <td>${textCell(item.codigo)}</td>
                    <td>${textCell(item.nombre)}</td>
                    <td>${textCell(item.unidad)}</td>
                    <td style="text-align:right;">${cantidad.toFixed(3)}</td>
                    <td style="text-align:right;">S/ ${(cantidad !== 0 ? total / cantidad : 0).toFixed(4)}</td>
                    <td style="text-align:right;"><strong>S/ ${total.toFixed(2)}</strong></td>
                </tr>`;
            }).join('');
            totalGeneral += subtotal;

            return `<tr><td colspan="6" style="background:#eaf1f8; font-weight:800;">${textCell(def.tipo)} · Cuenta ${def.cuentaInv.substring(0, 2)}</td></tr>
                ${filas}
                <tr><td colspan="5" style="text-align:right; font-weight:700;">Subtotal ${textCell(def.tipo)}</td>
                    <td style="text-align:right; font-weight:800;">S/ ${subtotal.toFixed(2)}</td></tr>`;
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
        const tbody = document.getElementById('kardexAjustesTable');
        if (!tbody) return;

        const [existencias, kardex] = await Promise.all([cargarExistencias(), DB.getAll('kardex')]);
        const porCodigo = {};
        existencias.forEach(x => porCodigo[x.codigo] = x);

        const ajustes = kardex
            .filter(m => m.tipo_movimiento === 'ajuste' && porCodigo[m.producto_codigo])
            .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

        tbody.innerHTML = ajustes.map(m => `
            <tr>
                <td>${textCell(m.fecha)}</td>
                <td>${textCell(m.producto_codigo)} - ${textCell(porCodigo[m.producto_codigo].nombre)}</td>
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
    if (tabId === 'kx-kardex') cargarSelectProductos().then(generarKardexProducto);
    if (tabId === 'kx-valorizado') generarInventarioValorizado();
    if (tabId === 'kx-ajustes') renderAjustes();
}
