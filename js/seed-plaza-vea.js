// ==================== SEED VSS FÁBRICA v2.0 - CONTABLEMENTE CORRECTO ====================
// Datos que CUADRAN: Activo = Pasivo + Patrimonio

const PV_MARKER = 'PV · ';

function pvFecha(anio, mes, dia) {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
function pvAleatorio(min, max) {
    return Math.random() * (max - min) + min;
}
function pvAleatorioInt(min, max) {
    return Math.floor(pvAleatorio(min, max + 1));
}
function pvElegir(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function pvRedondear(n) {
    return Math.round(n * 100) / 100;
}

// ==================== CATÁLOGOS ====================
const PV_CENTROS = [
    { codigo: 'CC-ABAR', nombre: 'Abarrotes',              responsable: 'Ing. Roberto Salinas', presupuesto: 2500000, gastado: 2180000 },
    { codigo: 'CC-PERE', nombre: 'Perecibles',             responsable: 'Ing. Carolina Vega',   presupuesto: 1800000, gastado: 1650000 },
    { codigo: 'CC-BAZA', nombre: 'Bazar y Electrohogar',   responsable: 'Lic. Diego Paredes',   presupuesto: 900000,  gastado: 720000 },
    { codigo: 'CC-LOGI', nombre: 'Logística y CD',         responsable: 'Ing. Patricia Ríos',   presupuesto: 1200000, gastado: 1080000 },
    { codigo: 'CC-ADMI', nombre: 'Administración',         responsable: 'CPC Fernando Loayza',  presupuesto: 750000,  gastado: 620000 },
    { codigo: 'CC-MKTG', nombre: 'Marketing y E-commerce', responsable: 'Lic. Valeria Castro',  presupuesto: 480000,  gastado: 395000 }
];

const PV_PRODUCTOS = [
    { codigo: 'PT-ABAR-001', nombre: 'Aceite Primor 1L',              categoria: 'Abarrotes',       precio: 12.90, stock: 2400 },
    { codigo: 'PT-ABAR-002', nombre: 'Arroz Costeño Extra 5kg',       categoria: 'Abarrotes',       precio: 28.50, stock: 1800 },
    { codigo: 'PT-ABAR-003', nombre: 'Fideo Don Vittorio 500g',       categoria: 'Abarrotes',       precio: 4.20,  stock: 3600 },
    { codigo: 'PT-ABAR-004', nombre: 'Atún Florida en aceite 170g',   categoria: 'Abarrotes',       precio: 8.90,  stock: 2200 },
    { codigo: 'PT-ABAR-005', nombre: 'Azúcar Rubia Cartavio 1kg',     categoria: 'Abarrotes',       precio: 5.80,  stock: 2800 },
    { codigo: 'PT-BEBI-001', nombre: 'Inca Kola 3L',                  categoria: 'Bebidas',         precio: 12.50, stock: 1500 },
    { codigo: 'PT-BEBI-002', nombre: 'Coca Cola 3L',                  categoria: 'Bebidas',         precio: 12.50, stock: 1400 },
    { codigo: 'PT-BEBI-003', nombre: 'Agua San Luis 2.5L',            categoria: 'Bebidas',         precio: 3.90,  stock: 3000 },
    { codigo: 'PT-LACT-001', nombre: 'Leche Gloria Evaporada 400g',   categoria: 'Lácteos',         precio: 5.20,  stock: 4200 },
    { codigo: 'PT-LACT-002', nombre: 'Yogurt Gloria Fresa 1L',        categoria: 'Lácteos',         precio: 7.80,  stock: 1200 },
    { codigo: 'PT-LACT-003', nombre: 'Queso Fresco Laive 250g',       categoria: 'Lácteos',         precio: 11.50, stock: 800 },
    { codigo: 'PT-LIMP-001', nombre: 'Detergente Bolívar 800g',       categoria: 'Limpieza',        precio: 15.90, stock: 1800 },
    { codigo: 'PT-LIMP-002', nombre: 'Papel Higiénico Suave 4 rollos',categoria: 'Limpieza',        precio: 9.80,  stock: 2500 },
    { codigo: 'PT-LIMP-003', nombre: 'Lejía Clorox 1L',               categoria: 'Limpieza',        precio: 6.50,  stock: 1600 },
    { codigo: 'PT-CUID-001', nombre: 'Shampoo Sedal 750ml',           categoria: 'Cuidado Personal',precio: 18.90, stock: 900 },
    { codigo: 'PT-CUID-002', nombre: 'Pasta Dental Colgate 90g',      categoria: 'Cuidado Personal',precio: 7.50,  stock: 1400 }
];

const PV_MERCADERIAS = [
    { codigo: 'MP-CARN-001', descripcion: 'Carne de res (corte industrial)',  unidad: 'KG', costo: 28.50 },
    { codigo: 'MP-CARN-002', descripcion: 'Pollo entero fresco',              unidad: 'KG', costo: 11.80 },
    { codigo: 'MP-CARN-003', descripcion: 'Cerdo (pierna industrial)',        unidad: 'KG', costo: 18.90 },
    { codigo: 'MP-FRUT-001', descripcion: 'Papa blanca (saco 50kg)',          unidad: 'KG', costo: 2.80 },
    { codigo: 'MP-FRUT-002', descripcion: 'Cebolla roja',                     unidad: 'KG', costo: 3.20 },
    { codigo: 'MP-FRUT-003', descripcion: 'Tomate italiano',                  unidad: 'KG', costo: 4.10 },
    { codigo: 'MP-FRUT-004', descripcion: 'Plátano de seda',                  unidad: 'KG', costo: 3.50 },
    { codigo: 'MP-PANA-001', descripcion: 'Pan francés (insumo panadería)',   unidad: 'KG', costo: 5.20 }
];

const PV_ACTIVOS = [
    { codigo: 'AF-001', descripcion: 'Local comercial Miraflores (Alquiler)',    fecha: '2024-01-15', costo: 3500000, dep: 875000 },
    { codigo: 'AF-002', descripcion: 'Cámaras frigoríficas perecibles',          fecha: '2024-03-20', costo: 480000,  dep: 120000 },
    { codigo: 'AF-003', descripcion: 'Flota de 12 camiones reparto',             fecha: '2024-06-10', costo: 1200000, dep: 300000 },
    { codigo: 'AF-004', descripcion: 'Sistema POS y servidores centrales',       fecha: '2025-01-05', costo: 850000,  dep: 141666 },
    { codigo: 'AF-005', descripcion: 'Mobiliario y góndolas de tienda',          fecha: '2024-08-01', costo: 620000,  dep: 155000 },
    { codigo: 'AF-006', descripcion: 'Montacargas de almacén (4 unidades)',      fecha: '2025-02-15', costo: 320000,  dep: 40000 }
];

const PV_PLANILLAS = [
    { codigo: 'EMP-001', nombre: 'Roberto Salinas Mendoza',    cargo: 'Gerente General',            sueldo: 18500 },
    { codigo: 'EMP-002', nombre: 'Carolina Vega Quispe',       cargo: 'Jefa de Perecibles',         sueldo: 8200 },
    { codigo: 'EMP-003', nombre: 'Diego Paredes Loayza',       cargo: 'Jefe de Bazar',              sueldo: 7500 },
    { codigo: 'EMP-004', nombre: 'Patricia Ríos Huamán',       cargo: 'Jefa de Logística',          sueldo: 8900 },
    { codigo: 'EMP-005', nombre: 'Fernando Loayza Castro',     cargo: 'Contador General',           sueldo: 9500 },
    { codigo: 'EMP-006', nombre: 'Valeria Castro Sánchez',     cargo: 'Jefa de Marketing',          sueldo: 8000 },
    { codigo: 'EMP-007', nombre: 'Marco Antonio Flores',       cargo: 'Supervisor de Cajas',        sueldo: 3800 },
    { codigo: 'EMP-008', nombre: 'Rosa Elvira Mamani',         cargo: 'Cajera Principal',           sueldo: 2200 },
    { codigo: 'EMP-009', nombre: 'Julio César Ramos',          cargo: 'Reponedor Abarrotes',        sueldo: 1850 },
    { codigo: 'EMP-010', nombre: 'Ana Lucía Ttito',            cargo: 'Auxiliar de Perecibles',     sueldo: 1750 },
    { codigo: 'EMP-011', nombre: 'Pedro Pablo Chávez',         cargo: 'Almacenero CD',              sueldo: 2100 },
    { codigo: 'EMP-012', nombre: 'Silvia Mendoza Rojas',       cargo: 'Asistente Administrativa',   sueldo: 2800 }
];

const PV_INDUCTORES = [
    { codigo: 'IND-01', inductor: 'Metros cuadrados de tienda',      unidad: 'm2',  valor: 4500 },
    { codigo: 'IND-02', inductor: 'Horas cajero',                    unidad: 'HC',  valor: 8500 },
    { codigo: 'IND-03', inductor: 'Kilovatios hora (refrigeración)', unidad: 'kWh', valor: 28500 },
    { codigo: 'IND-04', inductor: 'Unidades despachadas',            unidad: 'UND', valor: 48000 },
    { codigo: 'IND-05', inductor: 'Transacciones POS',               unidad: 'TXN', valor: 32000 }
];

const PV_REPUESTOS = [
    { codigo: 'REP-001', descripcion: 'Filtro de aceite camión Hyundai',    stock: 48, costo: 85.00 },
    { codigo: 'REP-002', descripcion: 'Neumático 295/80R22.5',              stock: 24, costo: 1250.00 },
    { codigo: 'REP-003', descripcion: 'Compresor de cámara frigorífica',    stock: 4,  costo: 3800.00 },
    { codigo: 'REP-004', descripcion: 'Batería 12V 100Ah',                  stock: 18, costo: 480.00 },
    { codigo: 'REP-005', descripcion: 'Faja de transmisión POS',            stock: 36, costo: 45.00 }
];

const PV_PROVEEDORES = [
    { nombre: 'Alicorp S.A.A.',                    ruc: '20100055237' },
    { nombre: 'Gloria S.A.',                       ruc: '20100190797' },
    { nombre: 'Backus y Johnston S.A.A.',          ruc: '20100114580' },
    { nombre: 'Coca-Cola Servicios del Perú',      ruc: '20331612731' },
    { nombre: 'Nestlé Perú S.A.',                  ruc: '20100111459' },
    { nombre: 'Unilever Andina Perú S.A.',         ruc: '20254928612' },
    { nombre: 'Kimberly Clark Perú S.A.',          ruc: '20100111597' },
    { nombre: 'Laive S.A.',                        ruc: '20100022481' },
    { nombre: 'Distribuidora Andina de Alimentos', ruc: '20512345678' },
    { nombre: 'Frigorífico del Pacífico S.A.C.',   ruc: '20458791234' }
];

const PV_CLIENTES = [
    { nombre: 'Restaurantes del Perú S.A.C.',       ruc: '20551122334' },
    { nombre: 'Hoteles Costa del Sol S.A.',         ruc: '20602233445' },
    { nombre: 'Catering Corporativo Lima EIRL',     ruc: '20413344556' },
    { nombre: 'Colegio San Agustín (Comedor)',      ruc: '20123456789' },
    { nombre: 'Clínica San Pablo S.A.C.',           ruc: '20524455667' },
    { nombre: 'Empresa Minera del Sur S.A.',        ruc: '20345566778' },
    { nombre: 'Distribuidora Mayorista Lima SAC',   ruc: '20656677889' },
    { nombre: 'Bodega Central Mayorista EIRL',      ruc: '20467788990' },
    { nombre: 'Consumidor Final - Boleta',          ruc: '00000000' },
    { nombre: 'Consumidor Final - Ticket',          ruc: '00000000' }
];

// ==================== FUNCIÓN PRINCIPAL ====================
async function cargarDatosPlazaVea() {
    if (!confirm('🏭 CARGA VSS FÁBRICA v2.0 (CONTABILIDAD CORRECTA)\n\n· Aporte de capital S/ 30M\n· Compras + entradas Kardex\n· Ventas + costo de ventas\n· Planillas, gastos, depreciaciones\n· Balance final CUADRADO\n\n¿Continuar?')) return;

    const status = document.getElementById('seedStatus');
    const setStatus = (msg, color = '#1765bc') => {
        if (status) status.innerHTML = `<div style="color:${color}; font-weight:600; padding:14px; background:#f0f7ff; border-radius:8px; margin-top:12px; border-left:4px solid ${color};">${msg}</div>`;
        console.log('[PV]', msg);
    };

    try {
        setStatus('🏭 Paso 1/7 · Insertando datos maestros...');
        await pvInsertarCentros();
        await pvInsertarProductos();
        await pvInsertarMercaderias();
        await pvInsertarActivos();
        await pvInsertarPlanillas();
        await pvInsertarInductores();
        await pvInsertarRepuestos();

        setStatus('🏭 Paso 2/7 · Aporte de capital inicial...');
        await pvInsertarAporteCapital();

        setStatus('🏭 Paso 3/7 · Compras + entradas al Kardex...');
        await pvInsertarCompras();

        setStatus('🏭 Paso 4/7 · Ventas (solo ingresos)...');
        await pvInsertarVentas();

        setStatus('🏭 Paso 5/7 · Costo de ventas (desde Kardex)...');
        await pvInsertarCostoVentas();

        setStatus('🏭 Paso 6/7 · Planillas, gastos y depreciaciones...');
        await pvInsertarPlanillasContables();
        await pvInsertarGastosOperativos();
        await pvInsertarDepreciaciones();

        setStatus('🏭 Paso 7/7 · Verificando cuadre del balance...');
        await pvVerificarCuadre();

        setStatus('✅ ¡Datos VSS Fábrica v2.0 cargados! Balance cuadrado.', '#087565');
        showAlert('✅ VSS Fábrica cargado. Recarga index.html.', 'success');

    } catch (error) {
        console.error('Error cargando VSS Fábrica:', error);
        setStatus('❌ Error: ' + error.message, '#b42335');
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== INSERTORES DE MAESTROS ====================
async function pvInsertarCentros() {
    const existentes = await DB.getAll('centrosCosto');
    if (existentes.some(c => (c.codigo || '').startsWith('CC-'))) return;
    for (const cc of PV_CENTROS) await DB.insert('centrosCosto', cc);
    console.log(`✅ ${PV_CENTROS.length} centros insertados`);
}

async function pvInsertarProductos() {
    const existentes = await DB.getAll('productos');
    if (existentes.some(p => (p.codigo || '').startsWith('PT-'))) return;
    await DB.bulkInsert('productos', PV_PRODUCTOS);
    console.log(`✅ ${PV_PRODUCTOS.length} productos insertados`);
}

async function pvInsertarMercaderias() {
    const existentes = await DB.getAll('mercaderias');
    if (existentes.some(m => (m.codigo || '').startsWith('MP-'))) return;
    await DB.bulkInsert('mercaderias', PV_MERCADERIAS);
    console.log(`✅ ${PV_MERCADERIAS.length} mercaderías insertadas`);
}

async function pvInsertarActivos() {
    const existentes = await DB.getAll('activoFijo');
    if (existentes.some(a => (a.codigo || '').startsWith('AF-'))) return;
    await DB.bulkInsert('activoFijo', PV_ACTIVOS);
    console.log(`✅ ${PV_ACTIVOS.length} activos insertados`);
}

async function pvInsertarPlanillas() {
    const existentes = await DB.getAll('planillas');
    if (existentes.some(p => (p.codigo || '').startsWith('EMP-'))) return;
    await DB.bulkInsert('planillas', PV_PLANILLAS);
    console.log(`✅ ${PV_PLANILLAS.length} trabajadores insertados`);
}

async function pvInsertarInductores() {
    const existentes = await DB.getAll('inductores');
    if (existentes.some(i => (i.codigo || '').startsWith('IND-'))) return;
    await DB.bulkInsert('inductores', PV_INDUCTORES);
    console.log(`✅ ${PV_INDUCTORES.length} inductores insertados`);
}

async function pvInsertarRepuestos() {
    const existentes = await DB.getAll('repuestos');
    if (existentes.some(r => (r.codigo || '').startsWith('REP-'))) return;
    await DB.bulkInsert('repuestos', PV_REPUESTOS);
    console.log(`✅ ${PV_REPUESTOS.length} repuestos insertados`);
}

// ==================== APORTE DE CAPITAL ====================
async function pvInsertarAporteCapital() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Aporte de capital'))) return;

    let contador = asientos.length + 1;

    // Capital social
    await DB.insert('asientos', {
        numero: `AS-${String(contador++).padStart(3, '0')}`,
        fecha: '2026-01-02',
        tipo: 'apertura',
        glosa: PV_MARKER + 'Aporte de capital social inicial - VSS S.A.C.',
        lineas: [
            { cuenta: '104', nombre: 'Cuentas Corrientes', debe: 25000000, haber: 0 },
            { cuenta: '501', nombre: 'Capital Social',     debe: 0,        haber: 25000000 }
        ],
        estado: 'validado'
    });

    // Resultados acumulados
    await DB.insert('asientos', {
        numero: `AS-${String(contador++).padStart(3, '0')}`,
        fecha: '2026-01-02',
        tipo: 'apertura',
        glosa: PV_MARKER + 'Resultados acumulados de ejercicios anteriores',
        lineas: [
            { cuenta: '104', nombre: 'Cuentas Corrientes',        debe: 5000000, haber: 0 },
            { cuenta: '591', nombre: 'Utilidades No Distribuidas', debe: 0,       haber: 5000000 }
        ],
        estado: 'validado'
    });

    console.log('✅ Aporte de capital: S/ 30,000,000');
}

// ==================== COMPRAS (con Kardex) ====================
async function pvInsertarCompras() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Compra según'))) return;

    let contador = asientos.length + 1;
    let totalCompras = 0;

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        const numCompras = pvAleatorioInt(4, 6);
        for (let i = 0; i < numCompras; i++) {
            const prov = pvElegir(PV_PROVEEDORES);
            const base = pvRedondear(pvAleatorio(45000, 180000));
            const igv = pvRedondear(base * 0.18);
            const total = pvRedondear(base + igv);
            const dia = pvAleatorioInt(3, 25);
            const fecha = pvFecha(2026, mes, dia);
            const numFactura = `F${String(pvAleatorioInt(100,999)).padStart(3,'0')}-${pvAleatorioInt(1000,9999)}`;

            // Asiento de compra: DEBE 601+401 / HABER 421
            const asiento = await DB.insert('asientos', {
                numero: `AS-${String(contador++).padStart(3, '0')}`,
                fecha,
                tipo: 'normal',
                glosa: PV_MARKER + `Compra según ${numFactura} - ${prov.nombre}`,
                lineas: [
                    { cuenta: '601', nombre: 'Mercaderías',        debe: base, haber: 0 },
                    { cuenta: '401', nombre: 'IGV',                debe: igv,  haber: 0 },
                    { cuenta: '421', nombre: 'Facturas por Pagar', debe: 0,    haber: total }
                ],
                estado: 'validado'
            });

            // Tabla compras
            await DB.insert('compras', {
                fecha, proveedor: prov.nombre, ruc: prov.ruc,
                tipo: 'Factura', numero: numFactura,
                base, igv, total
            });

            // Entrada Kardex de una mercadería
            const merc = pvElegir(PV_MERCADERIAS);
            const cantidad = pvAleatorioInt(50, 300);
            const costoUnit = pvRedondear(merc.costo * pvAleatorio(0.95, 1.05));
            const costoTotal = pvRedondear(cantidad * costoUnit);

            const kardexs = await DB.getAll('kardex');
            const delProducto = kardexs.filter(k => k.producto_codigo === merc.codigo)
                .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
            
            let saldoCant = 0, saldoTotal = 0;
            if (delProducto.length > 0) {
                const ultimo = delProducto[delProducto.length - 1];
                saldoCant = Number(ultimo.saldo_cantidad) || 0;
                saldoTotal = Number(ultimo.saldo_total) || 0;
            }
            const nuevoSaldoCant = saldoCant + cantidad;
            const nuevoSaldoTotal = saldoTotal + costoTotal;
            const nuevoCostoUnit = nuevoSaldoCant > 0 ? nuevoSaldoTotal / nuevoSaldoCant : 0;

            await DB.insert('kardex', {
                producto_codigo: merc.codigo,
                producto_nombre: merc.descripcion,
                fecha,
                tipo_movimiento: 'entrada',
                documento: numFactura,
                descripcion: PV_MARKER + `Compra ${merc.descripcion}`,
                cantidad,
                costo_unitario: costoUnit,
                costo_total: costoTotal,
                saldo_cantidad: nuevoSaldoCant,
                saldo_costo_unitario: nuevoCostoUnit,
                saldo_total: nuevoSaldoTotal,
                metodo_valorizacion: 'promedio',
                asiento_id: asiento?.id || null
            });

            totalCompras += base;
        }
    }
    console.log(`✅ Compras: S/ ${totalCompras.toFixed(2)}`);
}

// ==================== VENTAS (solo ingreso) ====================
async function pvInsertarVentas() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Venta diaria'))) return;

    let contador = (await DB.getAll('asientos')).length + 1;
    let totalVentas = 0;

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        for (let i = 0; i < 5; i++) {
            const cli = pvElegir(PV_CLIENTES);
            const esB2B = cli.ruc !== '00000000';
            const base = esB2B 
                ? pvRedondear(pvAleatorio(80000, 250000))
                : pvRedondear(pvAleatorio(45000, 120000));
            const igv = pvRedondear(base * 0.18);
            const total = pvRedondear(base + igv);
            const dia = pvAleatorioInt(3, 28);
            const fecha = pvFecha(2026, mes, dia);
            const tipoDoc = esB2B ? 'Factura' : 'Boleta';
            const numDoc = esB2B 
                ? `F001-${pvAleatorioInt(1000,9999)}`
                : `B001-${pvAleatorioInt(10000,99999)}`;

            // Asiento venta: DEBE 121 / HABER 401+701
            await DB.insert('asientos', {
                numero: `AS-${String(contador++).padStart(3, '0')}`,
                fecha,
                tipo: 'normal',
                glosa: PV_MARKER + `Venta diaria ${tipoDoc} ${numDoc} - ${cli.nombre}`,
                lineas: [
                    { cuenta: '121', nombre: 'Facturas por Cobrar', debe: total, haber: 0 },
                    { cuenta: '401', nombre: 'IGV',                 debe: 0,     haber: igv },
                    { cuenta: '701', nombre: 'Mercaderías',         debe: 0,     haber: base }
                ],
                estado: 'validado'
            });

            await DB.insert('ventas', {
                fecha, cliente: cli.nombre, ruc: cli.ruc,
                tipo: tipoDoc, numero: numDoc,
                base, igv, total
            });

            totalVentas += base;
        }
    }
    console.log(`✅ Ventas: S/ ${totalVentas.toFixed(2)}`);
}

