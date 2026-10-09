// ==================== LIBROS - TODAS LAS FUNCIONES ====================

// ==================== INIT ====================
async function initLibros() {
    console.log('📚 Iniciando módulo Libros...');
    try {
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

// ==================== LIBRO DIARIO ====================
// Formato clásico: fecha combinada por asiento, Nº de cuenta, descripción y montos con "S/"
async function generarLibroDiario() {
    const tbody = document.getElementById('libroDiarioTable');
    const tfoot = document.getElementById('libroDiarioTotales');
    try {
        const [asientos, cuentas] = await Promise.all([DB.getAll('asientos'), DB.getAll('cuentas')]);
        const desde = document.getElementById('libroDiarioDesde')?.value || '2026-01-01';
        const hasta = document.getElementById('libroDiarioHasta')?.value || '2026-12-31';
        const filtered = asientos
            .filter(a => a.fecha >= desde && a.fecha <= hasta)
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.numero).localeCompare(String(b.numero)));

        const empresa = document.getElementById('libroDiarioEmpresa');
        if (empresa) empresa.textContent = document.querySelector('.header .company-name')?.textContent.trim() || '';

        const nombres = {};
        cuentas.forEach(c => nombres[c.codigo] = c.nombre);

        const monto = n => n > 0
            ? `<div><span>S/</span><span>${fmtMayor(n)}</span></div>`
            : '';

        let html = '', totalDebe = 0, totalHaber = 0;
        filtered.forEach(a => {
            const lineas = (a.lineas || []).filter(l => l.cuenta);
            if (lineas.length === 0) return;
            const [anio, mes, dia] = a.fecha.split('-');

            lineas.forEach((l, i) => {
                const debe = Number(l.debe) || 0;
                const haber = Number(l.haber) || 0;
                totalDebe += debe;
                totalHaber += haber;
                html += `<tr class="${i === 0 ? 'ld-inicio' : ''}">
                    ${i === 0 ? `<td class="ld-fecha" rowspan="${lineas.length}" title="${textCell(a.glosa || '')}">
                        ${dia}/${mes}/${anio}<small>${textCell(a.numero)}</small>
                    </td>` : ''}
                    <td class="ld-cta">${textCell(l.cuenta)}</td>
                    <td class="ld-desc">${textCell(nombres[l.cuenta] || l.nombre || '')}</td>
                    <td class="ld-monto">${monto(debe)}</td>
                    <td class="ld-monto">${monto(haber)}</td>
                </tr>`;
            });
        });

        tbody.innerHTML = html || '<tr><td colspan="5" class="ld-vacio">Sin registros para el rango seleccionado</td></tr>';
        if (tfoot) {
            tfoot.innerHTML = html ? `<tr>
                <td colspan="3" class="ld-total-label">TOTALES</td>
                <td class="ld-monto">${monto(totalDebe)}</td>
                <td class="ld-monto">${monto(totalHaber)}</td>
            </tr>` : '';
        }
        console.log(`✅ Libro Diario: ${filtered.length} asientos mostrados`);
    } catch (error) {
        console.error('Error generando Libro Diario:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="ld-vacio" style="color:#c00;">Error: ${textCell(error.message)}</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
    }
}

// ==================== LIBRO MAYOR · CUENTAS T ====================
// Mismo formato que el Mayor de Fábrica del Sistema de Órdenes, con todas las cuentas

const MESES_MAYOR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

function fmtMayor(n) {
    return Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function nombreMesMayor(fecha) {
    const [anio, mes] = fecha.split('-');
    return `${MESES_MAYOR[Number(mes) - 1] || mes} ${anio}`;
}

// Arma las cuentas T (debe/haber de cada cuenta) a partir de los asientos del rango
async function construirCuentasT() {
    const [asientos, todas] = await Promise.all([DB.getAll('asientos'), DB.getAll('cuentas')]);
    const desde = document.getElementById('mayorDesde')?.value || '2026-01-01';
    const hasta = document.getElementById('mayorHasta')?.value || '2026-12-31';

    const catalogo = {};
    todas.forEach(c => catalogo[c.codigo] = c);

    const cuentasT = {};
    const obtenerCuenta = (codigo, nombre) => {
        if (!cuentasT[codigo]) {
            cuentasT[codigo] = {
                codigo,
                nombre: catalogo[codigo]?.nombre || nombre || '',
                debe: [],
                haber: []
            };
        }
        return cuentasT[codigo];
    };

    asientos
        .filter(a => a.fecha && a.fecha >= desde && a.fecha <= hasta)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.numero).localeCompare(String(b.numero)))
        .forEach(a => {
            (a.lineas || []).forEach(l => {
                if (!l.cuenta) return;
                const cta = obtenerCuenta(l.cuenta, l.nombre);
                const mov = { fecha: a.fecha, numero: a.numero, glosa: a.glosa || '' };
                const debe = Number(l.debe) || 0;
                const haber = Number(l.haber) || 0;
                if (debe > 0) cta.debe.push({ ...mov, monto: debe });
                if (haber > 0) cta.haber.push({ ...mov, monto: haber });
            });
        });

    if (document.getElementById('mayorSinMovimiento')?.checked) {
        todas.filter(c => !c.es_padre).forEach(c => obtenerCuenta(c.codigo, c.nombre));
    }

    return Object.values(cuentasT).sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));
}

