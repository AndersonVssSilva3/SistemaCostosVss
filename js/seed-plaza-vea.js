// ==================== SEED PLAZA VEA - DATOS DE DEMOSTRACIÓN ====================
// Supermercados Peruanos S.A. - Datos contables realistas
// Todos los registros llevan la marca "PV · " para poder borrarlos después.

const PV_MARKER = 'PV · ';

// ==================== HELPERS ====================
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

// ==================== CATÁLOGOS PLAZA VEA ====================

// Centros de costo por sección (como en un supermercado real)
const PV_CENTROS = [
    { codigo: 'CC-ABAR', nombre: 'Abarrotes',           responsable: 'Ing. Roberto Salinas',  presupuesto: 2500000, gastado: 2180000 },
    { codigo: 'CC-PERE', nombre: 'Perecibles',          responsable: 'Ing. Carolina Vega',    presupuesto: 1800000, gastado: 1650000 },
    { codigo: 'CC-BAZA', nombre: 'Bazar y Electrohogar',responsable: 'Lic. Diego Paredes',    presupuesto: 900000,  gastado: 720000 },
    { codigo: 'CC-LOGI', nombre: 'Logística y CD',      responsable: 'Ing. Patricia Ríos',    presupuesto: 1200000, gastado: 1080000 },
    { codigo: 'CC-ADMI', nombre: 'Administración',      responsable: 'CPC Fernando Loayza',   presupuesto: 750000,  gastado: 620000 },
    { codigo: 'CC-MKTG', nombre: 'Marketing y E-commerce', responsable: 'Lic. Valeria Castro', presupuesto: 480000, gastado: 395000 }
];

// Productos terminados (catálogo tipo supermercado) - Precios de venta al público
const PV_PRODUCTOS = [
    // Abarrotes
    { codigo: 'PT-ABAR-001', nombre: 'Aceite Primor 1L',              categoria: 'Abarrotes',       precio: 12.90, stock: 2400 },
    { codigo: 'PT-ABAR-002', nombre: 'Arroz Costeño Extra 5kg',       categoria: 'Abarrotes',       precio: 28.50, stock: 1800 },
    { codigo: 'PT-ABAR-003', nombre: 'Fideo Don Vittorio 500g',       categoria: 'Abarrotes',       precio: 4.20,  stock: 3600 },
    { codigo: 'PT-ABAR-004', nombre: 'Atún Florida en aceite 170g',   categoria: 'Abarrotes',       precio: 8.90,  stock: 2200 },
    { codigo: 'PT-ABAR-005', nombre: 'Azúcar Rubia Cartavio 1kg',     categoria: 'Abarrotes',       precio: 5.80,  stock: 2800 },
    
    // Bebidas
    { codigo: 'PT-BEBI-001', nombre: 'Inca Kola 3L',                  categoria: 'Bebidas',         precio: 12.50, stock: 1500 },
    { codigo: 'PT-BEBI-002', nombre: 'Coca Cola 3L',                  categoria: 'Bebidas',         precio: 12.50, stock: 1400 },
    { codigo: 'PT-BEBI-003', nombre: 'Agua San Luis 2.5L',            categoria: 'Bebidas',         precio: 3.90,  stock: 3000 },
    
    // Lácteos
    { codigo: 'PT-LACT-001', nombre: 'Leche Gloria Evaporada 400g',   categoria: 'Lácteos',         precio: 5.20,  stock: 4200 },
    { codigo: 'PT-LACT-002', nombre: 'Yogurt Gloria Fresa 1L',        categoria: 'Lácteos',         precio: 7.80,  stock: 1200 },
    { codigo: 'PT-LACT-003', nombre: 'Queso Fresco Laive 250g',       categoria: 'Lácteos',         precio: 11.50, stock: 800 },
    
    // Limpieza
    { codigo: 'PT-LIMP-001', nombre: 'Detergente Bolívar 800g',       categoria: 'Limpieza',        precio: 15.90, stock: 1800 },
    { codigo: 'PT-LIMP-002', nombre: 'Papel Higiénico Suave 4 rollos',categoria: 'Limpieza',        precio: 9.80,  stock: 2500 },
    { codigo: 'PT-LIMP-003', nombre: 'Lejía Clorox 1L',               categoria: 'Limpieza',        precio: 6.50,  stock: 1600 },
    
    // Cuidado personal
    { codigo: 'PT-CUID-001', nombre: 'Shampoo Sedal 750ml',           categoria: 'Cuidado Personal',precio: 18.90, stock: 900 },
    { codigo: 'PT-CUID-002', nombre: 'Pasta Dental Colgate 90g',      categoria: 'Cuidado Personal',precio: 7.50,  stock: 1400 }
];