// ==================== COSTO DE VENTAS (desde Kardex) ====================
async function pvInsertarCostoVentas() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Costo de ventas'))) return;

    let contador = asientos.length + 1;
    let totalCostoVentas = 0;

    // Por cada mes, sacar mercaderías y generar asiento de costo
    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        for (const merc of PV_MERCADERIAS) {
            const kardexs = await DB.getAll('kardex');
            const delProducto = kardexs.filter(k => k.producto_codigo === merc.codigo)
                .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
            
            if (delProducto.length === 0) continue;
            const ultimo = delProducto[delProducto.length - 1];
            const saldoCant = Number(ultimo.saldo_cantidad) || 0;
            const saldoTotal = Number(ultimo.saldo_total) || 0;
            if (saldoCant < 20) continue;

            const cantidad = Math.min(pvAleatorioInt(30, 150), Math.floor(saldoCant * 0.6));
            if (cantidad <= 0) continue;

            const costoUnit = saldoTotal / saldoCant;
            const costoTotal = pvRedondear(cantidad * costoUnit);
            const fecha = pvFecha(2026, mes, pvAleatorioInt(15, 28));

            const nuevoSaldoCant = saldoCant - cantidad;
            const nuevoSaldoTotal = saldoTotal - costoTotal;
            const nuevoCostoUnit = nuevoSaldoCant > 0 ? nuevoSaldoTotal / nuevoSaldoCant : 0;

            // Asiento de costo: DEBE 691 / HABER 201
            const asiento = await DB.insert('asientos', {
                numero: `AS-${String(contador++).padStart(3, '0')}`,
                fecha,
                tipo: 'normal',
                glosa: PV_MARKER + `Costo de ventas · ${merc.descripcion} mes ${mes}/2026`,
                lineas: [
                    { cuenta: '691', nombre: 'Costo de Mercaderías Vendidas', debe: costoTotal, haber: 0 },
                    { cuenta: '201', nombre: 'Mercaderías - Costo',           debe: 0,          haber: costoTotal }
                ],
                estado: 'validado'
            });

            // Salida del Kardex
            await DB.insert('kardex', {
                producto_codigo: merc.codigo,
                producto_nombre: merc.descripcion,
                fecha,
                tipo_movimiento: 'salida',
                documento: `VTA-${pvAleatorioInt(10000,99999)}`,
                descripcion: PV_MARKER + `Salida por venta ${merc.descripcion}`,
                cantidad,
                costo_unitario: costoUnit,
                costo_total: costoTotal,
                saldo_cantidad: nuevoSaldoCant,
                saldo_costo_unitario: nuevoCostoUnit,
                saldo_total: nuevoSaldoTotal,
                metodo_valorizacion: 'promedio',
                asiento_id: asiento?.id || null
            });

            totalCostoVentas += costoTotal;
        }
    }
    console.log(`✅ Costo de ventas: S/ ${totalCostoVentas.toFixed(2)}`);
}

