// ==================== ÓRDENES DE TRABAJO - PÁGINA ====================

let otActualId = null;
let mpCatalogo = [];
// ==================== HELPER: SIGUIENTE NÚMERO DE ASIENTO ====================
async function obtenerSiguienteNumAsiento() {
    try {
        // Consultar todos los asientos
        const asientos = await DB.getAll('asientos');
        
        // Extraer el número más alto de todos
        let maxNum = 0;
        asientos.forEach(a => {
            const match = (a.numero || '').match(/^AS-(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        
        // Retornar el siguiente número
        return 'AS-' + String(maxNum + 1).padStart(3, '0');
    } catch (error) {
        console.error('Error obteniendo número de asiento:', error);
        // Fallback: usar timestamp
        return 'AS-' + Date.now();
    }
}
function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function fmtCorto(n) {
    const v = Number(n || 0);
    if (Math.abs(v) >= 1000000) return 'S/ ' + (v / 1000000).toFixed(2) + 'M';
    if (Math.abs(v) >= 1000) return 'S/ ' + (v / 1000).toFixed(1) + 'K';
    return 'S/ ' + v.toFixed(2);
}

async function initOrdenesPage() {
    console.log('📋 Iniciando página de Órdenes...');
    try {
        await cargarMPCatalogo();
        await renderOrdenes();
        console.log('✅ Página de Órdenes lista');
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function cargarMPCatalogo() {
    mpCatalogo = await DB.getAll('materiaPrima');
}

// ==================== RENDER LISTA ====================
async function renderOrdenes() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    const tbody = document.getElementById('otTable');
    if (!tbody) return;

    if (ordenes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#999;">Sin órdenes registradas</td></tr>';
        return;
    }

    ordenes.sort((a, b) => (a.numero_ot || '').localeCompare(b.numero_ot || ''));

    tbody.innerHTML = ordenes.map(o => `
        <tr style="cursor:pointer;" onclick="verDetalleOT(${o.id})">
            <td><strong>${textCell(o.numero_ot)}</strong></td>
            <td>${textCell(o.descripcion || '')}</td>
            <td>${textCell(o.fecha_inicio || '')} → ${textCell(o.fecha_fin || '')}</td>
            <td style="text-align:right;">${Number(o.unidades_producidas || 0).toLocaleString('es-PE')}</td>
            <td style="text-align:right;"><strong>${fmt(o.costo_total)}</strong></td>
            <td style="text-align:right;">${fmt(o.costo_unitario)}</td>
            <td style="text-align:center;">
                <span class="status-badge status-${o.estado === 'en_proceso' ? 'pending' : 'valid'}">
                    ${textCell(o.estado)}
                </span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="view-btn" onclick="event.stopPropagation(); verDetalleOT(${o.id})">👁️</button>
                    <button class="delete-btn" onclick="event.stopPropagation(); eliminarOT(${o.id})">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== VER DETALLE ====================
async function verDetalleOT(otId) {
    try {
        const ordenes = await DB.getAll('ordenesTrabajo');
        const ot = ordenes.find(o => o.id === otId);
        if (!ot) return;

        otActualId = otId;

        const [mp, manoObra, cif, ventas] = await Promise.all([
            DB.getAll('otMateriaPrima'),
            DB.getAll('otManoObra'),
            DB.getAll('otCif'),
            DB.getAll('otVentas')
        ]);

        document.getElementById('detOTNumero').textContent = ot.numero_ot;
        document.getElementById('detOTDesc').textContent = ot.descripcion || '—';
        document.getElementById('detOTFechaInicio').textContent = ot.fecha_inicio || '—';
        document.getElementById('detOTFechaFin').textContent = ot.fecha_fin || '—';
        document.getElementById('detOTEstado').textContent = ot.estado === 'en_proceso' ? '🟡 En proceso' : '✅ Terminada';
        document.getElementById('detOTUnidades').textContent = Number(ot.unidades_producidas || 0).toLocaleString('es-PE');
        document.getElementById('detOTCostoUnit').textContent = fmt(ot.costo_unitario);
        document.getElementById('otDetalleTitulo').textContent = `📊 Detalle de ${ot.numero_ot}`;

        // Botones de acción
        const acciones = document.getElementById('otAccionesDetalle');
        if (ot.estado === 'en_proceso') {
            acciones.innerHTML = `
                <button class="btn btn-info" onclick="abrirModalAsignarMP()">📦 + MP</button>
                <button class="btn btn-warning" onclick="abrirModalAsignarMO()">👷 + Mano Obra</button>
                <button class="btn btn-primary" onclick="abrirModalAsignarCIF()">⚙️ + CIF</button>
                <button class="btn btn-success" onclick="abrirModalRegistrarVenta()">💰 + Venta</button>
                <button class="btn btn-danger" onclick="cerrarOT(${ot.id})">🔒 Cerrar OT</button>
                <a class="btn btn-info" href="hoja-costos.html#${ot.id}">🧾 Hoja de Costos</a>
            `;
        } else {
            acciones.innerHTML = `
                <button class="btn btn-success" onclick="abrirModalRegistrarVenta()">💰 + Venta</button>
                <a class="btn btn-info" href="hoja-costos.html#${ot.id}">🧾 Hoja de Costos</a>
                <span style="color:#56677b; font-size:13px; padding:10px;">✅ OT cerrada</span>
            `;
        }

        // Resumen
        const total = Number(ot.costo_total) || 1;
        document.getElementById('detOTCostosResumen').innerHTML = `
            <div class="info-row"><strong>Materia Prima:</strong> ${fmt(ot.costo_mp)} (${((ot.costo_mp/total)*100).toFixed(1)}%)</div>
            <div class="info-row"><strong>Mano de Obra:</strong> ${fmt(ot.costo_mod)} (${((ot.costo_mod/total)*100).toFixed(1)}%)</div>
            <div class="info-row"><strong>CIF:</strong> ${fmt(ot.costo_cif)} (${((ot.costo_cif/total)*100).toFixed(1)}%)</div>
            <div class="info-row" style="border-top:2px solid #b7cadd; padding-top:8px; margin-top:8px;">
                <strong>TOTAL:</strong> ${fmt(ot.costo_total)}
            </div>
        `;

        // MP
        const mpOT = mp.filter(m => m.ot_id === otId);
        document.getElementById('detOTMateriaPrima').innerHTML = mpOT.length > 0
            ? mpOT.map(m => `
                <tr>
                    <td>${textCell(m.materia_prima_codigo)}</td>
                    <td style="text-align:right;">${Number(m.cantidad).toLocaleString('es-PE')}</td>
                    <td style="text-align:right;">${fmt(m.costo_unitario)}</td>
                    <td style="text-align:right;"><strong>${fmt(m.costo_total)}</strong></td>
                    <td><button class="delete-btn" onclick="eliminarMP(${m.id})">🗑️</button></td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" style="text-align:center; color:#999;">Sin MP asignada</td></tr>';

        // MO
        const moOT = manoObra.filter(m => m.ot_id === otId);
        document.getElementById('detOTManoObra').innerHTML = moOT.length > 0
            ? moOT.map(m => `
                <tr>
                    <td><span class="status-badge status-${m.tipo === 'MOD' ? 'valid' : 'pending'}">${textCell(m.tipo)}</span></td>
                    <td>${textCell(m.concepto || '')}</td>
                    <td style="text-align:right;"><strong>${fmt(m.monto)}</strong></td>
                    <td><button class="delete-btn" onclick="eliminarMO(${m.id})">🗑️</button></td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center; color:#999;">Sin mano de obra</td></tr>';

        // CIF
        const cifOT = cif.filter(c => c.ot_id === otId);
        document.getElementById('detOTCif').innerHTML = cifOT.length > 0
            ? cifOT.map(c => `
                <tr>
                    <td>${textCell(c.concepto)}</td>
                    <td>${textCell(c.inductor || '')}</td>
                    <td style="text-align:right;">${(Number(c.porcentaje) * 100).toFixed(0)}%</td>
                    <td style="text-align:right;"><strong>${fmt(c.monto)}</strong></td>
                    <td><button class="delete-btn" onclick="eliminarCIF(${c.id})">🗑️</button></td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" style="text-align:center; color:#999;">Sin CIF</td></tr>';

        // Venta
        const ventaOT = ventas.find(v => v.ot_id === otId);
        if (ventaOT) {
            const utilidad = Number(ventaOT.monto) - Number(ot.costo_total);
            const margen = ventaOT.monto > 0 ? (utilidad / ventaOT.monto) * 100 : 0;
            document.getElementById('detOTVenta').innerHTML = `
                <tr>
                    <td>${textCell(ventaOT.fecha)}</td>
                    <td>${fmt(ventaOT.monto)}</td>
                    <td>${textCell(ventaOT.tipo_pago)}</td>
                    <td style="text-align:right; color:${utilidad >= 0 ? '#087565' : '#b42335'}; font-weight:700;">
                        ${fmt(utilidad)}
                    </td>
                    <td style="text-align:right;">${margen.toFixed(1)}%</td>
                </tr>
            `;
        } else {
            document.getElementById('detOTVenta').innerHTML =
                '<tr><td colspan="5" style="text-align:center; color:#999;">Sin ventas registradas</td></tr>';
        }

        document.getElementById('otDetalle').style.display = 'block';
        document.getElementById('otDetalle').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al ver detalle: ' + error.message, 'error');
    }
}

function cerrarDetalleOT() {
    document.getElementById('otDetalle').style.display = 'none';
    otActualId = null;
}

// ==================== CREAR NUEVA OT ====================
async function abrirModalNuevaOT() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    const siguienteNum = ordenes.length + 101;
    
    document.getElementById('otNumero').value = 'OT-' + siguienteNum;
    document.getElementById('otEstado').value = 'en_proceso';
    document.getElementById('otDescripcion').value = '';
    document.getElementById('otFechaInicio').value = new Date().toISOString().split('T')[0];
    document.getElementById('otFechaFin').value = '';
    document.getElementById('otUnidades').value = '';
    document.getElementById('otCliente').value = '';
    
    openModal('modalNuevaOT');
}

async function guardarNuevaOT() {
    const numero = document.getElementById('otNumero').value;
    const descripcion = document.getElementById('otDescripcion').value.trim();
    const fechaInicio = document.getElementById('otFechaInicio').value;
    const fechaFin = document.getElementById('otFechaFin').value || null;
    const unidades = parseFloat(document.getElementById('otUnidades').value) || 0;

    if (!descripcion) { showAlert('Ingrese una descripción', 'error'); return; }
    if (!fechaInicio) { showAlert('Ingrese la fecha de inicio', 'error'); return; }
    if (unidades <= 0) { showAlert('Las unidades deben ser mayor a 0', 'error'); return; }

    try {
        await DB.insert('ordenesTrabajo', {
            numero_ot: numero,
            descripcion,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            estado: 'en_proceso',
            unidades_producidas: unidades,
            porcentaje_distribucion: 0,
            costo_mp: 0,
            costo_mod: 0,
            costo_cif: 0,
            costo_total: 0,
            costo_unitario: 0
        });

        closeModal('modalNuevaOT');
        await renderOrdenes();
        showAlert(`✅ OT ${numero} creada exitosamente`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al crear OT: ' + error.message, 'error');
    }
}

// ==================== ASIGNAR MP ====================
async function abrirModalAsignarMP() {
    if (!otActualId) return;
    
    const ordenes = await DB.getAll('ordenesTrabajo');
    const ot = ordenes.find(o => o.id === otActualId);
    document.getElementById('mpOTNumero').textContent = ot.numero_ot;
    
    // Cargar MP en el select
    const options = mpCatalogo.map(m =>
        `<option value="${textCell(m.codigo)}" data-costo="${m.costo_unitario}">${textCell(m.codigo)} - ${textCell(m.descripcion)} (S/ ${m.costo_unitario})</option>`
    ).join('');
    document.getElementById('mpSeleccion').innerHTML = '<option value="">Seleccione MP...</option>' + options;
    
    document.getElementById('mpCantidad').value = '';
    document.getElementById('mpCostoUnit').value = '';
    document.getElementById('mpCostoTotal').value = '';
    
    openModal('modalAsignarMP');
}

function calcMPTotal() {
    const sel = document.getElementById('mpSeleccion');
    const opcion = sel.options[sel.selectedIndex];
    const costoUnit = opcion ? parseFloat(opcion.dataset.costo) || 0 : 0;
    const cantidad = parseFloat(document.getElementById('mpCantidad').value) || 0;
    
    document.getElementById('mpCostoUnit').value = costoUnit.toFixed(2);
    document.getElementById('mpCostoTotal').value = (cantidad * costoUnit).toFixed(2);
}

async function guardarMP() {
    if (!otActualId) return;
    
    const codigo = document.getElementById('mpSeleccion').value;
    const cantidad = parseFloat(document.getElementById('mpCantidad').value) || 0;
    const costoUnit = parseFloat(document.getElementById('mpCostoUnit').value) || 0;
    const costoTotal = cantidad * costoUnit;

    if (!codigo) { showAlert('Seleccione MP', 'error'); return; }
    if (cantidad <= 0) { showAlert('La cantidad debe ser mayor a 0', 'error'); return; }

    try {
        await DB.insert('otMateriaPrima', {
            ot_id: otActualId,
            materia_prima_codigo: codigo,
            cantidad,
            costo_unitario: costoUnit,
            costo_total: costoTotal
        });

        // Salida del almacén: descuenta stock (el kardex de la MP la muestra como salida)
        const mpItem = (await DB.getAll('materiaPrima')).find(m => m.codigo === codigo);
        if (mpItem) await DB.update('materiaPrima', mpItem.id, { stock: Number(mpItem.stock) - cantidad });

        const ordenes = await DB.getAll('ordenesTrabajo');
        const ot = ordenes.find(o => o.id === otActualId);

        const numAsiento = await registrarAsientoConsumoMP(codigo, ot.numero_ot, costoTotal);

        await recalcularCostosOT(otActualId);
        await cargarMPCatalogo();
        closeModal('modalAsignarMP');
        await verDetalleOT(otActualId);
        await renderOrdenes();
        showAlert(`✅ MP asignada · Asiento ${numAsiento} generado`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}
async function eliminarMP(id) {
    if (!confirm('¿Eliminar esta asignación de MP?')) return;
    try {
        // Devuelve el stock al almacén
        const asig = await DB.get('otMateriaPrima', id);
        const mpItem = asig && (await DB.getAll('materiaPrima')).find(m => m.codigo === asig.materia_prima_codigo);
        if (mpItem) await DB.update('materiaPrima', mpItem.id, { stock: Number(mpItem.stock) + Number(asig.cantidad) });

        await DB.delete('otMateriaPrima', id);
        await cargarMPCatalogo();
        await recalcularCostosOT(otActualId);
        await verDetalleOT(otActualId);
        await renderOrdenes();
        showAlert('MP eliminada', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== ASIGNAR MANO DE OBRA ====================
async function abrirModalAsignarMO() {
    if (!otActualId) return;
    
    const ordenes = await DB.getAll('ordenesTrabajo');
    const ot = ordenes.find(o => o.id === otActualId);
    document.getElementById('moOTNumero').textContent = ot.numero_ot;
    
    document.getElementById('moTipo').value = 'MOD';
    document.getElementById('moConcepto').value = '';
    document.getElementById('moMonto').value = '';
    
    openModal('modalAsignarMO');
}

async function guardarMO() {
    if (!otActualId) return;
    
    const tipo = document.getElementById('moTipo').value;
    const concepto = document.getElementById('moConcepto').value.trim();
    const monto = parseFloat(document.getElementById('moMonto').value) || 0;

    if (monto <= 0) { showAlert('El monto debe ser mayor a 0', 'error'); return; }

    try {
        await DB.insert('otManoObra', {
            ot_id: otActualId,
            tipo,
            concepto,
            monto
        });

        const ordenes = await DB.getAll('ordenesTrabajo');
        const ot = ordenes.find(o => o.id === otActualId);
        
        const numAsiento = await obtenerSiguienteNumAsiento();

        await DB.insert('asientos', {
            numero: numAsiento,
            fecha: new Date().toISOString().split('T')[0],
            tipo: 'normal',
            glosa: `${tipo} ${concepto} asignada a ${ot.numero_ot}`,
            lineas: [
                { cuenta: '231', nombre: 'Productos en Proceso - Costo', debe: monto, haber: 0 },
                { cuenta: '411', nombre: 'Sueldos y Salarios por Pagar',  debe: 0,     haber: monto }
            ],
            estado: 'validado'
        });

        await recalcularCostosOT(otActualId);
        closeModal('modalAsignarMO');
        await verDetalleOT(otActualId);
        await renderOrdenes();
        showAlert(`✅ ${tipo} asignada · Asiento ${numAsiento} generado`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}
async function eliminarMO(id) {
    if (!confirm('¿Eliminar este registro de MO?')) return;
    try {
        await DB.delete('otManoObra', id);
        await recalcularCostosOT(otActualId);
        await verDetalleOT(otActualId);
        await renderOrdenes();
        showAlert('MO eliminada', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== ASIGNAR CIF ====================
async function abrirModalAsignarCIF() {
    if (!otActualId) return;
    
    const ordenes = await DB.getAll('ordenesTrabajo');
    const ot = ordenes.find(o => o.id === otActualId);
    document.getElementById('cifOTNumero').textContent = ot.numero_ot;
    
    document.getElementById('cifConcepto').value = 'Energía eléctrica';
    document.getElementById('cifInductor').value = 'kWh';
    document.getElementById('cifPorcentaje').value = '';
    document.getElementById('cifMonto').value = '';
    
    openModal('modalAsignarCIF');
}

// Inductor que corresponde a cada concepto de CIF (se puede cambiar en el formulario)
const INDUCTOR_POR_CONCEPTO = {
    'Energía eléctrica': 'kWh',
    'Agua': 'm³',
    'Seguros de fábrica': 'Área',
    'Alquiler de fábrica': 'Área',
    'Transporte de personal': 'Personal',
    'Mantenimiento': 'HM',
    'Control de calidad': 'Producción'
};

function onCIFConceptoChange() {
    const concepto = document.getElementById('cifConcepto').value;
    if (INDUCTOR_POR_CONCEPTO[concepto]) {
        document.getElementById('cifInductor').value = INDUCTOR_POR_CONCEPTO[concepto];
    }
}

function calcCIFMonto() {
    // Aquí podrías calcular el monto desde el porcentaje si tuvieras el total
    // Por ahora lo dejamos manual
}

async function guardarCIF() {
    if (!otActualId) return;
    
    const concepto = document.getElementById('cifConcepto').value;
    const inductor = document.getElementById('cifInductor').value;
    const porcentaje = (parseFloat(document.getElementById('cifPorcentaje').value) || 0) / 100;
    const monto = parseFloat(document.getElementById('cifMonto').value) || 0;

    if (monto <= 0) { showAlert('El monto debe ser mayor a 0', 'error'); return; }
    if (!inductor) { showAlert('Cada CIF debe tener un inductor', 'error'); return; }

    try {
        await DB.insert('otCif', {
            ot_id: otActualId,
            concepto,
            inductor,
            porcentaje,
            monto
        });

        let cuentaHaber = '638';
        let nombreHaber = 'Servicios de Terceros - Otros';
        
        if (concepto === 'Energía eléctrica' || concepto === 'Agua') {
            cuentaHaber = '633';
            nombreHaber = 'Servicios Básicos';
        } else if (concepto === 'Alquiler de fábrica') {
            cuentaHaber = '632';
            nombreHaber = 'Alquileres';
        } else if (concepto === 'Seguros de fábrica') {
            cuentaHaber = '636';
            nombreHaber = 'Seguros';
        } else if (concepto === 'Mantenimiento') {
            cuentaHaber = '634';
            nombreHaber = 'Mantenimiento y Reparaciones';
        } else if (concepto === 'Transporte de personal' || concepto === 'Control de calidad') {
            cuentaHaber = '638';
            nombreHaber = 'Servicios de Terceros - Otros';
        }

        const ordenes = await DB.getAll('ordenesTrabajo');
        const ot = ordenes.find(o => o.id === otActualId);
        const fecha = new Date().toISOString().split('T')[0];

        // 1. El CIF se registra primero como gasto (63)
        const numAsiento = await obtenerSiguienteNumAsiento();
        await DB.insert('asientos', {
            numero: numAsiento,
            fecha,
            tipo: 'normal',
            glosa: `CIF ${concepto} (gasto) - ${ot.numero_ot}`,
            lineas: [
                { cuenta: cuentaHaber, nombre: nombreHaber,                                        debe: monto, haber: 0 },
                { cuenta: '421',       nombre: 'Facturas, Boletas y Otros Comprobantes por Pagar', debe: 0,     haber: monto }
            ],
            estado: 'validado'
        });

        // 2. Destino al mayor de fábrica (923 CIF) y aplicación a la OT (23 Productos en Proceso)
        const numAsiento2 = await obtenerSiguienteNumAsiento();
        await DB.insert('asientos', {
            numero: numAsiento2,
            fecha,
            tipo: 'normal',
            glosa: `Destino CIF ${concepto} (inductor: ${inductor}) a ${ot.numero_ot}`,
            lineas: [
                { cuenta: '923', nombre: 'Costos Indirectos de Fabricación',              debe: monto, haber: 0 },
                { cuenta: '791', nombre: 'Cargas Imputables a Cuentas de Costos y Gastos', debe: 0,     haber: monto },
                { cuenta: '231', nombre: 'Productos en Proceso - Costo',                  debe: monto, haber: 0 },
                { cuenta: '923', nombre: 'Costos Indirectos de Fabricación',              debe: 0,     haber: monto }
            ],
            estado: 'validado'
        });

        await recalcularCostosOT(otActualId);
        closeModal('modalAsignarCIF');
        await verDetalleOT(otActualId);
        await renderOrdenes();
        showAlert(`✅ CIF asignado · Asientos ${numAsiento} (gasto) y ${numAsiento2} (mayor de fábrica → OT)`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}
async function eliminarCIF(id) {
    if (!confirm('¿Eliminar este CIF?')) return;
    try {
        await DB.delete('otCif', id);
        await recalcularCostosOT(otActualId);
        await verDetalleOT(otActualId);
        await renderOrdenes();
        showAlert('CIF eliminado', 'success');
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== CERRAR OT ====================
async function cerrarOT(otId) {
    if (!confirm('¿Cerrar esta Orden de Trabajo?\n\nUna vez cerrada no se podrán agregar más costos.')) return;

    try {
        const ordenes = await DB.getAll('ordenesTrabajo');
        const ot = ordenes.find(o => o.id === otId);
        
        await DB.update('ordenesTrabajo', otId, {
            estado: 'terminada',
            fecha_fin: new Date().toISOString().split('T')[0]
        });

        const costoTotal = Number(ot.costo_total) || 0;

        if (costoTotal > 0) {
            const numAsiento = await obtenerSiguienteNumAsiento();

            await DB.insert('asientos', {
                numero: numAsiento,
                fecha: new Date().toISOString().split('T')[0],
                tipo: 'normal',
                glosa: `Traspaso PP → PT de ${ot.numero_ot}`,
                lineas: [
                    { cuenta: '211', nombre: 'Productos Terminados - Costo', debe: costoTotal, haber: 0 },
                    { cuenta: '231', nombre: 'Productos en Proceso - Costo', debe: 0,          haber: costoTotal }
                ],
                estado: 'validado'
            });

            await verDetalleOT(otId);
            await renderOrdenes();
            showAlert(`✅ OT ${ot.numero_ot} cerrada · Asiento ${numAsiento} generado`, 'success');
        } else {
            await verDetalleOT(otId);
            await renderOrdenes();
            showAlert(`✅ OT ${ot.numero_ot} cerrada (sin costo)`, 'success');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cerrar OT: ' + error.message, 'error');
    }
}
// ==================== REGISTRAR VENTA ====================
async function abrirModalRegistrarVenta() {
    if (!otActualId) return;
    
    const ordenes = await DB.getAll('ordenesTrabajo');
    const ot = ordenes.find(o => o.id === otActualId);
    document.getElementById('ventaOTNumero').textContent = ot.numero_ot;
    
    document.getElementById('ventaFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('ventaTipoPago').value = 'contado';
    document.getElementById('ventaMonto').value = '';
    
    openModal('modalRegistrarVenta');
}

async function guardarVenta() {
    if (!otActualId) return;
    
    const fecha = document.getElementById('ventaFecha').value;
    const tipoPago = document.getElementById('ventaTipoPago').value;
    const monto = parseFloat(document.getElementById('ventaMonto').value) || 0;

    if (!fecha) { showAlert('Ingrese la fecha', 'error'); return; }
    if (monto <= 0) { showAlert('El monto debe ser mayor a 0', 'error'); return; }

    try {
        const ordenes = await DB.getAll('ordenesTrabajo');
        const ot = ordenes.find(o => o.id === otActualId);
        
        const ventas = await DB.getAll('otVentas');
        const ventaExistente = ventas.find(v => v.ot_id === otActualId);

        if (ventaExistente) {
            await DB.update('otVentas', ventaExistente.id, {
                fecha, monto, tipo_pago: tipoPago
            });
        } else {
            await DB.insert('otVentas', {
                ot_id: otActualId,
                fecha,
                monto,
                tipo_pago: tipoPago
            });
        }

        // Asiento 1: Venta
        const numAsiento1 = await obtenerSiguienteNumAsiento();
        const igv = monto * 0.18;
        const base = monto - igv;
        const cuentaDebe = tipoPago === 'contado' ? '101' : '121';
        const nombreDebe = tipoPago === 'contado' ? 'Caja' : 'Facturas por Cobrar';

        await DB.insert('asientos', {
            numero: numAsiento1,
            fecha,
            tipo: 'normal',
            glosa: `Venta según ${ot.numero_ot}`,
            lineas: [
                { cuenta: cuentaDebe, nombre: nombreDebe, debe: monto, haber: 0 },
                { cuenta: '401', nombre: 'IGV',            debe: 0,     haber: igv },
                { cuenta: '701', nombre: 'Mercaderías',    debe: 0,     haber: base }
            ],
            estado: 'validado'
        });

        // Asiento 2: Costo de ventas
        const costoTotal = Number(ot.costo_total) || 0;
        let numAsiento2 = '';

        if (costoTotal > 0) {
            numAsiento2 = await obtenerSiguienteNumAsiento();

            await DB.insert('asientos', {
                numero: numAsiento2,
                fecha,
                tipo: 'normal',
                glosa: `Costo de venta ${ot.numero_ot}`,
                lineas: [
                    { cuenta: '691', nombre: 'Costo de Mercaderías Vendidas', debe: costoTotal, haber: 0 },
                    { cuenta: '211', nombre: 'Productos Terminados - Costo',  debe: 0,          haber: costoTotal }
                ],
                estado: 'validado'
            });
        }

        closeModal('modalRegistrarVenta');
        await verDetalleOT(otActualId);
        showAlert(`✅ Venta registrada · Asientos ${numAsiento1}${numAsiento2 ? ' y ' + numAsiento2 : ''} generados`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}
// ==================== RECALCULAR COSTOS ====================
async function recalcularCostosOT(otId) {
    await actualizarCostosOT(otId);  // js/kardex-mp.js
}

// ==================== ELIMINAR OT ====================
async function eliminarOT(id) {
    if (!confirm('¿Eliminar esta OT completa? Se borrarán TODOS sus costos.')) return;
    if (!confirm('Esta acción no se puede deshacer. ¿Continuar?')) return;

    try {
        const ordenes = await DB.getAll('ordenesTrabajo');
        const ot = ordenes.find(o => o.id === id);

        // Eliminar dependencias
        const [mp, mo, cif, ventas] = await Promise.all([
            DB.getAll('otMateriaPrima'),
            DB.getAll('otManoObra'),
            DB.getAll('otCif'),
            DB.getAll('otVentas')
        ]);

        for (const m of mp.filter(x => x.ot_id === id)) await DB.delete('otMateriaPrima', m.id);
        for (const m of mo.filter(x => x.ot_id === id)) await DB.delete('otManoObra', m.id);
        for (const m of cif.filter(x => x.ot_id === id)) await DB.delete('otCif', m.id);
        for (const m of ventas.filter(x => x.ot_id === id)) await DB.delete('otVentas', m.id);

        await DB.delete('ordenesTrabajo', id);

        if (otActualId === id) cerrarDetalleOT();
        await renderOrdenes();
        showAlert(`✅ OT ${ot.numero_ot} eliminada`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== FILTROS Y EXPORTAR ====================
function filterOrdenes() {
    const search = (document.getElementById('searchOT')?.value || '').toLowerCase();
    const estado = document.getElementById('filterEstadoOT')?.value || '';

    document.querySelectorAll('#otTable tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        let visible = text.includes(search);
        if (estado && !text.includes(estado)) visible = false;
        row.style.display = visible ? '' : 'none';
    });
}

async function exportarOTCSV() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    let csv = '\uFEFFN° OT;Descripción;Inicio;Fin;Unidades;Costo MP;Costo MOD;Costo CIF;Costo Total;Costo Unit;Estado\n';
    ordenes.forEach(o => {
        csv += `"${o.numero_ot}";"${o.descripcion || ''}";"${o.fecha_inicio || ''}";"${o.fecha_fin || ''}";${o.unidades_producidas};${o.costo_mp};${o.costo_mod};${o.costo_cif};${o.costo_total};${o.costo_unitario};"${o.estado}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ordenes-trabajo.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}