// Mercaderías (materias primas / productos a granel que Plaza Vea procesa)
const PV_MERCADERIAS = [
    { codigo: 'MP-CARN-001', descripcion: 'Carne de res (corte industrial)',  unidad: 'KG', stock: 850,  costo: 28.50 },
    { codigo: 'MP-CARN-002', descripcion: 'Pollo entero fresco',              unidad: 'KG', stock: 1200, costo: 11.80 },
    { codigo: 'MP-CARN-003', descripcion: 'Cerdo (pierna industrial)',        unidad: 'KG', stock: 600,  costo: 18.90 },
    { codigo: 'MP-FRUT-001', descripcion: 'Papa blanca (saco 50kg)',          unidad: 'KG', stock: 2400, costo: 2.80 },
    { codigo: 'MP-FRUT-002', descripcion: 'Cebolla roja',                     unidad: 'KG', stock: 1800, costo: 3.20 },
    { codigo: 'MP-FRUT-003', descripcion: 'Tomate italiano',                  unidad: 'KG', stock: 1500, costo: 4.10 },
    { codigo: 'MP-FRUT-004', descripcion: 'Plátano de seda',                  unidad: 'KG', stock: 900,  costo: 3.50 },
    { codigo: 'MP-PANA-001', descripcion: 'Pan francés (insumo panadería)',   unidad: 'KG', stock: 400,  costo: 5.20 }
];

// Activos fijos (infraestructura retail)
const PV_ACTIVOS = [
    { codigo: 'AF-001', descripcion: 'Local comercial Miraflores (Alquiler)',    fecha: '2024-01-15', costo: 3500000, dep: 875000 },
    { codigo: 'AF-002', descripcion: 'Cámaras frigoríficas perecibles',          fecha: '2024-03-20', costo: 480000,  dep: 120000 },
    { codigo: 'AF-003', descripcion: 'Flota de 12 camiones reparto',             fecha: '2024-06-10', costo: 1200000, dep: 300000 },
    { codigo: 'AF-004', descripcion: 'Sistema POS y servidores centrales',       fecha: '2025-01-05', costo: 850000,  dep: 141666 },
    { codigo: 'AF-005', descripcion: 'Mobiliario y góndolas de tienda',          fecha: '2024-08-01', costo: 620000,  dep: 155000 },
    { codigo: 'AF-006', descripcion: 'Montacargas de almacén (4 unidades)',      fecha: '2025-02-15', costo: 320000,  dep: 40000 }
];

// Planilla (trabajadores de supermercado)
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

// Inductores de costos retail
const PV_INDUCTORES = [
    { codigo: 'IND-01', inductor: 'Metros cuadrados de tienda',      unidad: 'm2',  valor: 4500 },
    { codigo: 'IND-02', inductor: 'Horas cajero',                    unidad: 'HC',  valor: 8500 },
    { codigo: 'IND-03', inductor: 'Kilovatios hora (refrigeración)', unidad: 'kWh', valor: 28500 },
    { codigo: 'IND-04', inductor: 'Unidades despachadas',            unidad: 'UND', valor: 48000 },
    { codigo: 'IND-05', inductor: 'Transacciones POS',               unidad: 'TXN', valor: 32000 }
];