// ==================== PLANILLAS CONTABLES ====================
async function pvInsertarPlanillasContables() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Planilla'))) return;

    let contador = asientos.length + 1;
    const totalSueldos = PV_PLANILLAS.reduce((s, p) => s + p.sueldo, 0);
    const afp = pvRedondear(totalSueldos * 0.13);
    const essalud = pvRedondear(totalSueldos * 0.09);
    const netoPagar = pvRedondear(totalSueldos - afp);

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha: pvFecha(2026, mes, 28),
            tipo: 'normal',
            glosa: PV_MARKER + `Planilla de sueldos mes ${mes}/2026`,
            lineas: [
                { cuenta: '621', nombre: 'Sueldos y Salarios',           debe: totalSueldos, haber: 0 },
                { cuenta: '627', nombre: 'Seguridad y Previsión Social', debe: essalud,      haber: 0 },
                { cuenta: '411', nombre: 'Sueldos por Pagar',            debe: 0,            haber: netoPagar },
                { cuenta: '407', nombre: 'AFP por Pagar',                debe: 0,            haber: afp },
                { cuenta: '408', nombre: 'Essalud por Pagar',            debe: 0,            haber: essalud }
            ],
            estado: 'validado'
        });
    }
    console.log('✅ 9 planillas: S/ ' + (totalSueldos * 9).toFixed(2));
}

