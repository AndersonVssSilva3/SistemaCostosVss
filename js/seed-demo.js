// ==================== SEED DEMO - DATOS DE DEMOSTRACIÓN ====================
// Inserta datos coherentes para que el sistema muestre historial real.
// Todos los registros llevan la marca "DEMO" para poder borrarlos después.

const SEED_MARKER = 'DEMO · ';

// ==================== HELPERS ====================
function _fecha(anio, mes, dia) {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function _aleatorio(min, max) {
    return Math.random() * (max - min) + min;
}

function _aleatorioInt(min, max) {
    return Math.floor(_aleatorio(min, max + 1));
}

function _elegir(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ==================== DATOS BASE DE DEMO ====================
const DEMO_CENTROS = [
    { codigo: 'CC-01', nombre: 'Producción',    responsable: 'Ing. Carlos Quispe',   presupuesto: 80000, gastado: 62400 },
    { codigo: 'CC-02', nombre: 'Ventas',        responsable: 'Lic. María Torres',    presupuesto: 45000, gastado: 38200 },
    { codigo: 'CC-03', nombre: 'Administración',responsable: 'CPC Ana Ramírez',      presupuesto: 35000, gastado: 29800 },
    { codigo: 'CC-04', nombre: 'Logística',     responsable: 'Sr. José Mendoza',     presupuesto: 25000, gastado: 21500 },
    { codigo: 'CC-05', nombre: 'Mantenimiento', responsable: 'Téc. Luis Chávez',     presupuesto: 20000, gastado: 16400 },
    { codigo: 'CC-06', nombre: 'TI',            responsable: 'Ing. Sofía Vargas',    presupuesto: 18000, gastado: 14200 }
];

const DEMO_PRODUCTOS = [
    { codigo: 'PT-001', nombre: 'Cemento Portland Tipo I - Bolsa 42.5kg', categoria: 'Construcción', precio: 28.50, stock: 850 },
    { codigo: 'PT-002', nombre: 'Fierro Corrugado 1/2" x 9m',              categoria: 'Construcción', precio: 42.80, stock: 420 },
    { codigo: 'PT-003', nombre: 'Pintura Látex Blanca - Balde 5gl',        categoria: 'Acabados',     precio: 89.90, stock: 180 },
    { codigo: 'PT-004', nombre: 'Tubería PVC 2" x 3m',                     categoria: 'Plomería',     precio: 18.40, stock: 650 },
    { codigo: 'PT-005', nombre: 'Cable Eléctrico THW 12 AWG x 100m',       categoria: 'Eléctrico',    precio: 156.00, stock: 95 },
    { codigo: 'PT-006', nombre: 'Ladrillo King Kong 18 huecos',            categoria: 'Construcción', precio: 2.80,  stock: 4500 }
];

const DEMO_MERCADERIAS = [
    { codigo: 'MP-001', descripcion: 'Clinker a granel',                  unidad: 'TN',  stock: 120,  costo: 185.00 },
    { codigo: 'MP-002', descripcion: 'Yeso industrial',                   unidad: 'TN',  stock: 45,   costo: 220.00 },
    { codigo: 'MP-003', descripcion: 'Acero corrugado 5/8"',              unidad: 'VAR', stock: 380,  costo: 38.50 },
    { codigo: 'MP-004', descripcion: 'Resina acrílica',                   unidad: 'GLN', stock: 220,  costo: 45.80 },
    { codigo: 'MP-005', descripcion: 'Pigmento dióxido de titanio',       unidad: 'KG',  stock: 95,   costo: 78.00 },
    { codigo: 'MP-006', descripcion: 'PVC granulado',                     unidad: 'KG',  stock: 340,  costo: 12.40 },
    { codigo: 'MP-007', descripcion: 'Cobre electrolítico 99.9%',         unidad: 'KG',  stock: 68,   costo: 42.50 },
    { codigo: 'MP-008', descripcion: 'Arcilla refractaria',               unidad: 'TN',  stock: 28,   costo: 165.00 }
];

const DEMO_ACTIVOS = [
    { codigo: 'AF-001', descripcion: 'Camioneta Toyota Hilux 4x4',              fecha: '2024-03-15', costo: 145000, dep: 48333 },
    { codigo: 'AF-002', descripcion: 'Montacargas Eléctrico 2.5TN',             fecha: '2024-06-20', costo: 89000,  dep: 23733 },
    { codigo: 'AF-003', descripcion: 'Computadora HP ProDesk i7 + Monitor',     fecha: '2025-01-10', costo: 4200,   dep: 1050 },
    { codigo: 'AF-004', descripcion: 'Mobiliario de Oficina (Juego Gerencia)',  fecha: '2024-09-01', costo: 8500,   dep: 2833 },
    { codigo: 'AF-005', descripcion: 'Mezcladora de Concreto 11p3',             fecha: '2024-11-12', costo: 28000,  dep: 7000 }
];

const DEMO_PLANILLAS = [
    { codigo: 'EMP-001', nombre: 'Carlos Quispe Mamani',    cargo: 'Jefe de Producción',    sueldo: 5500 },
    { codigo: 'EMP-002', nombre: 'María Torres Salazar',    cargo: 'Gerente de Ventas',     sueldo: 6200 },
    { codigo: 'EMP-003', nombre: 'Ana Ramírez Loayza',      cargo: 'Contadora General',     sueldo: 4800 },
    { codigo: 'EMP-004', nombre: 'José Mendoza Ríos',       cargo: 'Jefe de Almacén',       sueldo: 3800 },
    { codigo: 'EMP-005', nombre: 'Luis Chávez Huamán',      cargo: 'Técnico Mantenimiento', sueldo: 3200 },
    { codigo: 'EMP-006', nombre: 'Sofía Vargas Castro',     cargo: 'Analista de Sistemas',  sueldo: 4200 },
    { codigo: 'EMP-007', nombre: 'Roberto Flores Ninanya',  cargo: 'Operario Planta',       sueldo: 1850 },
    { codigo: 'EMP-008', nombre: 'Patricia Ríos Acuña',     cargo: 'Asistente Contable',    sueldo: 2400 }
];

const DEMO_INDUCTORES = [
    { codigo: 'IND-01', inductor: 'Horas Máquina',       unidad: 'HM',  valor: 1250 },
    { codigo: 'IND-02', inductor: 'Horas Hombre',        unidad: 'HH',  valor: 3400 },
    { codigo: 'IND-03', inductor: 'Kilovatios Hora',     unidad: 'kWh', valor: 8500 },
    { codigo: 'IND-04', inductor: 'Unidades Producidas', unidad: 'UND', valor: 12000 },
    { codigo: 'IND-05', inductor: 'Metros Cuadrados',    unidad: 'm2',  valor: 450 }
];

const DEMO_REPUESTOS = [
    { codigo: 'REP-001', descripcion: 'Filtro de aceite motor diesel',    stock: 24, costo: 45.00 },
    { codigo: 'REP-002', descripcion: 'Faja de distribución',             stock: 12, costo: 180.00 },
    { codigo: 'REP-003', descripcion: 'Pastillas de freno',               stock: 18, costo: 95.00 },
    { codigo: 'REP-004', descripcion: 'Aceite hidráulico 20L',            stock: 8,  costo: 320.00 },
    { codigo: 'REP-005', descripcion: 'Rodamiento SKF 6205',              stock: 35, costo: 28.00 }
];

const DEMO_PROVEEDORES = [
    { nombre: 'Cementos Pacasmayo S.A.A.',           ruc: '20331979631' },
    { nombre: 'Aceros Arequipa S.A.',                ruc: '20100203444' },
    { nombre: 'Pinturas CPP Perú S.A.C.',            ruc: '20512345678' },
    { nombre: 'Tuberías y Conexiones del Perú S.A.', ruc: '20481234567' },
    { nombre: 'Distribuidora Eléctrica Lima S.A.C.', ruc: '20355678912' },
    { nombre: 'Ladrillos Pirámide S.A.',             ruc: '20123456789' },
    { nombre: 'Importaciones Andinas EIRL',          ruc: '20458791234' },
    { nombre: 'Ferretería Central S.A.C.',           ruc: '20602345678' }
];

const DEMO_CLIENTES = [
    { nombre: 'Constructora Los Andes S.A.C.',   ruc: '20551122334' },
    { nombre: 'Inversiones Inmobiliarias Sur',   ruc: '20602233445' },
    { nombre: 'Grupo Constructor del Norte',     ruc: '20413344556' },
    { nombre: 'Edificaciones Modernas EIRL',     ruc: '20524455667' },
    { nombre: 'Corporación Habitad S.A.',        ruc: '20345566778' },
    { nombre: 'Proyectos Civiles del Perú SAC',  ruc: '20656677889' },
    { nombre: 'Desarrollos Urbanos Lima SAC',    ruc: '20467788990' },
    { nombre: 'Constructora Pacífico S.A.C.',    ruc: '20578899001' },
    { nombre: 'Fernando Gutiérrez Ramos',        ruc: '10456789012' },  // persona natural
    { nombre: 'María Elena Sánchez Paredes',     ruc: '10345678901' }
];

// ==================== FUNCIÓN PRINCIPAL ====================
async function cargarDatosDemo() {
    if (!confirm('⚠️ Se insertarán datos de demostración en Supabase.\n\n¿Continuar?')) return;

    const status = document.getElementById('seedStatus');
    const setStatus = (msg, color = '#1765bc') => {
        if (status) status.innerHTML = `<div style="color:${color}; font-weight:600; padding:10px; background:#f0f7ff; border-radius:6px; margin-top:12px;">${msg}</div>`;
        console.log('[SEED]', msg);
    };

    try {
        setStatus('🔄 Paso 1/8 · Insertando centros de costo...');
        await insertarCentros();

        setStatus('🔄 Paso 2/8 · Insertando productos y mercaderías...');
        await insertarProductos();
        await insertarMercaderias();

        setStatus('🔄 Paso 3/8 · Insertando activos fijos, planillas, inductores y repuestos...');
        await insertarActivos();
        await insertarPlanillas();
        await insertarInductores();
        await insertarRepuestos();

        setStatus('🔄 Paso 4/8 · Generando compras y asientos de compra...');
        await insertarComprasYAsientos();

        setStatus('🔄 Paso 5/8 · Generando ventas y asientos de venta...');
        await insertarVentasYAsientos();

        setStatus('🔄 Paso 6/8 · Generando planillas contables...');
        await insertarAsientosPlanilla();

        setStatus('🔄 Paso 7/8 · Generando depreciaciones y ajustes...');
        await insertarDepreciacionesYAjustes();

        setStatus('🔄 Paso 8/8 · Generando Kardex...');
        await insertarKardex();

        setStatus('✅ ¡Datos de demostración cargados exitosamente!', '#087565');
        showAlert('✅ Demo cargada. Recarga la página para ver los cambios.', 'success');

    } catch (error) {
        console.error('Error cargando demo:', error);
        setStatus('❌ Error: ' + error.message, '#b42335');
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== INSERTORES POR TABLA ====================

async function insertarCentros() {
    const existentes = await DB.getAll('centrosCosto');
    if (existentes.some(c => c.codigo && c.codigo.startsWith('CC-'))) {
        console.log('[SEED] Centros ya existen, omitiendo');
        return;
    }
    for (const cc of DEMO_CENTROS) {
        await DB.insert('centrosCosto', cc);
    }
    console.log(`✅ ${DEMO_CENTROS.length} centros de costo insertados`);
}

async function insertarProductos() {
    const existentes = await DB.getAll('productos');
    if (existentes.some(p => p.codigo && p.codigo.startsWith('PT-'))) {
        console.log('[SEED] Productos ya existen, omitiendo');
        return;
    }
    await DB.bulkInsert('productos', DEMO_PRODUCTOS);
    console.log(`✅ ${DEMO_PRODUCTOS.length} productos insertados`);
}

async function insertarMercaderias() {
    const existentes = await DB.getAll('mercaderias');
    if (existentes.some(m => m.codigo && m.codigo.startsWith('MP-'))) {
        console.log('[SEED] Mercaderías ya existen, omitiendo');
        return;
    }
    await DB.bulkInsert('mercaderias', DEMO_MERCADERIAS);
    console.log(`✅ ${DEMO_MERCADERIAS.length} mercaderías insertadas`);
}

async function insertarActivos() {
    const existentes = await DB.getAll('activoFijo');
    if (existentes.some(a => a.codigo && a.codigo.startsWith('AF-'))) return;
    await DB.bulkInsert('activoFijo', DEMO_ACTIVOS);
    console.log(`✅ ${DEMO_ACTIVOS.length} activos fijos insertados`);
}

async function insertarPlanillas() {
    const existentes = await DB.getAll('planillas');
    if (existentes.some(p => p.codigo && p.codigo.startsWith('EMP-'))) return;
    await DB.bulkInsert('planillas', DEMO_PLANILLAS);
    console.log(`✅ ${DEMO_PLANILLAS.length} trabajadores insertados`);
}

async function insertarInductores() {
    const existentes = await DB.getAll('inductores');
    if (existentes.some(i => i.codigo && i.codigo.startsWith('IND-'))) return;
    await DB.bulkInsert('inductores', DEMO_INDUCTORES);
    console.log(`✅ ${DEMO_INDUCTORES.length} inductores insertados`);
}

async function insertarRepuestos() {
    const existentes = await DB.getAll('repuestos');
    if (existentes.some(r => r.codigo && r.codigo.startsWith('REP-'))) return;
    await DB.bulkInsert('repuestos', DEMO_REPUESTOS);
    console.log(`✅ ${DEMO_REPUESTOS.length} repuestos insertados`);
}

// ==================== COMPRAS Y ASIENTOS ====================
async function insertarComprasYAsientos() {
    const asientosExistentes = await DB.getAll('asientos');
    const yaTieneDemo = asientosExistentes.some(a => (a.glosa || '').startsWith(SEED_MARKER));
    if (yaTieneDemo) {
        console.log('[SEED] Asientos demo ya existen, omitiendo');
        return;
    }

    let contador = asientosExistentes.length + 1;
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // Ene-Sep 2026

    for (const mes of meses) {
        const numCompras = _aleatorioInt(2, 3);
        for (let i = 0; i < numCompras; i++) {
            const prov = _elegir(DEMO_PROVEEDORES);
            const base = Math.round(_aleatorio(3000, 15000) * 100) / 100;
            const igv = Math.round(base * 0.18 * 100) / 100;
            const total = Math.round((base + igv) * 100) / 100;
            const dia = _aleatorioInt(3, 25);
            const fecha = _fecha(2026, mes, dia);
            const numeroFactura = `F${String(mes).padStart(3,'0')}-${String(_aleatorioInt(100, 999))}`;

            // Insertar compra
            await DB.insert('compras', {
                fecha,
                proveedor: prov.nombre,
                ruc: prov.ruc,
                tipo: 'Factura',
                numero: numeroFactura,
                base,
                igv,
                total
            });

            // Asiento contable
            const numeroAsiento = `AS-${String(contador++).padStart(3, '0')}`;
            await DB.insert('asientos', {
                numero: numeroAsiento,
                fecha,
                tipo: 'normal',
                glosa: SEED_MARKER + `Compra según ${numeroFactura} - ${prov.nombre}`,
                lineas: [
                    { cuenta: '601', nombre: 'Mercaderías',              debe: base,  haber: 0 },
                    { cuenta: '401', nombre: 'IGV',                      debe: igv,   haber: 0 },
                    { cuenta: '421', nombre: 'Facturas por Pagar',       debe: 0,     haber: total }
                ],
                estado: 'validado'
            });
        }
    }
    console.log('✅ Compras y asientos de compra insertados');
}

// ==================== VENTAS Y ASIENTOS ====================
async function insertarVentasYAsientos() {
    const asientosExistentes = await DB.getAll('asientos');
    const yaTieneVentas = asientosExistentes.some(a => (a.glosa || '').includes('Venta según'));
    if (yaTieneVentas) {
        console.log('[SEED] Ventas demo ya existen, omitiendo');
        return;
    }

    let contador = asientosExistentes.length + 1;
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (const mes of meses) {
        const numVentas = _aleatorioInt(2, 3);
        for (let i = 0; i < numVentas; i++) {
            const cli = _elegir(DEMO_CLIENTES);
            const base = Math.round(_aleatorio(5000, 22000) * 100) / 100;
            const igv = Math.round(base * 0.18 * 100) / 100;
            const total = Math.round((base + igv) * 100) / 100;
            const dia = _aleatorioInt(3, 28);
            const fecha = _fecha(2026, mes, dia);
            const numeroFactura = `F001-${String(_aleatorioInt(1000, 9999))}`;

            await DB.insert('ventas', {
                fecha,
                cliente: cli.nombre,
                ruc: cli.ruc,
                tipo: 'Factura',
                numero: numeroFactura,
                base,
                igv,
                total
            });

            // Asiento: por la venta
            const numeroAsiento = `AS-${String(contador++).padStart(3, '0')}`;
            await DB.insert('asientos', {
                numero: numeroAsiento,
                fecha,
                tipo: 'normal',
                glosa: SEED_MARKER + `Venta según ${numeroFactura} - ${cli.nombre}`,
                lineas: [
                    { cuenta: '121', nombre: 'Facturas por Cobrar',      debe: total, haber: 0 },
                    { cuenta: '401', nombre: 'IGV',                      debe: 0,     haber: igv },
                    { cuenta: '701', nombre: 'Mercaderías',              debe: 0,     haber: base }
                ],
                estado: 'validado'
            });

            // Asiento: costo de ventas (estimado 60% del valor de venta)
            const costoEstimado = Math.round(base * 0.60 * 100) / 100;
            const numAsientoCosto = `AS-${String(contador++).padStart(3, '0')}`;
            await DB.insert('asientos', {
                numero: numAsientoCosto,
                fecha,
                tipo: 'normal',
                glosa: SEED_MARKER + `Costo de venta ${numeroFactura} - ${cli.nombre}`,
                lineas: [
                    { cuenta: '691', nombre: 'Costo de Mercaderías Vendidas', debe: costoEstimado, haber: 0 },
                    { cuenta: '201', nombre: 'Mercaderías - Costo',           debe: 0,             haber: costoEstimado }
                ],
                estado: 'validado'
            });
        }
    }
    console.log('✅ Ventas y asientos de venta insertados');
}

// ==================== PLANILLAS CONTABLES ====================
async function insertarAsientosPlanilla() {
    const asientos = await DB.getAll('asientos');
    const yaTienePlanilla = asientos.some(a => (a.glosa || '').includes('Planilla'));
    if (yaTienePlanilla) {
        console.log('[SEED] Planillas contables ya existen, omitiendo');
        return;
    }

    let contador = asientos.length + 1;
    const totalSueldos = DEMO_PLANILLAS.reduce((s, p) => s + p.sueldo, 0);
    const afp = Math.round(totalSueldos * 0.13 * 100) / 100;
    const essalud = Math.round(totalSueldos * 0.09 * 100) / 100;
    const netoPagar = Math.round((totalSueldos - afp) * 100) / 100;

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        const fecha = _fecha(2026, mes, 28);
        const numeroAsiento = `AS-${String(contador++).padStart(3, '0')}`;

        await DB.insert('asientos', {
            numero: numeroAsiento,
            fecha,
            tipo: 'normal',
            glosa: SEED_MARKER + `Planilla de sueldos mes ${mes}/2026`,
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
    console.log('✅ Asientos de planilla insertados');
}

// ==================== DEPRECIACIONES Y AJUSTES ====================
async function insertarDepreciacionesYAjustes() {
    const asientos = await DB.getAll('asientos');
    const yaTieneDep = asientos.some(a => (a.glosa || '').includes('Depreciación'));
    if (yaTieneDep) {
        console.log('[SEED] Depreciaciones ya existen, omitiendo');
        return;
    }

    let contador = asientos.length + 1;
    const totalDep = DEMO_ACTIVOS.reduce((s, a) => s + (a.costo * 0.10 / 12), 0);

    // Depreciación mensual (10% anual / 12)
    for (const mes of [3, 6, 9]) {
        const fecha = _fecha(2026, mes, 30);
        const numeroAsiento = `AS-${String(contador++).padStart(3, '0')}`;

        await DB.insert('asientos', {
            numero: numeroAsiento,
            fecha,
            tipo: 'ajuste',
            glosa: SEED_MARKER + `Depreciación trimestral activos fijos - Trimestre ${mes/3}`,
            lineas: [
                { cuenta: '681', nombre: 'Depreciación IME',        debe: totalDep * 3, haber: 0 },
                { cuenta: '391', nombre: 'Depreciación Acumulada',  debe: 0,            haber: totalDep * 3 }
            ],
            estado: 'validado'
        });
    }

    // Pago a proveedores
    for (const mes of [2, 5, 8]) {
        const fecha = _fecha(2026, mes, 15);
        const numeroAsiento = `AS-${String(contador++).padStart(3, '0')}`;
        const monto = _aleatorioInt(8000, 20000);

        await DB.insert('asientos', {
            numero: numeroAsiento,
            fecha,
            tipo: 'normal',
            glosa: SEED_MARKER + `Pago a proveedores según cronograma`,
            lineas: [
                { cuenta: '421', nombre: 'Facturas por Pagar',         debe: monto, haber: 0 },
                { cuenta: '104', nombre: 'Cuentas Corrientes',         debe: 0,     haber: monto }
            ],
            estado: 'validado'
        });
    }

    // Cobro a clientes
    for (const mes of [2, 5, 8]) {
        const fecha = _fecha(2026, mes, 22);
        const numeroAsiento = `AS-${String(contador++).padStart(3, '0')}`;
        const monto = _aleatorioInt(10000, 25000);

        await DB.insert('asientos', {
            numero: numeroAsiento,
            fecha,
            tipo: 'normal',
            glosa: SEED_MARKER + `Cobro a clientes según estado de cuenta`,
            lineas: [
                { cuenta: '104', nombre: 'Cuentas Corrientes',         debe: monto, haber: 0 },
                { cuenta: '121', nombre: 'Facturas por Cobrar',        debe: 0,     haber: monto }
            ],
            estado: 'validado'
        });
    }

    console.log('✅ Depreciaciones, pagos y cobros insertados');
}

// ==================== KARDEX ====================
async function insertarKardex() {
    const existentes = await DB.getAll('kardex');
    if (existentes.length > 0) {
        console.log('[SEED] Kardex ya tiene movimientos, omitiendo');
        return;
    }

    // Estado inicial por producto
    const saldos = {};
    DEMO_MERCADERIAS.forEach(m => {
        saldos[m.codigo] = { cant: 0, total: 0, costoProm: m.costo };
    });

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        // ENTRADAS (compras)
        for (const m of DEMO_MERCADERIAS) {
            if (Math.random() < 0.4) continue; // no todos los meses entran todos
            const cantidad = _aleatorioInt(20, 80);
            const costoUnit = m.costo;
            const costoTotal = Math.round(cantidad * costoUnit * 100) / 100;
            const fecha = _fecha(2026, mes, _aleatorioInt(3, 12));

            saldos[m.codigo].cant += cantidad;
            saldos[m.codigo].total += costoTotal;
            saldos[m.codigo].costoProm = saldos[m.codigo].cant > 0 ? saldos[m.codigo].total / saldos[m.codigo].cant : 0;

            await DB.insert('kardex', {
                producto_codigo: m.codigo,
                producto_nombre: m.descripcion,
                fecha,
                tipo_movimiento: 'entrada',
                documento: `F00${_aleatorioInt(100,999)}-${_aleatorioInt(100,999)}`,
                descripcion: SEED_MARKER + `Compra de ${m.descripcion}`,
                cantidad,
                costo_unitario: costoUnit,
                costo_total: costoTotal,
                saldo_cantidad: saldos[m.codigo].cant,
                saldo_costo_unitario: saldos[m.codigo].costoProm,
                saldo_total: saldos[m.codigo].total,
                metodo_valorizacion: 'promedio'
            });
        }

        // SALIDAS (consumos)
        for (const m of DEMO_MERCADERIAS) {
            if (saldos[m.codigo].cant < 20) continue;
            const cantidad = _aleatorioInt(5, 25);
            const costoUnit = saldos[m.codigo].costoProm;
            const costoTotal = Math.round(cantidad * costoUnit * 100) / 100;
            const fecha = _fecha(2026, mes, _aleatorioInt(15, 28));

            saldos[m.codigo].cant -= cantidad;
            saldos[m.codigo].total -= costoTotal;

            await DB.insert('kardex', {
                producto_codigo: m.codigo,
                producto_nombre: m.descripcion,
                fecha,
                tipo_movimiento: 'salida',
                documento: `VAL-${_aleatorioInt(1000,9999)}`,
                descripcion: SEED_MARKER + `Consumo interno ${m.descripcion}`,
                cantidad,
                costo_unitario: costoUnit,
                costo_total: costoTotal,
                saldo_cantidad: saldos[m.codigo].cant,
                saldo_costo_unitario: saldos[m.codigo].costoProm,
                saldo_total: saldos[m.codigo].total,
                metodo_valorizacion: 'promedio'
            });
        }
    }

    // Actualizar stocks finales en mercaderias
    for (const m of DEMO_MERCADERIAS) {
        const mercs = await DB.getAll('mercaderias');
        const merc = mercs.find(x => x.codigo === m.codigo);
        if (merc) {
            await DB.update('mercaderias', merc.id, {
                stock: saldos[m.codigo].cant,
                costo: saldos[m.codigo].costoProm
            });
        }
    }

    console.log('✅ Kardex insertado');
}

// ==================== LIMPIAR DEMO ====================
async function borrarDatosDemo() {
    if (!confirm('⚠️ Se eliminarán SOLO los datos marcados como DEMO.\n\n¿Continuar?')) return;
    if (!confirm('🔴 Última confirmación. ¿Estás seguro?')) return;

    try {
        const status = document.getElementById('seedStatus');
        const setStatus = (msg, color = '#b42335') => {
            if (status) status.innerHTML = `<div style="color:${color}; font-weight:600; padding:10px; background:#fff0f0; border-radius:6px; margin-top:12px;">${msg}</div>`;
            console.log('[SEED]', msg);
        };

        setStatus('🔄 Borrando asientos DEMO...');
        const asientos = await DB.getAll('asientos');
        const asientosDemo = asientos.filter(a => (a.glosa || '').startsWith(SEED_MARKER) || (a.glosa || '').includes('DEMO'));
        for (const a of asientosDemo) await DB.delete('asientos', a.id);

        setStatus('🔄 Borrando kardex DEMO...');
        const kardex = await DB.getAll('kardex');
        const kardexDemo = kardex.filter(k => (k.descripcion || '').startsWith(SEED_MARKER));
        for (const k of kardexDemo) await DB.delete('kardex', k.id);

        setStatus('🔄 Borrando compras y ventas...');
        const compras = await DB.getAll('compras');
        for (const c of compras) if (DEMO_PROVEEDORES.some(p => p.ruc === c.ruc)) await DB.delete('compras', c.id);
        const ventas = await DB.getAll('ventas');
        for (const v of ventas) if (DEMO_CLIENTES.some(cl => cl.ruc === v.ruc)) await DB.delete('ventas', v.id);

        setStatus('🔄 Borrando datos maestros DEMO...');
        for (const tbl of ['productos', 'mercaderias', 'activoFijo', 'planillas', 'inductores', 'repuestos', 'centrosCosto']) {
            const items = await DB.getAll(tbl);
            const prefijos = { productos: 'PT-', mercaderias: 'MP-', activoFijo: 'AF-', planillas: 'EMP-', inductores: 'IND-', repuestos: 'REP-', centrosCosto: 'CC-' };
            const pref = prefijos[tbl];
            for (const it of items) if ((it.codigo || '').startsWith(pref)) await DB.delete(tbl, it.id);
        }

        setStatus('✅ Datos DEMO eliminados correctamente.', '#087565');
        showAlert('Demo eliminada. Recarga la página.', 'success');
    } catch (error) {
        console.error('Error borrando demo:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}