// Repuestos (para flota de reparto y equipos)
const PV_REPUESTOS = [
    { codigo: 'REP-001', descripcion: 'Filtro de aceite camión Hyundai',    stock: 48, costo: 85.00 },
    { codigo: 'REP-002', descripcion: 'Neumático 295/80R22.5',              stock: 24, costo: 1250.00 },
    { codigo: 'REP-003', descripcion: 'Compresor de cámara frigorífica',    stock: 4,  costo: 3800.00 },
    { codigo: 'REP-004', descripcion: 'Batería 12V 100Ah',                  stock: 18, costo: 480.00 },
    { codigo: 'REP-005', descripcion: 'Faja de transmisión POS',            stock: 36, costo: 45.00 }
];

// Proveedores reales del sector retail peruano
const PV_PROVEEDORES = [
    { nombre: 'Alicorp S.A.A.',                    ruc: '20100055237', tipo: 'Abarrotes' },
    { nombre: 'Gloria S.A.',                       ruc: '20100190797', tipo: 'Lácteos' },
    { nombre: 'Backus y Johnston S.A.A.',          ruc: '20100114580', tipo: 'Bebidas' },
    { nombre: 'Coca-Cola Servicios del Perú',      ruc: '20331612731', tipo: 'Bebidas' },
    { nombre: 'Nestlé Perú S.A.',                  ruc: '20100111459', tipo: 'Abarrotes' },
    { nombre: 'Unilever Andina Perú S.A.',         ruc: '20254928612', tipo: 'Cuidado Personal' },
    { nombre: 'Kimberly Clark Perú S.A.',          ruc: '20100111597', tipo: 'Limpieza' },
    { nombre: 'Laive S.A.',                        ruc: '20100022481', tipo: 'Lácteos' },
    { nombre: 'Distribuidora Andina de Alimentos', ruc: '20512345678', tipo: 'Abarrotes' },
    { nombre: 'Frigorífico del Pacífico S.A.C.',   ruc: '20458791234', tipo: 'Carnes' }
];

// Clientes (empresas que compran al por mayor + B2B)
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
    if (!confirm('🛒 Se cargarán datos contables de PLAZA VEA (Supermercados Peruanos S.A.)\n\n📊 Incluye:\n   · 6 centros de costo por sección\n   · 16 productos retail\n   · 8 mercaderías a granel\n   · ~90 asientos contables\n   · Kardex con promedio ponderado\n\n¿Continuar?')) return;

    const status = document.getElementById('seedStatus');
    const setStatus = (msg, color = '#1765bc') => {
        if (status) status.innerHTML = `<div style="color:${color}; font-weight:600; padding:14px; background:#f0f7ff; border-radius:8px; margin-top:12px; border-left:4px solid ${color};">${msg}</div>`;
        console.log('[PV]', msg);
    };

    try {
        setStatus('🛒 Paso 1/8 · Insertando centros de costo por sección...');
        await pvInsertarCentros();

        setStatus('🛒 Paso 2/8 · Insertando productos retail y mercaderías...');
        await pvInsertarProductos();
        await pvInsertarMercaderias();

        setStatus('🛒 Paso 3/8 · Insertando activos, planillas, inductores y repuestos...');
        await pvInsertarActivos();
        await pvInsertarPlanillas();
        await pvInsertarInductores();
        await pvInsertarRepuestos();

        setStatus('🛒 Paso 4/8 · Generando compras a proveedores...');
        await pvInsertarCompras();

        setStatus('🛒 Paso 5/8 · Generando ventas retail (facturas + boletas)...');
        await pvInsertarVentas();

        setStatus('🛒 Paso 6/8 · Generando asientos de planilla y gastos operativos...');
        await pvInsertarPlanillasContables();
        await pvInsertarGastosOperativos();

        setStatus('🛒 Paso 7/8 · Generando depreciaciones y ajustes de cierre...');
        await pvInsertarDepreciacionesYAjustes();

        setStatus('🛒 Paso 8/8 · Generando Kardex de productos...');
        await pvInsertarKardex();

        setStatus('✅ ¡Datos de Plaza Vea cargados exitosamente! Recarga la página.', '#087565');
        showAlert('✅ Plaza Vea cargado. Recarga index.html para ver el dashboard.', 'success');

    } catch (error) {
        console.error('Error cargando Plaza Vea:', error);
        setStatus('❌ Error: ' + error.message, '#b42335');
        showAlert('Error: ' + error.message, 'error');
    }
}