// ==================== GASTOS OPERATIVOS ====================
async function pvInsertarGastosOperativos() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Servicios básicos'))) return;

    let contador = asientos.length + 1;

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        // Servicios básicos
        const luz = pvRedondear(pvAleatorio(35000, 55000));
        const agua = pvRedondear(pvAleatorio(3000, 5000));
        const internet = pvRedondear(pvAleatorio(2500, 4000));
        const totalServ = pvRedondear(luz + agua + internet);

        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha: pvFecha(2026, mes, 10),
            tipo: 'normal',
            glosa: PV_MARKER + `Servicios básicos mes ${mes}/2026`,
            lineas: [
                { cuenta: '633', nombre: 'Servicios Básicos', debe: totalServ, haber: 0 },
                { cuenta: '421', nombre: 'Facturas por Pagar', debe: 0,       haber: totalServ }
            ],
            estado: 'validado'
        });

        // Publicidad
        const mkt = pvRedondear(pvAleatorio(18000, 35000));
        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha: pvFecha(2026, mes, 15),
            tipo: 'normal',
            glosa: PV_MARKER + `Publicidad y marketing mes ${mes}/2026`,
            lineas: [
                { cuenta: '637', nombre: 'Publicidad y Marketing', debe: mkt, haber: 0 },
                { cuenta: '421', nombre: 'Facturas por Pagar',     debe: 0,   haber: mkt }
            ],
            estado: 'validado'
        });

        // Alquiler
        const alquiler = pvRedondear(pvAleatorio(85000, 120000));
        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha: pvFecha(2026, mes, 5),
            tipo: 'normal',
            glosa: PV_MARKER + `Alquiler de local comercial mes ${mes}/2026`,
            lineas: [
                { cuenta: '632', nombre: 'Alquileres',         debe: alquiler, haber: 0 },
                { cuenta: '421', nombre: 'Facturas por Pagar', debe: 0,        haber: alquiler }
            ],
            estado: 'validado'
        });
    }
    console.log('✅ Gastos operativos insertados');
}

