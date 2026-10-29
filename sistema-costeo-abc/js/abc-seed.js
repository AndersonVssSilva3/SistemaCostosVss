// ==================== COSTEO ABC · DATOS SEMILLA ====================
// Modelo base de una planta embotelladora de bebidas (agua San Luis y Coca-Cola).
// Se usa para poblar las tablas abc_* la primera vez, o en memoria si aún no existen.

// Normaliza textos para comparar cargos (sin tildes ni mayúsculas)
function abcNorm(s) {
    return String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

// -------- Objetos de costo (se registran también en la tabla productos) --------
const ABC_SEED_PRODUCTOS = [
    { codigo: 'BEB-SL600', nombre: 'Agua San Luis 600 ml', presentacion: 'Botella PET 600 ml', precio: 1.20, unidades: 180000 },
    { codigo: 'BEB-SL3L',  nombre: 'Agua San Luis 3 L',    presentacion: 'Botella PET 3 L',    precio: 3.80, unidades: 40000 },
    { codigo: 'BEB-SL7L',  nombre: 'Agua San Luis 7 L',    presentacion: 'Bidón PET 7 L',      precio: 7.50, unidades: 15000 },
    { codigo: 'BEB-CC600', nombre: 'Coca-Cola 600 ml',     presentacion: 'Botella PET 600 ml', precio: 2.50, unidades: 120000 },
    { codigo: 'BEB-CC15',  nombre: 'Coca-Cola 1.5 L',      presentacion: 'Botella PET 1.5 L',  precio: 5.20, unidades: 50000 }
];

// -------- Centros de actividad (Mapa de procesos · Organigrama · MOF) --------
const ABC_SEED_CENTROS = [
    { codigo: 'CA-GER', padre: null,  nombre: 'Gerencia General',          tipo: 'estrategico', responsable: 'Gerente General',
      funciones: 'Definir la visión, objetivos y presupuesto anual; dirigir y controlar la gestión de todas las áreas; representar legalmente a la empresa.' },
    { codigo: 'CA-CAL', padre: 'CA-GER',  nombre: 'Gestión de Calidad',        tipo: 'estrategico', responsable: 'Inspector de Calidad',
      funciones: 'Establecer estándares de calidad e inocuidad (BPM, HACCP); inspeccionar lotes; realizar análisis fisicoquímicos y microbiológicos.' },
    { codigo: 'CA-AGU', padre: 'CA-EMB',  nombre: 'Tratamiento de Agua',       tipo: 'operativo',   responsable: 'Jefa de Planta',
      funciones: 'Captar, filtrar, ablandar y purificar el agua (ósmosis inversa, UV y ozono) para producción y bebidas.' },
    { codigo: 'CA-MEZ', padre: 'CA-EMB',  nombre: 'Mezclado',                  tipo: 'operativo',   responsable: 'Supervisor de Producción',
      funciones: 'Preparar el jarabe simple y terminado con concentrado y azúcar; carbonatar la bebida según la fórmula.' },
    { codigo: 'CA-EMB', padre: 'CA-GER',  nombre: 'Embotellado',               tipo: 'operativo',   responsable: 'Supervisor de Producción',
      funciones: 'Soplar preformas, llenar y tapar botellas, codificar, etiquetar y empacar en paquetes termocontraídos.' },
    { codigo: 'CA-ALM', padre: 'CA-GER',  nombre: 'Almacén y Despacho',        tipo: 'operativo',   responsable: 'Jefa de Logística',
      funciones: 'Recibir y almacenar insumos y producto terminado; preparar pedidos y distribuir a clientes.' },
    { codigo: 'CA-COM', padre: 'CA-GER',  nombre: 'Comercialización y Ventas', tipo: 'operativo',   responsable: 'Gerente General',
      funciones: 'Gestionar pedidos de clientes, campañas de publicidad y promoción, y comisiones de la fuerza de ventas.' },
    { codigo: 'CA-RRHH', padre: 'CA-GER', nombre: 'Recursos Humanos',          tipo: 'apoyo',       responsable: 'Jefa de RRHH',
      funciones: 'Reclutar, seleccionar y capacitar personal; elaborar planillas; gestionar bienestar y seguridad laboral.' },
    { codigo: 'CA-CONT', padre: 'CA-GER', nombre: 'Contabilidad',              tipo: 'apoyo',       responsable: 'Contador General',
      funciones: 'Registrar operaciones, calcular costos, elaborar estados financieros, declarar tributos y gestionar pagos.' },
    { codigo: 'CA-TI', padre: 'CA-CONT',   nombre: 'Tecnologías de Información', tipo: 'apoyo',      responsable: 'Contador General',
      funciones: 'Administrar el ERP, redes, equipos y licencias; brindar soporte a usuarios y respaldo de información.' },
    { codigo: 'CA-MANT', padre: 'CA-EMB', nombre: 'Mantenimiento',             tipo: 'apoyo',       responsable: 'Técnico de Mantenimiento',
      funciones: 'Ejecutar el mantenimiento preventivo y correctivo de maquinaria, líneas de llenado y equipos de planta.' }
];

// -------- Recursos (CIF, Gastos de Administración, Gastos de Ventas) · montos mensuales --------
// La mano de obra (MOD / MOI) se toma de la tabla planillas según el período.
const ABC_SEED_RECURSOS = [
    { codigo: 'R-CIF-01', nombre: 'Energía eléctrica',                   categoria: 'CIF',  monto: 18500,
      dist: { 'CA-AGU': 25, 'CA-MEZ': 20, 'CA-EMB': 40, 'CA-ALM': 5, 'CA-MANT': 5, 'CA-TI': 5 } },
    { codigo: 'R-CIF-02', nombre: 'Agua y desagüe industrial',           categoria: 'CIF',  monto: 6200,
      dist: { 'CA-AGU': 80, 'CA-MEZ': 15, 'CA-EMB': 5 } },
    { codigo: 'R-CIF-03', nombre: 'Depreciación de maquinaria y equipo', categoria: 'CIF',  monto: 14000,
      dist: { 'CA-AGU': 25, 'CA-MEZ': 20, 'CA-EMB': 50, 'CA-ALM': 5 } },
    { codigo: 'R-CIF-04', nombre: 'Repuestos y materiales de mantenimiento', categoria: 'CIF', monto: 5800,
      dist: { 'CA-MANT': 100 } },
    { codigo: 'R-CIF-05', nombre: 'Insumos de laboratorio y químicos',   categoria: 'CIF',  monto: 3100,
      dist: { 'CA-AGU': 60, 'CA-CAL': 40 } },
    { codigo: 'R-CIF-06', nombre: 'Seguros de planta',                   categoria: 'CIF',  monto: 2400,
      dist: { 'CA-AGU': 25, 'CA-MEZ': 25, 'CA-EMB': 35, 'CA-ALM': 15 } },
    { codigo: 'R-GA-01',  nombre: 'Alquiler de oficinas',                categoria: 'GADM', monto: 4500,
      dist: { 'CA-GER': 30, 'CA-CONT': 25, 'CA-RRHH': 20, 'CA-TI': 25 } },
    { codigo: 'R-GA-02',  nombre: 'Software y licencias',                categoria: 'GADM', monto: 2800,
      dist: { 'CA-TI': 100 } },
    { codigo: 'R-GA-03',  nombre: 'Servicios profesionales (auditoría y legal)', categoria: 'GADM', monto: 3200,
      dist: { 'CA-GER': 50, 'CA-CONT': 50 } },
    { codigo: 'R-GA-04',  nombre: 'Telefonía e internet',                categoria: 'GADM', monto: 1200,
      dist: { 'CA-TI': 70, 'CA-GER': 10, 'CA-CONT': 10, 'CA-RRHH': 10 } },
    { codigo: 'R-GA-05',  nombre: 'Útiles de oficina',                   categoria: 'GADM', monto: 900,
      dist: { 'CA-CONT': 40, 'CA-RRHH': 30, 'CA-GER': 30 } },
    { codigo: 'R-GV-01',  nombre: 'Publicidad y marketing',              categoria: 'GVTA', monto: 9000,
      dist: { 'CA-COM': 100 } },
    { codigo: 'R-GV-02',  nombre: 'Fletes de distribución',              categoria: 'GVTA', monto: 12500,
      dist: { 'CA-ALM': 100 } },
    { codigo: 'R-GV-03',  nombre: 'Comisiones de venta',                 categoria: 'GVTA', monto: 4000,
      dist: { 'CA-COM': 100 } }
];

// -------- Distribución de cada cargo de la planilla (inductor tipo 1: % de tiempo) --------
const ABC_SEED_CARGOS = {
    'gerente general':           { categoria: 'GADM', dist: { 'CA-GER': 80, 'CA-COM': 20 } },
    'jefa de planta':            { categoria: 'MOI',  dist: { 'CA-AGU': 20, 'CA-MEZ': 30, 'CA-EMB': 40, 'CA-CAL': 10 } },
    'jefe de planta':            { categoria: 'MOI',  dist: { 'CA-AGU': 20, 'CA-MEZ': 30, 'CA-EMB': 40, 'CA-CAL': 10 } },
    'supervisor de produccion':  { categoria: 'MOI',  dist: { 'CA-AGU': 25, 'CA-MEZ': 30, 'CA-EMB': 45 } },
    'jefa de logistica':         { categoria: 'GVTA', dist: { 'CA-ALM': 100 } },
    'jefe de logistica':         { categoria: 'GVTA', dist: { 'CA-ALM': 100 } },
    'contador general':          { categoria: 'GADM', dist: { 'CA-CONT': 100 } },
    'jefa de rrhh':              { categoria: 'GADM', dist: { 'CA-RRHH': 100 } },
    'jefe de rrhh':              { categoria: 'GADM', dist: { 'CA-RRHH': 100 } },
    'tecnico de mantenimiento':  { categoria: 'MOI',  dist: { 'CA-MANT': 100 } },
    'inspector de calidad':      { categoria: 'MOI',  dist: { 'CA-CAL': 100 } },
    'almacenera de mp':          { categoria: 'MOI',  dist: { 'CA-ALM': 100 } },
    'almacenero de mp':          { categoria: 'MOI',  dist: { 'CA-ALM': 100 } },
    'operario de linea a':       { categoria: 'MOD',  dist: { 'CA-MEZ': 40, 'CA-EMB': 60 } },
    'operaria de linea a':       { categoria: 'MOD',  dist: { 'CA-AGU': 30, 'CA-EMB': 70 } },
    'ayudante de planta':        { categoria: 'MOD',  dist: { 'CA-AGU': 40, 'CA-EMB': 30, 'CA-ALM': 30 } },
    'asistente administrativa':  { categoria: 'GADM', dist: { 'CA-CONT': 50, 'CA-RRHH': 30, 'CA-GER': 20 } }
};

// Regla de respaldo para cargos nuevos que aparezcan en la planilla
function abcCargoPorDefecto(cargo) {
    const c = abcNorm(cargo);
    if (ABC_SEED_CARGOS[c]) return ABC_SEED_CARGOS[c];
    if (/operari|ayudante|envasad/.test(c))   return { categoria: 'MOD',  dist: { 'CA-EMB': 100 } };
    if (/mantenim/.test(c))                    return { categoria: 'MOI',  dist: { 'CA-MANT': 100 } };
    if (/calidad|laborator/.test(c))           return { categoria: 'MOI',  dist: { 'CA-CAL': 100 } };
    if (/almac|logist|chofer|despach/.test(c)) return { categoria: 'GVTA', dist: { 'CA-ALM': 100 } };
    if (/venta|comercial|marketing/.test(c))   return { categoria: 'GVTA', dist: { 'CA-COM': 100 } };
    if (/planta|produccion|supervisor/.test(c)) return { categoria: 'MOI', dist: { 'CA-EMB': 100 } };
    if (/rrhh|recursos humanos|personal/.test(c)) return { categoria: 'GADM', dist: { 'CA-RRHH': 100 } };
    if (/sistemas|ti\b|informatic/.test(c))    return { categoria: 'GADM', dist: { 'CA-TI': 100 } };
    if (/contab|contador|tesor|finanz/.test(c)) return { categoria: 'GADM', dist: { 'CA-CONT': 100 } };
    return { categoria: 'GADM', dist: { 'CA-GER': 100 } };
}

// Centro donde el cargo dedica el mayor % de tiempo (ubicación inicial en el organigrama)
function abcCentroPrincipal(dist) {
    let mejor = null, max = -1;
    Object.entries(dist).forEach(([c, p]) => { if (p > max) { max = p; mejor = c; } });
    return mejor;
}

// -------- Inductores tipo 3 (actividad → objeto de costo) --------
const ABC_SEED_INDUCTORES = [
    { codigo: 'IND-VTA',  nombre: 'Ventas valorizadas',          unidad: 'S/' },
    { codigo: 'IND-UND',  nombre: 'Unidades producidas',         unidad: 'und' },
    { codigo: 'IND-LOT',  nombre: 'Nº de lotes de producción',   unidad: 'lotes' },
    { codigo: 'IND-MUE',  nombre: 'Nº de muestras de laboratorio', unidad: 'muestras' },
    { codigo: 'IND-LIT',  nombre: 'Litros de agua tratada',      unidad: 'L' },
    { codigo: 'IND-JAR',  nombre: 'Litros de jarabe',            unidad: 'L' },
    { codigo: 'IND-CO2',  nombre: 'Litros carbonatados',         unidad: 'L' },
    { codigo: 'IND-HMQ',  nombre: 'Horas máquina',               unidad: 'h-m' },
    { codigo: 'IND-PAQ',  nombre: 'Nº de paquetes',              unidad: 'paq' },
    { codigo: 'IND-PAL',  nombre: 'Nº de pallets',               unidad: 'pallets' },
    { codigo: 'IND-DES',  nombre: 'Nº de despachos',             unidad: 'despachos' },
    { codigo: 'IND-PED',  nombre: 'Nº de pedidos',               unidad: 'pedidos' },
    { codigo: 'IND-HMOD', nombre: 'Horas de mano de obra directa', unidad: 'h-h' },
    { codigo: 'IND-TRX',  nombre: 'Nº de transacciones',         unidad: 'trx' },
    { codigo: 'IND-PAR',  nombre: 'Nº de paradas de máquina',    unidad: 'paradas' }
];

// Consumo mensual de cada inductor por producto: [SL600, SL3L, SL7L, CC600, CC15]
const ABC_SEED_CONSUMO = {
    'IND-UND':  [180000, 40000, 15000, 120000, 50000],
    'IND-LOT':  [30, 12, 8, 24, 14],
    'IND-MUE':  [60, 24, 16, 96, 56],
    'IND-LIT':  [108000, 120000, 105000, 64800, 67500],
    'IND-JAR':  [0, 0, 0, 14400, 15000],
    'IND-CO2':  [0, 0, 0, 72000, 75000],
    'IND-HMQ':  [150, 80, 60, 130, 90],
    'IND-PAQ':  [12000, 10000, 15000, 10000, 8333],
    'IND-PAL':  [120, 90, 110, 100, 85],
    'IND-DES':  [90, 50, 40, 110, 70],
    'IND-PED':  [400, 180, 150, 450, 260],
    'IND-HMOD': [320, 180, 140, 380, 240],
    'IND-TRX':  [90, 45, 35, 110, 60],
    'IND-PAR':  [6, 4, 3, 8, 5]
    // IND-VTA se calcula: unidades × precio
};

// -------- Actividades (inductor tipo 2: % del centro) --------
const ABC_SEED_ACTIVIDADES = [
    { codigo: 'ACT-01', nombre: 'Planeamiento estratégico',         centro: 'CA-GER',  porcentaje: 60, inductor: 'IND-VTA' },
    { codigo: 'ACT-02', nombre: 'Dirección y control de gestión',   centro: 'CA-GER',  porcentaje: 40, inductor: 'IND-UND' },
    { codigo: 'ACT-03', nombre: 'Inspección de lotes',              centro: 'CA-CAL',  porcentaje: 65, inductor: 'IND-LOT' },
    { codigo: 'ACT-04', nombre: 'Análisis de laboratorio',          centro: 'CA-CAL',  porcentaje: 35, inductor: 'IND-MUE' },
    { codigo: 'ACT-05', nombre: 'Captación y filtrado de agua',     centro: 'CA-AGU',  porcentaje: 40, inductor: 'IND-LIT' },
    { codigo: 'ACT-06', nombre: 'Ósmosis inversa y ozonización',    centro: 'CA-AGU',  porcentaje: 60, inductor: 'IND-LIT' },
    { codigo: 'ACT-07', nombre: 'Preparación de jarabe',            centro: 'CA-MEZ',  porcentaje: 70, inductor: 'IND-JAR' },
    { codigo: 'ACT-08', nombre: 'Carbonatación',                    centro: 'CA-MEZ',  porcentaje: 30, inductor: 'IND-CO2' },
    { codigo: 'ACT-09', nombre: 'Soplado de preformas',             centro: 'CA-EMB',  porcentaje: 30, inductor: 'IND-UND' },
    { codigo: 'ACT-10', nombre: 'Llenado y tapado',                 centro: 'CA-EMB',  porcentaje: 45, inductor: 'IND-HMQ' },
    { codigo: 'ACT-11', nombre: 'Etiquetado y empaque',             centro: 'CA-EMB',  porcentaje: 25, inductor: 'IND-PAQ' },
    { codigo: 'ACT-12', nombre: 'Recepción y almacenamiento',       centro: 'CA-ALM',  porcentaje: 40, inductor: 'IND-PAL' },
    { codigo: 'ACT-13', nombre: 'Despacho y distribución',          centro: 'CA-ALM',  porcentaje: 60, inductor: 'IND-DES' },
    { codigo: 'ACT-14', nombre: 'Publicidad y promoción',           centro: 'CA-COM',  porcentaje: 60, inductor: 'IND-VTA' },
    { codigo: 'ACT-15', nombre: 'Gestión de pedidos',               centro: 'CA-COM',  porcentaje: 40, inductor: 'IND-PED' },
    { codigo: 'ACT-16', nombre: 'Reclutamiento y capacitación',     centro: 'CA-RRHH', porcentaje: 40, inductor: 'IND-HMOD' },
    { codigo: 'ACT-17', nombre: 'Planillas y bienestar',            centro: 'CA-RRHH', porcentaje: 60, inductor: 'IND-HMOD' },
    { codigo: 'ACT-18', nombre: 'Registro contable y costos',       centro: 'CA-CONT', porcentaje: 70, inductor: 'IND-TRX' },
    { codigo: 'ACT-19', nombre: 'Tesorería y pagos',                centro: 'CA-CONT', porcentaje: 30, inductor: 'IND-TRX' },
    { codigo: 'ACT-20', nombre: 'Soporte de sistemas (ERP)',        centro: 'CA-TI',   porcentaje: 100, inductor: 'IND-TRX' },
    { codigo: 'ACT-21', nombre: 'Mantenimiento preventivo',         centro: 'CA-MANT', porcentaje: 65, inductor: 'IND-HMQ' },
    { codigo: 'ACT-22', nombre: 'Mantenimiento correctivo',         centro: 'CA-MANT', porcentaje: 35, inductor: 'IND-PAR' }
];

// -------- Materia prima directa por unidad de producto (lista de materiales) --------
const ABC_SEED_MATERIALES = {
    'BEB-SL600': [
        ['Preforma PET 18 g', 1, 'und', 0.16], ['Tapa rosca', 1, 'und', 0.035], ['Etiqueta', 1, 'und', 0.025],
        ['Agua de pozo', 0.6, 'L', 0.002], ['Film termocontraíble', 1, 'und', 0.015]
    ],
    'BEB-SL3L': [
        ['Preforma PET 70 g', 1, 'und', 0.48], ['Tapa rosca', 1, 'und', 0.05], ['Asa plástica', 1, 'und', 0.03],
        ['Etiqueta', 1, 'und', 0.04], ['Agua de pozo', 3, 'L', 0.002], ['Film termocontraíble', 1, 'und', 0.03]
    ],
    'BEB-SL7L': [
        ['Bidón PET 7 L', 1, 'und', 1.10], ['Tapa con asa', 1, 'und', 0.12], ['Etiqueta', 1, 'und', 0.06],
        ['Agua de pozo', 7, 'L', 0.002]
    ],
    'BEB-CC600': [
        ['Preforma PET 22 g', 1, 'und', 0.18], ['Tapa rosca', 1, 'und', 0.035], ['Etiqueta', 1, 'und', 0.03],
        ['Agua de pozo', 0.54, 'L', 0.002], ['Concentrado', 0.12, 'L', 1.50], ['Azúcar', 0.06, 'kg', 3.20],
        ['CO2', 0.006, 'kg', 2.80], ['Film termocontraíble', 1, 'und', 0.015]
    ],
    'BEB-CC15': [
        ['Preforma PET 45 g', 1, 'und', 0.34], ['Tapa rosca', 1, 'und', 0.04], ['Etiqueta', 1, 'und', 0.045],
        ['Agua de pozo', 1.35, 'L', 0.002], ['Concentrado', 0.30, 'L', 1.50], ['Azúcar', 0.15, 'kg', 3.20],
        ['CO2', 0.015, 'kg', 2.80], ['Film termocontraíble', 1, 'und', 0.02]
    ]
};

// -------- Construye todas las filas a partir de las semillas y la planilla real --------
function abcConstruirSemilla(planillas) {
    const centros = ABC_SEED_CENTROS.map((c, i) => ({
        codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, responsable: c.responsable, funciones: c.funciones,
        padre_codigo: c.padre, orden: i + 1
    }));

    const recursos = [];
    const inductor1 = [];
    const organigrama = [];

    // Un recurso por cada cargo distinto de la planilla
    const cargos = [];
    (planillas || []).forEach(p => {
        if (p.empleado_cargo && !cargos.some(c => abcNorm(c) === abcNorm(p.empleado_cargo))) cargos.push(p.empleado_cargo);
    });
    cargos.forEach((cargo, i) => {
        const def = abcCargoPorDefecto(cargo);
        const codigo = 'R-PL-' + String(i + 1).padStart(2, '0');
        recursos.push({ codigo, nombre: 'Remuneración · ' + cargo, categoria: def.categoria, origen: 'planilla', cargo, monto: 0 });
        Object.entries(def.dist).forEach(([centro, pct]) => inductor1.push({ recurso_codigo: codigo, centro_codigo: centro, porcentaje: pct }));
        organigrama.push({ cargo, centro_codigo: abcCentroPrincipal(def.dist), orden: i + 1 });
    });

    ABC_SEED_RECURSOS.forEach(r => {
        recursos.push({ codigo: r.codigo, nombre: r.nombre, categoria: r.categoria, origen: 'manual', cargo: null, monto: r.monto });
        Object.entries(r.dist).forEach(([centro, pct]) => inductor1.push({ recurso_codigo: r.codigo, centro_codigo: centro, porcentaje: pct }));
    });

    const inductores = ABC_SEED_INDUCTORES.map(i => ({ ...i }));
    const actividades = ABC_SEED_ACTIVIDADES.map(a => ({
        codigo: a.codigo, nombre: a.nombre, centro_codigo: a.centro, porcentaje: a.porcentaje, inductor_codigo: a.inductor
    }));

    const objetos = ABC_SEED_PRODUCTOS.map(p => ({ producto_codigo: p.codigo, presentacion: p.presentacion, unidades: p.unidades }));

    const consumo = [];
    ABC_SEED_PRODUCTOS.forEach((p, idx) => {
        consumo.push({ inductor_codigo: 'IND-VTA', producto_codigo: p.codigo, cantidad: Math.round(p.unidades * p.precio * 100) / 100 });
        Object.entries(ABC_SEED_CONSUMO).forEach(([ind, valores]) => {
            consumo.push({ inductor_codigo: ind, producto_codigo: p.codigo, cantidad: valores[idx] });
        });
    });

    const materiales = [];
    Object.entries(ABC_SEED_MATERIALES).forEach(([prod, lineas]) => {
        lineas.forEach(([insumo, cantidad, unidad, costo]) => materiales.push({
            producto_codigo: prod, insumo, cantidad, unidad, costo_unitario: costo
        }));
    });

    return { centros, recursos, inductor1, inductores, actividades, objetos, consumo, materiales, organigrama };
}