// ==================== INSERTORES ====================

async function pvInsertarCentros() {
    const existentes = await DB.getAll('centrosCosto');
    if (existentes.some(c => (c.codigo || '').startsWith('CC-'))) {
        console.log('[PV] Centros ya existen, omitiendo');
        return;
    }
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

// ==================== COMPRAS ====================
async function pvInsertarCompras() {
    const asientosExistentes = await DB.getAll('asientos');
    if (asientosExistentes.some(a => (a.glosa || '').startsWith(PV_MARKER))) {
        console.log('[PV] Datos ya existen, omitiendo');
        return;
    }

    let contador = asientosExistentes.length + 1;
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let totalCompras = 0;

    for (const mes of meses) {
        // 4-6 compras por mes (supermercado compra a muchos proveedores)
        const numCompras = pvAleatorioInt(4, 6);
        for (let i = 0; i < numCompras; i++) {
            const prov = pvElegir(PV_PROVEEDORES);
            const base = pvRedondear(pvAleatorio(45000, 180000));
            const igv = pvRedondear(base * 0.18);
            const total = pvRedondear(base + igv);
            const dia = pvAleatorioInt(3, 25);
            const fecha = pvFecha(2026, mes, dia);
            const numeroFactura = `F${String(_aleatorioInt(100,999)).padStart(3,'0')}-${String(pvAleatorioInt(1000,9999))}`;

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

            const numAsiento = `AS-${String(contador++).padStart(3, '0')}`;
            await DB.insert('asientos', {
                numero: numAsiento,
                fecha,
                tipo: 'normal',
                glosa: PV_MARKER + `Compra según ${numeroFactura} - ${prov.nombre}`,
                lineas: [
                    { cuenta: '601', nombre: 'Mercaderías',        debe: base, haber: 0 },
                    { cuenta: '401', nombre: 'IGV',                debe: igv,  haber: 0 },
                    { cuenta: '421', nombre: 'Facturas por Pagar', debe: 0,    haber: total }
                ],
                estado: 'validado'
            });
            totalCompras += base;
        }
    }
    console.log(`✅ Compras insertadas. Total: S/ ${totalCompras.toFixed(2)}`);
}

// ==================== VENTAS ====================
async function pvInsertarVentas() {
    const asientosExistentes = await DB.getAll('asientos');
    if (asientosExistentes.some(a => (a.glosa || '').includes('Venta diaria'))) {
        console.log('[PV] Ventas ya existen, omitiendo');
        return;
    }

    let contador = (await DB.getAll('asientos')).length + 1;
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let totalVentas = 0;

    for (const mes of meses) {
        // 5 ventas por mes (mezcla B2B + boletas retail)
        const numVentas = 5;
        for (let i = 0; i < numVentas; i++) {
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
            const numeroDoc = esB2B 
                ? `F001-${String(pvAleatorioInt(1000,9999))}`
                : `B001-${String(pvAleatorioInt(10000,99999))}`;

            await DB.insert('ventas', {
                fecha,
                cliente: cli.nombre,
                ruc: cli.ruc,
                tipo: tipoDoc,
                numero: numeroDoc,
                base,
                igv,
                total
            });

            const numAsiento = `AS-${String(contador++).padStart(3, '0')}`;
            await DB.insert('asientos', {
                numero: numAsiento,
                fecha,
                tipo: 'normal',
                glosa: PV_MARKER + `Venta diaria ${tipoDoc} ${numeroDoc} - ${cli.nombre}`,
                lineas: [
                    { cuenta: '121', nombre: 'Facturas por Cobrar', debe: total, haber: 0 },
                    { cuenta: '401', nombre: 'IGV',                 debe: 0,     haber: igv },
                    { cuenta: '701', nombre: 'Mercaderías',         debe: 0,     haber: base }
                ],
                estado: 'validado'
            });

            // Costo de ventas (~75% del precio = margen bruto 25%, típico supermercado)
            const costoVentas = pvRedondear(base * 0.75);
            const numAsientoCosto = `AS-${String(contador++).padStart(3, '0')}`;
            await DB.insert('asientos', {
                numero: numAsientoCosto,
                fecha,
                tipo: 'normal',
                glosa: PV_MARKER + `Costo de ventas ${numeroDoc}`,
                lineas: [
                    { cuenta: '691', nombre: 'Costo de Mercaderías Vendidas', debe: costoVentas, haber: 0 },
                    { cuenta: '201', nombre: 'Mercaderías - Costo',           debe: 0,           haber: costoVentas }
                ],
                estado: 'validado'
            });
            totalVentas += base;
        }
    }
    console.log(`✅ Ventas insertadas. Total: S/ ${totalVentas.toFixed(2)}`);
}

// ==================== PLANILLA CONTABLE ====================
async function pvInsertarPlanillasContables() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Planilla'))) return;

    let contador = asientos.length + 1;
    const totalSueldos = PV_PLANILLAS.reduce((s, p) => s + p.sueldo, 0);
    const afp = pvRedondear(totalSueldos * 0.13);
    const essalud = pvRedondear(totalSueldos * 0.09);
    const netoPagar = pvRedondear(totalSueldos - afp);

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        const fecha = pvFecha(2026, mes, 28);
        const numAsiento = `AS-${String(contador++).padStart(3, '0')}`;

        await DB.insert('asientos', {
            numero: numAsiento,
            fecha,
            tipo: 'normal',
            glosa: PV_MARKER + `Planilla de sueldos mes ${mes}/2026 - Plaza Vea`,
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
    console.log(`✅ ${9} planillas insertadas. Total mensual: S/ ${totalSueldos.toFixed(2)}`);
}

// ==================== GASTOS OPERATIVOS ====================
async function pvInsertarGastosOperativos() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Servicios básicos'))) return;

    let contador = asientos.length + 1;

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        // Servicios básicos (luz, agua, telefonía)
        const fechaServ = pvFecha(2026, mes, 10);
        const luz = pvRedondear(pvAleatorio(35000, 55000)); // consumo alto por refrigeración
        const agua = pvRedondear(pvAleatorio(3000, 5000));
        const internet = pvRedondear(pvAleatorio(2500, 4000));
        const totalServ = pvRedondear(luz + agua + internet);

        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha: fechaServ,
            tipo: 'normal',
            glosa: PV_MARKER + `Servicios básicos mes ${mes}/2026`,
            lineas: [
                { cuenta: '633', nombre: 'Servicios Básicos',        debe: totalServ, haber: 0 },
                { cuenta: '421', nombre: 'Facturas por Pagar',       debe: 0,         haber: totalServ }
            ],
            estado: 'validado'
        });

        // Publicidad y marketing (constante en retail)
        const fechaMkt = pvFecha(2026, mes, 15);
        const mkt = pvRedondear(pvAleatorio(18000, 35000));

        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha: fechaMkt,
            tipo: 'normal',
            glosa: PV_MARKER + `Publicidad y marketing mes ${mes}/2026`,
            lineas: [
                { cuenta: '637', nombre: 'Publicidad y Marketing',  debe: mkt, haber: 0 },
                { cuenta: '421', nombre: 'Facturas por Pagar',      debe: 0,   haber: mkt }
            ],
            estado: 'validado'
        });

        // Alquiler de local (muy alto en retail)
        const fechaAlq = pvFecha(2026, mes, 5);
        const alquiler = pvRedondear(pvAleatorio(85000, 120000));

        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha: fechaAlq,
            tipo: 'normal',
            glosa: PV_MARKER + `Alquiler de local comercial mes ${mes}/2026`,
            lineas: [
                { cuenta: '632', nombre: 'Alquileres',              debe: alquiler, haber: 0 },
                { cuenta: '421', nombre: 'Facturas por Pagar',      debe: 0,        haber: alquiler }
            ],
            estado: 'validado'
        });
    }
    console.log('✅ Gastos operativos insertados');
}