// Agrupa los movimientos de un lado (debe/haber) por mes; un mes con un solo movimiento va como fila simple
function agruparPorMes(movimientos) {
    const grupos = {};
    movimientos.forEach(m => {
        const key = m.fecha.substring(0, 7);
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(m);
    });

    return Object.keys(grupos).sort().map(key => {
        const movs = grupos[key];
        const total = movs.reduce((s, m) => s + m.monto, 0);
        if (movs.length === 1) {
            const m = movs[0];
            return { tipo: 'simple', detalle: `${m.fecha.substring(8, 10)}/${m.fecha.substring(5, 7)} · ${m.numero}`, titulo: m.glosa, monto: total };
        }
        return {
            tipo: 'agrupado',
            detalle: `${nombreMesMayor(key)} (${movs.length})`,
            monto: total,
            hijos: movs.map(m => ({
                detalle: `${m.fecha.substring(8, 10)}/${m.fecha.substring(5, 7)} · ${m.numero}`,
                titulo: m.glosa,
                monto: m.monto
            }))
        };
    });
}

async function generarLibroMayor() {
    const container = document.getElementById('mayorGrid');
    if (!container) return;

    try {
        const buscar = (document.getElementById('mayorBuscar')?.value || '').trim().toLowerCase();
        const cuentasT = (await construirCuentasT()).filter(c =>
            !buscar || String(c.codigo).toLowerCase().includes(buscar) || c.nombre.toLowerCase().includes(buscar)
        );

        // Resumen: total debe = total haber si los asientos cuadran
        const sumaDebe = cuentasT.reduce((s, c) => s + c.debe.reduce((t, d) => t + d.monto, 0), 0);
        const sumaHaber = cuentasT.reduce((s, c) => s + c.haber.reduce((t, h) => t + h.monto, 0), 0);
        const cuadra = Math.abs(sumaDebe - sumaHaber) < 0.01;
        const resumen = document.getElementById('mayorResumen');
        if (resumen) {
            resumen.innerHTML = `
                <span>Cuentas: <strong>${cuentasT.length}</strong></span>
                <span>Total Debe: <strong>S/ ${fmtMayor(sumaDebe)}</strong></span>
                <span>Total Haber: <strong>S/ ${fmtMayor(sumaHaber)}</strong></span>
                ${buscar ? '' : `<span class="${cuadra ? 'cuadra' : 'no-cuadra'}">${cuadra ? '✅ Debe y Haber cuadran' : '⚠️ Debe y Haber no cuadran'}</span>`}
            `;
        }

        if (cuentasT.length === 0) {
            container.innerHTML = '<div class="mayor-vacio">Sin movimientos para el rango o búsqueda seleccionados</div>';
            return;
        }

        let rowIdCounter = 0;

        const renderFila = (fila, ctaIndex, lado) => {
            const id = `mayor-${ctaIndex}-${lado}-${rowIdCounter++}`;
            if (fila.tipo === 'agrupado') {
                return `
                    <div class="cuenta-t-row cuenta-t-row-agrupado" onclick="toggleFilaMayor('${id}')">
                        <span class="cuenta-t-row-arrow" id="${id}-arrow">▶</span>
                        <span class="cuenta-t-row-detalle">${textCell(fila.detalle)}</span>
                        <span class="cuenta-t-row-monto">${fmtMayor(fila.monto)}</span>
                    </div>
                    <div class="cuenta-t-hijos" id="${id}-hijos" style="display:none;">
                        ${fila.hijos.map(h => `
                            <div class="cuenta-t-row cuenta-t-row-hijo" title="${textCell(h.titulo)}">
                                <span class="cuenta-t-row-detalle">${textCell(h.detalle)}</span>
                                <span class="cuenta-t-row-monto">${fmtMayor(h.monto)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            return `
                <div class="cuenta-t-row" title="${textCell(fila.titulo)}">
                    <span class="cuenta-t-row-detalle">${textCell(fila.detalle)}</span>
                    <span class="cuenta-t-row-monto">${fmtMayor(fila.monto)}</span>
                </div>
            `;
        };

        container.innerHTML = cuentasT.map((cta, ctaIndex) => {
            const debe = agruparPorMes(cta.debe);
            const haber = agruparPorMes(cta.haber);
            const totalDebe = cta.debe.reduce((s, d) => s + d.monto, 0);
            const totalHaber = cta.haber.reduce((s, h) => s + h.monto, 0);
            const saldo = totalDebe - totalHaber;
            const claseSaldo = Math.abs(saldo) < 0.005 ? 'saldo-cero' : (saldo > 0 ? 'saldo-deudor' : 'saldo-acreedor');
            const textoSaldo = claseSaldo === 'saldo-cero' ? 'Saldo' : (saldo > 0 ? 'Saldo Deudor' : 'Saldo Acreedor');

            return `
                <div class="cuenta-t">
                    <div class="cuenta-t-header">
                        <span class="cuenta-t-codigo">${textCell(cta.codigo)}</span>
                        <span class="cuenta-t-nombre">${textCell(cta.nombre)}</span>
                    </div>
                    <div class="cuenta-t-body">
                        <div class="cuenta-t-col">
                            <div class="cuenta-t-titulo">DEBE</div>
                            ${debe.length > 0
                                ? debe.map(d => renderFila(d, ctaIndex, 'debe')).join('')
                                : '<div class="cuenta-t-empty">—</div>'}
                            <div class="cuenta-t-row cuenta-t-total">
                                <span>TOTAL</span>
                                <span>${fmtMayor(totalDebe)}</span>
                            </div>
                        </div>
                        <div class="cuenta-t-col">
                            <div class="cuenta-t-titulo">HABER</div>
                            ${haber.length > 0
                                ? haber.map(h => renderFila(h, ctaIndex, 'haber')).join('')
                                : '<div class="cuenta-t-empty">—</div>'}
                            <div class="cuenta-t-row cuenta-t-total">
                                <span>TOTAL</span>
                                <span>${fmtMayor(totalHaber)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="cuenta-t-saldo ${claseSaldo}">
                        <span>${textoSaldo}:</span>
                        <strong>${fmtMayor(Math.abs(saldo))}</strong>
                    </div>
                </div>
            `;
        }).join('');

        console.log(`✅ Libro Mayor: ${cuentasT.length} cuentas T`);
    } catch (error) {
        console.error('Error generando Libro Mayor:', error);
        container.innerHTML = `<div class="mayor-vacio" style="color:#c00;">Error: ${textCell(error.message)}</div>`;
    }
}

function toggleFilaMayor(id) {
    const hijos = document.getElementById(id + '-hijos');
    const arrow = document.getElementById(id + '-arrow');
    if (!hijos) return;

    const abierto = hijos.style.display !== 'none';
    hijos.style.display = abierto ? 'none' : 'block';
    if (arrow) arrow.textContent = abierto ? '▶' : '▼';
}

async function exportarMayorCSV() {
    const cuentasT = await construirCuentasT();
    const limpiar = s => String(s ?? '').replace(/"/g, '""');
    let csv = '﻿Cuenta;Nombre;Fecha;N° Asiento;Glosa;Debe;Haber\n';

    cuentasT.forEach(c => {
        const movs = [
            ...c.debe.map(d => ({ ...d, debe: d.monto, haber: 0 })),
            ...c.haber.map(h => ({ ...h, debe: 0, haber: h.monto }))
        ].sort((a, b) => a.fecha.localeCompare(b.fecha));
        movs.forEach(m => {
            csv += `"${limpiar(c.codigo)}";"${limpiar(c.nombre)}";${m.fecha};"${limpiar(m.numero)}";"${limpiar(m.glosa)}";${m.debe.toFixed(2)};${m.haber.toFixed(2)}\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'libro-mayor.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Libro Mayor exportado', 'success');
}

// ==================== COMPRAS ====================
async function guardarCompra() {
    try {
        // ==================== 1. RECOGER DATOS DEL FORMULARIO ====================
        const fecha = document.getElementById('compraFecha').value;
        const proveedor = document.getElementById('compraProveedor').value.trim();
        const ruc = document.getElementById('compraRuc').value.trim();
        const tipo = document.getElementById('compraTipo').value;
        const numero = document.getElementById('compraNumero').value.trim();
        const base = parseFloat(document.getElementById('compraBase').value) || 0;
        const igv = parseFloat(document.getElementById('compraIgv').value) || 0;
        const total = parseFloat(document.getElementById('compraTotal').value) || 0;
        
        // Datos del producto para Kardex
        const producto_codigo = document.getElementById('compraProducto').value;
        const cantidad = parseFloat(document.getElementById('compraCantidad').value) || 0;
        const costoUnit = parseFloat(document.getElementById('compraCostoUnit').value) || 0;
        
        // ==================== 2. VALIDACIONES ====================
        if (!fecha) { showAlert('Ingrese la fecha', 'error'); return; }
        if (!proveedor) { showAlert('Ingrese el proveedor', 'error'); return; }
        if (base <= 0) { showAlert('Ingrese la base imponible', 'error'); return; }
        if (!producto_codigo) { showAlert('Seleccione el producto que ingresa al almacén', 'error'); return; }
        if (cantidad <= 0) { showAlert('La cantidad debe ser mayor a 0', 'error'); return; }
        if (costoUnit <= 0) { showAlert('El costo unitario debe ser mayor a 0', 'error'); return; }
        
        // ==================== 3. GUARDAR COMPRA ====================
        await DB.insert('compras', {
            fecha, proveedor, ruc, tipo, numero, base, igv, total
        });
        
        // ==================== 4. CREAR ASIENTO CONTABLE ====================
        const asientos = await DB.getAll('asientos');
        const numAsiento = 'AS-' + String(asientos.length + 1).padStart(3, '0');
        
        await DB.insert('asientos', {
            numero: numAsiento,
            fecha,
            tipo: 'normal',
            glosa: `Compra según ${numero} - ${proveedor}`,
            lineas: [
                { cuenta: '201', nombre: 'Mercaderías - Costo', debe: base, haber: 0 },
                { cuenta: '401', nombre: 'IGV', debe: igv, haber: 0 },
                { cuenta: '421', nombre: 'Facturas por Pagar', debe: 0, haber: total }
            ],
            estado: 'validado'
        });
        
        // ==================== 5. CREAR ENTRADA EN KARDEX ====================
        const productos = await DB.getAll('productos');
        const mercaderias = await DB.getAll('mercaderias');
        const prod = productos.find(p => p.codigo === producto_codigo)
                  || mercaderias.find(m => m.codigo === producto_codigo);
        const producto_nombre = prod ? (prod.nombre || prod.descripcion) : producto_codigo;
        
        // Calcular saldo actual del producto
        const kardexs = await DB.getAll('kardex');
        const delProducto = kardexs
            .filter(k => k.producto_codigo === producto_codigo)
            .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
        
        let saldoCant = 0, saldoTotal = 0;
        if (delProducto.length > 0) {
            const ultimo = delProducto[delProducto.length - 1];
            saldoCant = Number(ultimo.saldo_cantidad) || 0;
            saldoTotal = Number(ultimo.saldo_total) || 0;
        }
        
        const costoTotal = cantidad * costoUnit;
        const nuevoSaldoCant = saldoCant + cantidad;
        const nuevoSaldoTotal = saldoTotal + costoTotal;
        const nuevoCostoProm = nuevoSaldoCant > 0 ? nuevoSaldoTotal / nuevoSaldoCant : 0;
        
        await DB.insert('kardex', {
            producto_codigo,
            producto_nombre,
            fecha,
            tipo_movimiento: 'entrada',
            documento: numero,
            descripcion: `Compra según ${numero} - ${proveedor}`,
            cantidad,
            costo_unitario: costoUnit,
            costo_total: costoTotal,
            saldo_cantidad: nuevoSaldoCant,
            saldo_costo_unitario: nuevoCostoProm,
            saldo_total: nuevoSaldoTotal,
            metodo_valorizacion: 'promedio',
            asiento_id: null
        });
        
        // ==================== 6. ACTUALIZAR STOCK DEL PRODUCTO ====================
        if (prod) {
            const tabla = productos.includes(prod) ? 'productos' : 'mercaderias';
            const updateData = { stock: nuevoSaldoCant };
            if (tabla === 'mercaderias') {
                updateData.costo = nuevoCostoProm;
            }
            await DB.update(tabla, prod.id, updateData);
        }
        
        // ==================== 7. CERRAR Y REFRESCAR ====================
        closeModal('modalCompra');
        await renderCompras();
        await renderInventarios();
        
        showAlert(`✅ Compra registrada · Asiento ${numAsiento} + Entrada Kardex`, 'success');
        
    } catch (error) {
        console.error('Error guardando compra:', error);
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
            tbody.innerHTML = '<tr><td colspan="16" style="text-align:center; color:#999;">Sin planillas registradas</td></tr>';
            return;
        }

        const HORAS_MES = 240;
        const ordenadas = planillas.sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));

        tbody.innerHTML = ordenadas.map(p => {
            const sueldo    = Number(p.sueldo_basico) || 0;
            const asigFam   = Number(p.asignacion_familiar) || 0;
            const bonif     = Number(p.bonificacion) || 0;
            const gratif    = (Number(p.gratificacion_julio) || 0) + (Number(p.gratificacion_diciembre) || 0);
            const bruto     = Number(p.total_bruto) || 0;
            const onp       = Number(p.descuento_onp) || 0;
            const afp       = Number(p.descuento_afp) || 0;
            const ir        = Number(p.descuento_ir) || 0;
            const neto      = Number(p.total_neto) || 0;
            const essalud   = Number(p.essalud) || 0;
            const cts       = Number(p.cts) || 0;
            const costo     = Number(p.costo_total_empleador) || 0;
            const costoHora = costo / HORAS_MES;

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
                <td style="text-align:right; color:#12589b; font-weight:700;">${costo.toFixed(2)}</td>
                <td style="text-align:right; color:#7c3aed; font-weight:600;">${costoHora.toFixed(2)}</td>
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
    
    if (tabId === 'lib-mayor') generarLibroMayor();
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
// ==================== MODAL DE COMPRA CON KARDEX ====================

async function abrirModalCompra() {
    // Cargar productos en el select
    await cargarProductosEnSelectCompras();
    
    // Resetear formulario
    document.getElementById('compraFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('compraProveedor').value = '';
    document.getElementById('compraRuc').value = '';
    document.getElementById('compraNumero').value = '';
    document.getElementById('compraProducto').value = '';
    document.getElementById('compraCantidad').value = '1';
    document.getElementById('compraCostoUnit').value = '';
    document.getElementById('compraBase').value = '';
    document.getElementById('compraIgv').value = '';
    document.getElementById('compraTotal').value = '';
    
    openModal('modalCompra');
}

async function cargarProductosEnSelectCompras() {
    try {
        const productos = await DB.getAll('productos');
        const mercaderias = await DB.getAll('mercaderias');
        
        const todos = [
            ...productos.map(p => ({ codigo: p.codigo, nombre: p.nombre, tipo: 'Producto', precio: p.precio })),
            ...mercaderias.map(m => ({ codigo: m.codigo, nombre: m.descripcion, tipo: 'Mercadería', precio: m.costo }))
        ];
        
        const options = todos.map(p =>
            `<option value="${textCell(p.codigo)}" data-precio="${p.precio || 0}" data-tipo="${p.tipo}">${textCell(p.codigo)} - ${textCell(p.nombre)} (${p.tipo})</option>`
        ).join('');
        
        const select = document.getElementById('compraProducto');
        if (select) select.innerHTML = '<option value="">Seleccione producto...</option>' + options;
        
        console.log(`✅ ${todos.length} productos cargados en select de compras`);
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

async function onProductoCompraChange() {
    const select = document.getElementById('compraProducto');
    const option = select.options[select.selectedIndex];
    const precio = parseFloat(option?.dataset?.precio) || 0;
    
    if (precio > 0) {
        document.getElementById('compraCostoUnit').value = precio.toFixed(2);
        calcCompraDesdeCosto();
    }
}

function calcCompraDesdeCosto() {
    const cantidad = parseFloat(document.getElementById('compraCantidad').value) || 0;
    const costoUnit = parseFloat(document.getElementById('compraCostoUnit').value) || 0;
    const base = cantidad * costoUnit;
    
    document.getElementById('compraBase').value = base.toFixed(2);
    calcCompraIGV();
}