// ==================== DEPRECIACIONES ====================
async function pvInsertarDepreciaciones() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Depreciación'))) return;

    let contador = asientos.length + 1;
    const totalDepMensual = PV_ACTIVOS.reduce((s, a) => s + (a.costo * 0.10 / 12), 0);

    for (const mes of [3, 6, 9]) {
        const montoDep = pvRedondear(totalDepMensual * 3);
        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha: pvFecha(2026, mes, 30),
            tipo: 'ajuste',
            glosa: PV_MARKER + `Depreciación trimestral activos fijos T${mes/3}/2026`,
            lineas: [
                { cuenta: '681', nombre: 'Depreciación IME',       debe: montoDep, haber: 0 },
                { cuenta: '391', nombre: 'Depreciación Acumulada', debe: 0,        haber: montoDep }
            ],
            estado: 'validado'
        });
    }
    console.log('✅ Depreciaciones insertadas');
}

// ==================== VERIFICAR CUADRE ====================
async function pvVerificarCuadre() {
    const asientos = await DB.getAll('asientos');
    let totalActivo = 0, totalPasivo = 0, totalPatrimonio = 0;
    let totalDebe = 0, totalHaber = 0;

    asientos.forEach(a => {
        (a.lineas || []).forEach(l => {
            const c = String(l.cuenta);
            const debe = Number(l.debe) || 0;
            const haber = Number(l.haber) || 0;
            const saldo = debe - haber;
            totalDebe += debe;
            totalHaber += haber;

            if (c.startsWith('1') || c.startsWith('2') || c.startsWith('3')) totalActivo += saldo;
            if (c.startsWith('4')) totalPasivo -= saldo;
            if (c.startsWith('5')) totalPatrimonio -= saldo;
        });
    });

    const descuadre = totalActivo - totalPasivo - totalPatrimonio;
    const diferenciaPartidaDoble = totalDebe - totalHaber;

    console.log('═══════════════════════════════════════');
    console.log('📊 VERIFICACIÓN FINAL');
    console.log('═══════════════════════════════════════');
    console.log(`Activo:          S/ ${totalActivo.toFixed(2)}`);
    console.log(`Pasivo:          S/ ${totalPasivo.toFixed(2)}`);
    console.log(`Patrimonio:      S/ ${totalPatrimonio.toFixed(2)}`);
    console.log('───────────────────────────────────────');
    console.log(`P + Pat:         S/ ${(totalPasivo + totalPatrimonio).toFixed(2)}`);
    console.log(`Diferencia:      S/ ${descuadre.toFixed(2)}`);
    console.log('');
    console.log(`Total DEBE:      S/ ${totalDebe.toFixed(2)}`);
    console.log(`Total HABER:     S/ ${totalHaber.toFixed(2)}`);
    console.log(`Partida doble:   S/ ${diferenciaPartidaDoble.toFixed(2)}`);
    console.log('═══════════════════════════════════════');
    
    if (Math.abs(descuadre) < 0.01 && Math.abs(diferenciaPartidaDoble) < 0.01) {
        console.log('✅ ¡BALANCE CUADRADO PERFECTAMENTE!');
    } else {
        console.warn('⚠️ Descuadre detectado:', descuadre, 'Partida doble:', diferenciaPartidaDoble);
    }
}