// ==================== DEPRECIACIONES Y AJUSTES ====================
async function pvInsertarDepreciacionesYAjustes() {
    const asientos = await DB.getAll('asientos');
    if (asientos.some(a => (a.glosa || '').includes('Depreciación'))) return;

    let contador = asientos.length + 1;
    const totalDepMensual = PV_ACTIVOS.reduce((s, a) => s + (a.costo * 0.10 / 12), 0);

    // Depreciación trimestral
    for (const mes of [3, 6, 9]) {
        const fecha = pvFecha(2026, mes, 30);
        const montoDep = pvRedondear(totalDepMensual * 3);

        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha,
            tipo: 'ajuste',
            glosa: PV_MARKER + `Depreciación trimestral activos fijos - T${mes/3}/2026`,
            lineas: [
                { cuenta: '681', nombre: 'Depreciación IME',       debe: montoDep, haber: 0 },
                { cuenta: '391', nombre: 'Depreciación Acumulada', debe: 0,        haber: montoDep }
            ],
            estado: 'validado'
        });
    }

    // Pagos a proveedores
    for (const mes of [2, 4, 6, 8, 9]) {
        const fecha = pvFecha(2026, mes, 20);
        const monto = pvRedondear(pvAleatorio(150000, 350000));

        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha,
            tipo: 'normal',
            glosa: PV_MARKER + `Pago a proveedores mes ${mes}/2026`,
            lineas: [
                { cuenta: '421', nombre: 'Facturas por Pagar',  debe: monto, haber: 0 },
                { cuenta: '104', nombre: 'Cuentas Corrientes',  debe: 0,     haber: monto }
            ],
            estado: 'validado'
        });
    }

    // Cobros a clientes
    for (const mes of [2, 4, 6, 8, 9]) {
        const fecha = pvFecha(2026, mes, 25);
        const monto = pvRedondear(pvAleatorio(180000, 400000));

        await DB.insert('asientos', {
            numero: `AS-${String(contador++).padStart(3, '0')}`,
            fecha,
            tipo: 'normal',
            glosa: PV_MARKER + `Cobro a clientes mes ${mes}/2026`,
            lineas: [
                { cuenta: '104', nombre: 'Cuentas Corrientes',   debe: monto, haber: 0 },
                { cuenta: '121', nombre: 'Facturas por Cobrar',  debe: 0,     haber: monto }
            ],
            estado: 'validado'
        });
    }

    console.log('✅ Depreciaciones y ajustes insertados');
}

