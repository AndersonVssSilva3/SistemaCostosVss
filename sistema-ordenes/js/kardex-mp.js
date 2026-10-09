// ==================== KARDEX DE MATERIA PRIMA (compartido) ====================
// Una MP = un kardex y una cuenta T (24).
//   Entradas: compras de MP (tabla kardex, tipo_movimiento 'entrada').
//   Salidas:  consumos de MP en las órdenes de trabajo (tabla ot_materia_prima).
// Método de valorización: costo promedio ponderado.

const IGV_TASA = 0.18;

async function siguienteNumeroAsiento() {
    const asientos = await DB.getAll('asientos');
    let maxNum = 0;
    asientos.forEach(a => {
        const m = String(a.numero || '').match(/^AS-(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    return 'AS-' + String(maxNum + 1).padStart(3, '0');
}

// Movimientos del kardex de una MP, en orden cronológico y con saldos.
// El saldo inicial es lo que cuadra el stock actual del catálogo con las entradas y salidas registradas.
function movimientosKardexMP(mp, kardex, asignaciones, ordenes) {
    const otMap = {};
    ordenes.forEach(o => otMap[o.id] = o.numero_ot);

    const entradas = kardex
        .filter(k => k.producto_codigo === mp.codigo && k.tipo_movimiento === 'entrada')
        .map(k => ({
            fecha: k.fecha,
            orden: k.created_at || k.fecha,
            tipo: 'entrada',
            detalle: k.descripcion || `Compra ${k.documento || ''}`,
            documento: k.documento || '',
            cantidad: Number(k.cantidad) || 0,
            costoUnit: Number(k.costo_unitario) || 0,
            total: Number(k.costo_total) || (Number(k.cantidad) * Number(k.costo_unitario)) || 0
        }));

    const salidas = asignaciones
        .filter(a => a.materia_prima_codigo === mp.codigo)
        .map(a => ({
            fecha: String(a.created_at || '').substring(0, 10),
            orden: a.created_at || '',
            tipo: 'salida',
            detalle: `Consumo en ${otMap[a.ot_id] || 'OT'}`,
            documento: otMap[a.ot_id] || '',
            otId: a.ot_id,
            cantidad: Number(a.cantidad) || 0,
            costoUnit: Number(a.costo_unitario) || 0,
            total: Number(a.costo_total) || (Number(a.cantidad) * Number(a.costo_unitario)) || 0
        }));

    const totalEntradas = entradas.reduce((s, e) => s + e.cantidad, 0);
    const totalSalidas = salidas.reduce((s, e) => s + e.cantidad, 0);
    const stockActual = Number(mp.stock) || 0;
    const cantInicial = stockActual - totalEntradas + totalSalidas;
    const cuInicial = salidas[0]?.costoUnit || Number(mp.costo_unitario) || 0;

    const movs = [...entradas, ...salidas].sort((a, b) =>
        String(a.fecha).localeCompare(String(b.fecha)) || String(a.orden).localeCompare(String(b.orden))
    );

    let saldoCant = cantInicial;
    let saldoValor = cantInicial * cuInicial;
    const filas = [{
        fecha: movs[0]?.fecha || '',
        tipo: 'inicial',
        detalle: 'Saldo inicial',
        documento: '',
        cantidad: cantInicial,
        costoUnit: cuInicial,
        total: saldoValor,
        saldoCant,
        saldoCU: cuInicial,
        saldoValor
    }];

    movs.forEach(m => {
        if (m.tipo === 'entrada') {
            saldoCant += m.cantidad;
            saldoValor += m.total;
        } else {
            saldoCant -= m.cantidad;
            saldoValor -= m.total;
        }
        filas.push({
            ...m,
            saldoCant,
            saldoCU: saldoCant !== 0 ? saldoValor / saldoCant : 0,
            saldoValor
        });
    });

    return { filas, entradas, salidas, inicial: filas[0] };
}

// Recalcula MP + MO + CIF de una OT (lo usan Materia Prima y Órdenes)
async function actualizarCostosOT(otId) {
    const [mp, mo, cif, ordenes] = await Promise.all([
        DB.getAll('otMateriaPrima'),
        DB.getAll('otManoObra'),
        DB.getAll('otCif'),
        DB.getAll('ordenesTrabajo')
    ]);
    const id = Number(otId);
    const costoMP = mp.filter(m => m.ot_id === id).reduce((s, m) => s + Number(m.costo_total || 0), 0);
    const costoMO = mo.filter(m => m.ot_id === id).reduce((s, m) => s + Number(m.monto || 0), 0);
    const costoCIF = cif.filter(c => c.ot_id === id).reduce((s, c) => s + Number(c.monto || 0), 0);
    const costoTotal = costoMP + costoMO + costoCIF;

    const ot = ordenes.find(o => o.id === id);
    const unidades = Number(ot?.unidades_producidas) || 0;

    await DB.update('ordenesTrabajo', id, {
        costo_mp: costoMP,
        costo_mod: costoMO,
        costo_cif: costoCIF,
        costo_total: costoTotal,
        costo_unitario: unidades > 0 ? costoTotal / unidades : 0
    });
}

// Asiento del consumo de MP en una OT: sale de la cuenta 24 y entra a la 23
async function registrarAsientoConsumoMP(codigo, numeroOT, costoTotal) {
    const numero = await siguienteNumeroAsiento();
    await DB.insert('asientos', {
        numero,
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'normal',
        glosa: `Consumo MP ${codigo} en ${numeroOT}`,
        lineas: [
            { cuenta: '231', nombre: 'Productos en Proceso - Costo', debe: costoTotal, haber: 0 },
            { cuenta: '241', nombre: 'Materias Primas',              debe: 0,          haber: costoTotal }
        ],
        estado: 'validado'
    });
    return numero;
}

// Compra de MP: aumenta stock (costo promedio), entrada en kardex, Registro de Compras y asientos (60 → 24)
async function registrarCompraMP({ codigo, fecha, proveedor, ruc, documento, cantidad, costoUnit, conIGV, formaPago }) {
    const catalogo = await DB.getAll('materiaPrima');
    const mp = catalogo.find(m => m.codigo === codigo);
    if (!mp) throw new Error('Materia prima no encontrada');

    const base = Math.round(cantidad * costoUnit * 100) / 100;
    const igv = conIGV ? Math.round(base * IGV_TASA * 100) / 100 : 0;
    const total = base + igv;

    const stockAnterior = Math.max(Number(mp.stock) || 0, 0);
    const valorAnterior = stockAnterior * (Number(mp.costo_unitario) || 0);
    const nuevoStock = stockAnterior + cantidad;
    const nuevoCosto = nuevoStock > 0 ? (valorAnterior + base) / nuevoStock : costoUnit;

    // 1. Catálogo: stock y costo promedio
    await DB.update('materiaPrima', mp.id, {
        stock: nuevoStock,
        costo_unitario: Math.round(nuevoCosto * 10000) / 10000
    });

    // 2. Kardex: entrada
    await DB.insert('kardex', {
        producto_codigo: mp.codigo,
        producto_nombre: mp.descripcion,
        fecha,
        tipo_movimiento: 'entrada',
        documento,
        descripcion: `Compra MP ${documento} - ${proveedor}`,
        cantidad,
        costo_unitario: costoUnit,
        costo_total: base,
        saldo_cantidad: nuevoStock,
        saldo_costo_unitario: nuevoCosto,
        saldo_total: nuevoStock * nuevoCosto,
        metodo_valorizacion: 'promedio',
        asiento_id: null
    });

    // 3. Registro de Compras (lo ve el Libro de Compras del Sistema Contable)
    await DB.insert('compras', {
        fecha, proveedor, ruc, tipo: 'Factura', numero: documento, base, igv, total
    });

    // 4. Asiento de la compra (cuenta 60)
    const cuentaPago = formaPago === 'contado'
        ? { cuenta: '104', nombre: 'Cuentas Corrientes en Instituciones Financieras' }
        : { cuenta: '421', nombre: 'Facturas, Boletas y Otros Comprobantes por Pagar' };
    const lineasCompra = [{ cuenta: '602', nombre: 'Compras - Materias Primas', debe: base, haber: 0 }];
    if (igv > 0) lineasCompra.push({ cuenta: '401', nombre: 'IGV', debe: igv, haber: 0 });
    lineasCompra.push({ ...cuentaPago, debe: 0, haber: total });

    const asientoCompra = await siguienteNumeroAsiento();
    await DB.insert('asientos', {
        numero: asientoCompra,
        fecha,
        tipo: 'normal',
        glosa: `Compra de MP ${mp.codigo} según ${documento} - ${proveedor}`,
        lineas: lineasCompra,
        estado: 'validado'
    });

    // 5. Asiento de destino: la MP ingresa al almacén (cuenta 24)
    const asientoDestino = await siguienteNumeroAsiento();
    await DB.insert('asientos', {
        numero: asientoDestino,
        fecha,
        tipo: 'normal',
        glosa: `Ingreso al almacén de MP ${mp.codigo} según ${documento}`,
        lineas: [
            { cuenta: '241', nombre: 'Materias Primas',                debe: base, haber: 0 },
            { cuenta: '614', nombre: 'Variación de Materias Primas',   debe: 0,    haber: base }
        ],
        estado: 'validado'
    });

    return { asientoCompra, asientoDestino, nuevoStock, nuevoCosto, base, igv, total };
}