// ==================== KARDEX ====================
async function pvInsertarKardex() {
    const existentes = await DB.getAll('kardex');
    if (existentes.some(k => (k.descripcion || '').startsWith(PV_MARKER))) return;

    const saldos = {};
    PV_MERCADERIAS.forEach(m => {
        saldos[m.codigo] = { cant: 0, total: 0, costoProm: m.costo };
    });

    for (const mes of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        // ENTRADAS
        for (const m of PV_MERCADERIAS) {
            if (Math.random() < 0.3) continue;
            const cantidad = pvAleatorioInt(200, 800);
            const costoUnit = pvRedondear(m.costo * pvAleatorio(0.95, 1.05)); // fluctuación de precios
            const costoTotal = pvRedondear(cantidad * costoUnit);
            const fecha = pvFecha(2026, mes, pvAleatorioInt(3, 12));

            saldos[m.codigo].cant += cantidad;
            saldos[m.codigo].total += costoTotal;
            saldos[m.codigo].costoProm = saldos[m.codigo].cant > 0 ? saldos[m.codigo].total / saldos[m.codigo].cant : 0;

            await DB.insert('kardex', {
                producto_codigo: m.codigo,
                producto_nombre: m.descripcion,
                fecha,
                tipo_movimiento: 'entrada',
                documento: `F00${pvAleatorioInt(100,999)}-${pvAleatorioInt(1000,9999)}`,
                descripcion: PV_MARKER + `Compra ${m.descripcion}`,
                cantidad,
                costo_unitario: costoUnit,
                costo_total: costoTotal,
                saldo_cantidad: saldos[m.codigo].cant,
                saldo_costo_unitario: saldos[m.codigo].costoProm,
                saldo_total: saldos[m.codigo].total,
                metodo_valorizacion: 'promedio'
            });
        }

        // SALIDAS (ventas / consumo)
        for (const m of PV_MERCADERIAS) {
            if (saldos[m.codigo].cant < 100) continue;
            const cantidad = pvAleatorioInt(80, 400);
            const costoUnit = saldos[m.codigo].costoProm;
            const costoTotal = pvRedondear(cantidad * costoUnit);
            const fecha = pvFecha(2026, mes, pvAleatorioInt(15, 28));

            saldos[m.codigo].cant -= cantidad;
            saldos[m.codigo].total -= costoTotal;

            await DB.insert('kardex', {
                producto_codigo: m.codigo,
                producto_nombre: m.descripcion,
                fecha,
                tipo_movimiento: 'salida',
                documento: `VTA-${pvAleatorioInt(10000,99999)}`,
                descripcion: PV_MARKER + `Salida por venta ${m.descripcion}`,
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

    // Actualizar stocks finales
    for (const m of PV_MERCADERIAS) {
        const mercs = await DB.getAll('mercaderias');
        const merc = mercs.find(x => x.codigo === m.codigo);
        if (merc) {
            await DB.update('mercaderias', merc.id, {
                stock: saldos[m.codigo].cant,
                costo: pvRedondear(saldos[m.codigo].costoProm)
            });
        }
    }

    console.log('✅ Kardex Plaza Vea insertado');
}

// ==================== LIMPIAR SOLO PLAZA VEA ====================
async function borrarDatosPlazaVea() {
    if (!confirm('⚠️ Se eliminarán SOLO los datos de Plaza Vea (marca "PV · ").\n\n¿Continuar?')) return;
    if (!confirm('🔴 Última confirmación. ¿Estás seguro?')) return;

    try {
        const status = document.getElementById('seedStatus');
        const setStatus = (msg, color = '#b42335') => {
            if (status) status.innerHTML = `<div style="color:${color}; font-weight:600; padding:14px; background:#fff0f0; border-radius:8px; margin-top:12px; border-left:4px solid ${color};">${msg}</div>`;
            console.log('[PV]', msg);
        };

        setStatus('🗑️ Borrando asientos Plaza Vea...');
        const asientos = await DB.getAll('asientos');
        const asientosPV = asientos.filter(a => (a.glosa || '').startsWith(PV_MARKER));
        for (const a of asientosPV) await DB.delete('asientos', a.id);
        console.log(`   ${asientosPV.length} asientos borrados`);

        setStatus('🗑️ Borrando kardex Plaza Vea...');
        const kardex = await DB.getAll('kardex');
        const kardexPV = kardex.filter(k => (k.descripcion || '').startsWith(PV_MARKER));
        for (const k of kardexPV) await DB.delete('kardex', k.id);
        console.log(`   ${kardexPV.length} movimientos borrados`);

        setStatus('🗑️ Borrando compras y ventas...');
        const compras = await DB.getAll('compras');
        for (const c of compras) if (PV_PROVEEDORES.some(p => p.ruc === c.ruc)) await DB.delete('compras', c.id);
        const ventas = await DB.getAll('ventas');
        for (const v of ventas) if (PV_CLIENTES.some(cl => cl.ruc === v.ruc)) await DB.delete('ventas', v.id);

        setStatus('🗑️ Borrando datos maestros Plaza Vea...');
        for (const tbl of ['productos', 'mercaderias', 'activoFijo', 'planillas', 'inductores', 'repuestos', 'centrosCosto']) {
            const items = await DB.getAll(tbl);
            const prefijos = { productos: 'PT-', mercaderias: 'MP-', activoFijo: 'AF-', planillas: 'EMP-', inductores: 'IND-', repuestos: 'REP-', centrosCosto: 'CC-' };
            const pref = prefijos[tbl];
            for (const it of items) if ((it.codigo || '').startsWith(pref)) await DB.delete(tbl, it.id);
        }

        setStatus('✅ Datos Plaza Vea eliminados.', '#087565');
        showAlert('Plaza Vea eliminado. Recarga la página.', 'success');
    } catch (error) {
        console.error('Error borrando Plaza Vea:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}