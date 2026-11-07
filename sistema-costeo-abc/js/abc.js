// ==================== SISTEMA DE COSTEO BASADO EN ACTIVIDADES (ABC) ====================
// Recursos ─(%)→ Centros de actividad ─[etapas de reparto entre centros]─(%)→ Actividades
//          ─[etapas de reparto entre actividades]─(inductor de actividad: consumo)→ Objetos de costo
// Por defecto el modelo tiene 5 etapas y se pueden agregar más (tabla abc_etapas).

const ABC_TABLAS = ['abc_centros', 'abc_recursos', 'abc_inductor1', 'abc_inductores',
                    'abc_actividades', 'abc_objetos_costo', 'abc_consumo', 'abc_materiales', 'abc_organigrama'];
// Tablas agregadas después: si aún no existen se trabaja con ellas en memoria
const ABC_TABLAS_EXT = { abc_etapas: 'etapas', abc_etapa_dist: 'etapaDist', abc_presupuestos: 'presupuestos', abc_recursos_mes: 'recursosMes' };
const ABC_MIN_ETAPAS = 5;
const ABC_UMBRAL_DEFECTO = 90;
const ABC_NIVELES_ETAPA = { centro: 'Centros → Centros', actividad: 'Actividades → Actividades' };

const ABC_TIPOS = {
    estrategico: { nombre: 'Estratégicos', icono: '🧭' },
    operativo:   { nombre: 'Operativos',   icono: '⚙️' },
    apoyo:       { nombre: 'Apoyo',        icono: '🛠️' }
};

const ABC_CATEGORIAS = {
    MOD:  'Mano de obra directa',
    MOI:  'Mano de obra indirecta (CIF)',
    CIF:  'Costos indirectos de fabricación',
    GADM: 'Gastos de administración',
    GVTA: 'Gastos de ventas'
};

// Jerarquía de costos según el inductor tipo 3 de la actividad
const ABC_NIVELES = {
    unidad:      'Unidad',
    lote:        'Lote',
    producto:    'Producto',
    instalacion: 'Sostenimiento'
};
const ABC_NIVEL_INDUCTOR = {
    'IND-UND': 'unidad', 'IND-LIT': 'unidad', 'IND-JAR': 'unidad', 'IND-CO2': 'unidad',
    'IND-HMQ': 'unidad', 'IND-PAQ': 'unidad', 'IND-HMOD': 'unidad',
    'IND-LOT': 'lote', 'IND-MUE': 'lote', 'IND-PAL': 'lote', 'IND-DES': 'lote', 'IND-PED': 'lote', 'IND-PAR': 'lote',
    'IND-TRX': 'producto',
    'IND-VTA': 'instalacion'
};

const ABC_SECCIONES_INICIO = [
    ['resumen',     '◉', 'Resumen ABC'],
    ['alertas',     '🚨', 'Alertas y Presupuesto'],
    ['analisis',    '◇', 'Análisis y Estructura'],
    ['centros',     '◈', 'Centros de Actividad'],
    ['recursos',    '▦', 'Recursos'],
    ['actividades', '⚙', 'Actividades']
];
const ABC_SECCIONES_FIN = [['objetos', '◎', 'Objeto de Costos']];

const abcCirculo = n => n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : '(' + n + ')';

function abcEtapasDe(nivel) {
    return abc.etapas.filter(e => e.nivel === nivel).sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(a.codigo).localeCompare(b.codigo));
}

// Todas las etapas del modelo en orden de cálculo: [{ id, nombre, fija, etapa? }]
function abcEtapasModelo() {
    const lista = [{ id: 'ind1', nombre: 'Recursos → Centros', fija: true }];
    abcEtapasDe('centro').forEach(e => lista.push({ id: 'etapa:' + e.codigo, nombre: e.nombre, etapa: e }));
    lista.push({ id: 'ind2', nombre: 'Centros → Actividades', fija: true });
    abcEtapasDe('actividad').forEach(e => lista.push({ id: 'etapa:' + e.codigo, nombre: e.nombre, etapa: e }));
    lista.push({ id: 'ind3', nombre: 'Actividades → Productos', fija: true });
    lista.forEach((x, i) => { x.num = i + 1; x.simbolo = abcCirculo(i + 1); });
    return lista;
}
const abcNumEtapa = id => (abcEtapasModelo().find(x => x.id === id) || {}).simbolo || '';

function abcSecciones() {
    return [...ABC_SECCIONES_INICIO, ...abcEtapasModelo().map(x => [x.id, x.simbolo, x.nombre]), ...ABC_SECCIONES_FIN];
}

const abc = {
    modo: 'db',            // 'db' = tablas abc_* en Supabase · 'local' = en memoria
    periodo: null,
    periodos: [],
    planillas: [],
    productos: [],
    centros: [], recursos: [], inductor1: [], inductores: [],
    actividades: [], objetos: [], consumo: [], materiales: [], organigrama: [],
    etapas: [], etapaDist: [], presupuestos: [], recursosMes: [],
    faltan: new Set(),     // tablas nuevas que aún no existen en Supabase (se usan en memoria)
    editMapa: false, editOrg: false,
    etapaActiva: null,
    modoMonto: 'mes',      // al editar un gasto: 'mes' = solo el período seleccionado · 'base' = monto base
    filtroAlertas: { tipo: 'todos', estado: 'alertas' },
    umbralNuevo: ABC_UMBRAL_DEFECTO,
    calc: null, hist: null, alertas: []
};

// ==================== FORMATO ====================
const abcFmt = (n, dec = 2) => (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const abcSoles = (n, dec = 2) => 'S/ ' + abcFmt(n, dec);
const abcPct = n => abcFmt(n, 1) + '%';
const abcNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const esc = v => textCell(v);

function abcNombreMes(periodo) {
    if (!periodo) return '';
    const [a, m] = periodo.split('-');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return (meses[parseInt(m, 10) - 1] || m) + ' ' + a;
}

// ==================== ACCESO A DATOS ====================
async function abcLeer(tabla) {
    const { data, error } = await supabaseClient.from(tabla).select('*').order('id', { ascending: true });
    return { data: data || [], error };
}

function abcTablaNoExiste(error) {
    return error && (error.code === 'PGRST205' || error.code === '42P01' || /does not exist|schema cache/i.test(error.message || ''));
}

const abcEnBD = tabla => abc.modo === 'db' && !abc.faltan.has(tabla);

// Upsert de varias filas a la vez
async function abcGuardarVarios(tabla, filas, conflicto) {
    if (!abcEnBD(tabla) || !filas.length) return filas;
    const { data, error } = await supabaseClient.from(tabla).upsert(filas, { onConflict: conflicto }).select();
    if (error) {
        showAlert('❌ No se pudo guardar en ' + tabla + ': ' + error.message, 'error');
        throw error;
    }
    return data;
}

// Guarda (upsert) una fila; en modo local solo se mantiene en memoria
async function abcGuardar(tabla, fila, conflicto) {
    if (!abcEnBD(tabla)) return fila;
    const { data, error } = await supabaseClient.from(tabla).upsert([fila], { onConflict: conflicto }).select();
    if (error) {
        console.error('Error guardando en ' + tabla, error);
        showAlert('❌ No se pudo guardar en ' + tabla + ': ' + error.message, 'error');
        throw error;
    }
    return data && data[0];
}

async function abcInsertar(tabla, filas) {
    if (!abcEnBD(tabla) || !filas.length) return filas;
    const { data, error } = await supabaseClient.from(tabla).insert(filas).select();
    if (error) {
        showAlert('❌ No se pudo insertar en ' + tabla + ': ' + error.message, 'error');
        throw error;
    }
    return data;
}

async function abcBorrar(tabla, campo, valor) {
    if (!abcEnBD(tabla)) return;
    const { error } = await supabaseClient.from(tabla).delete().eq(campo, valor);
    if (error) {
        showAlert('❌ No se pudo eliminar en ' + tabla + ': ' + error.message, 'error');
        throw error;
    }
}

async function abcBorrarDonde(tabla, filtros) {
    if (!abcEnBD(tabla)) return;
    let q = supabaseClient.from(tabla).delete();
    Object.entries(filtros).forEach(([k, v]) => { q = q.eq(k, v); });
    const { error } = await q;
    if (error) {
        showAlert('❌ No se pudo eliminar en ' + tabla + ': ' + error.message, 'error');
        throw error;
    }
}

// Registra en la tabla productos los objetos de costo que aún no existen
async function abcAsegurarProductos() {
    const faltantes = ABC_SEED_PRODUCTOS.filter(p => !abc.productos.some(x => x.codigo === p.codigo));
    if (!faltantes.length) return;
    const filas = faltantes.map(p => ({ codigo: p.codigo, nombre: p.nombre, categoria: 'Bebidas', precio: p.precio, stock: 0 }));
    const { data, error } = await supabaseClient.from('productos').insert(filas).select();
    if (error) {
        console.warn('No se pudieron registrar los productos ABC en la tabla productos:', error);
        // Se trabaja con ellos en memoria para no bloquear el costeo
        abc.productos = abc.productos.concat(filas);
        return;
    }
    abc.productos = abc.productos.concat(data);
    showAlert('✅ Se registraron ' + data.length + ' productos nuevos (bebidas) para el costeo ABC', 'success');
}

async function abcCargar() {
    const [pl, pr] = await Promise.all([DB.getAll('planillas'), DB.getAll('productos')]);
    abc.planillas = pl;
    abc.productos = pr;
    await abcAsegurarProductos();

    // ¿Existen las tablas abc_*?
    const prueba = await abcLeer('abc_centros');
    if (abcTablaNoExiste(prueba.error)) {
        abc.modo = 'local';
        Object.assign(abc, abcSemillaEnMemoria());
        abcCalcularPeriodos();
        abcSembrarPresupuestos();
        return;
    }
    if (prueba.error) throw prueba.error;
    abc.modo = 'db';

    if (prueba.data.length === 0) await abcSembrarBD();

    const resultados = await Promise.all(ABC_TABLAS.map(abcLeer));
    const err = resultados.find(r => r.error);
    if (err) throw err.error;
    [abc.centros, abc.recursos, abc.inductor1, abc.inductores,
     abc.actividades, abc.objetos, abc.consumo, abc.materiales, abc.organigrama] = resultados.map(r => r.data);
    abc.centros.sort((a, b) => (a.orden || 0) - (b.orden || 0));

    await abcSincronizarPlanilla();
    await abcCargarExtensiones();
    abcCalcularPeriodos();
    await abcSembrarPresupuestos();
}

// Períodos disponibles: los de la planilla y los de montos mensuales de gastos (o el mes actual)
function abcCalcularPeriodos() {
    const set = new Set(abc.planillas.map(p => p.periodo).filter(Boolean));
    abc.recursosMes.forEach(r => r.periodo && set.add(r.periodo));
    if (!set.size) set.add(new Date().toISOString().slice(0, 7));
    abc.periodos = [...set].sort();
    if (!abc.periodo || !abc.periodos.includes(abc.periodo)) abc.periodo = abc.periodos[abc.periodos.length - 1];
}

// Etapas, presupuestos y montos mensuales (tablas agregadas en la versión de 5 etapas)
async function abcCargarExtensiones() {
    abc.faltan = new Set();
    for (const [tabla, campo] of Object.entries(ABC_TABLAS_EXT)) {
        const r = await abcLeer(tabla);
        if (r.error && !abcTablaNoExiste(r.error)) throw r.error;
        if (r.error) abc.faltan.add(tabla);
        abc[campo] = r.data;
    }
    if (!abc.etapas.length) {
        const s = abcConstruirSemillaEtapas();
        const g = await abcInsertar('abc_etapas', s.etapas);
        abc.etapas = abcConId(g || s.etapas);
        const g2 = abcEnBD('abc_etapa_dist') && abcEnBD('abc_etapas') ? await abcInsertar('abc_etapa_dist', s.dist) : null;
        if (!abc.etapaDist.length) abc.etapaDist = abcConId(g2 || s.dist);
        if (abcEnBD('abc_etapas')) showAlert('✅ Se crearon las etapas ② y ④ del modelo ABC de 5 etapas', 'success');
    }
}

let abcIdLocal = 1e9;
const abcConId = arr => arr.map(r => (r.id ? r : { id: abcIdLocal++, ...r }));

// Si no hay presupuestos, se sugieren a partir del promedio mensual + 15%
async function abcSembrarPresupuestos() {
    if (abc.presupuestos.length) return;
    const filas = abcPresupuestosSugeridos(true);
    if (!filas.length) return;
    const g = await abcGuardarVarios('abc_presupuestos', filas, 'tipo,codigo');
    abc.presupuestos = abcConId(g || filas);
    if (abcEnBD('abc_presupuestos')) showAlert('✅ Se generó un presupuesto mensual sugerido (promedio + 15%) para centros y actividades', 'success');
}

function abcSemillaEnMemoria() {
    const s = abcConstruirSemilla(abc.planillas);
    const e = abcConstruirSemillaEtapas();
    let id = 1;
    const conId = arr => arr.map(r => ({ id: id++, ...r }));
    return {
        centros: conId(s.centros), recursos: conId(s.recursos), inductor1: conId(s.inductor1),
        inductores: conId(s.inductores), actividades: conId(s.actividades), objetos: conId(s.objetos),
        consumo: conId(s.consumo), materiales: conId(s.materiales), organigrama: conId(s.organigrama),
        etapas: conId(e.etapas), etapaDist: conId(e.dist), presupuestos: [], recursosMes: []
    };
}

// Inserta los datos de ejemplo en las tablas abc_* (respetando las claves foráneas)
async function abcSembrarBD() {
    const s = abcConstruirSemilla(abc.planillas);
    await abcInsertar('abc_centros', s.centros);
    await abcInsertar('abc_recursos', s.recursos);
    await abcInsertar('abc_inductores', s.inductores);
    await abcInsertar('abc_inductor1', s.inductor1);
    await abcInsertar('abc_actividades', s.actividades);
    await abcInsertar('abc_objetos_costo', s.objetos);
    await abcInsertar('abc_consumo', s.consumo);
    await abcInsertar('abc_materiales', s.materiales);
    await abcInsertar('abc_organigrama', s.organigrama);
    showAlert('✅ Se generaron los datos del costeo ABC en la base de datos', 'success');
}

// Cargos nuevos en planillas → nuevo recurso con su distribución por defecto
async function abcSincronizarPlanilla() {
    const cargos = [];
    abc.planillas.forEach(p => {
        if (p.empleado_cargo && !cargos.some(c => abcNorm(c) === abcNorm(p.empleado_cargo))) cargos.push(p.empleado_cargo);
    });
    const sinPuesto = cargos.filter(c => !abc.organigrama.some(o => abcNorm(o.cargo) === abcNorm(c)));
    if (sinPuesto.length) {
        const filas = sinPuesto.map((cargo, i) => ({
            cargo, centro_codigo: abcCentroPrincipal(abcCargoPorDefecto(cargo).dist), orden: abc.organigrama.length + i + 1
        }));
        const guardadas = await abcInsertar('abc_organigrama', filas);
        abc.organigrama.push(...(guardadas || filas));
    }

    const nuevos = cargos.filter(c => !abc.recursos.some(r => r.origen === 'planilla' && abcNorm(r.cargo) === abcNorm(c)));
    if (!nuevos.length) return;

    let n = abc.recursos.filter(r => r.origen === 'planilla').length;
    for (const cargo of nuevos) {
        n++;
        const def = abcCargoPorDefecto(cargo);
        let codigo = 'R-PL-' + String(n).padStart(2, '0');
        while (abc.recursos.some(r => r.codigo === codigo)) codigo = 'R-PL-' + String(++n).padStart(2, '0');
        const rec = { codigo, nombre: 'Remuneración · ' + cargo, categoria: def.categoria, origen: 'planilla', cargo, monto: 0 };
        const [guardado] = await abcInsertar('abc_recursos', [rec]);
        abc.recursos.push(guardado || rec);
        const filas = Object.entries(def.dist).map(([centro, pct]) => ({ recurso_codigo: codigo, centro_codigo: centro, porcentaje: pct }));
        const guardadas = await abcInsertar('abc_inductor1', filas);
        abc.inductor1.push(...(guardadas || filas));
    }
}

// ==================== MOTOR DE CÁLCULO ABC ====================
// Monto de un gasto manual en un período: el registrado para ese mes o, si no hay, el monto base
function abcMontoMes(r, periodo) {
    const m = abc.recursosMes.find(x => x.recurso_codigo === r.codigo && x.periodo === periodo);
    return m ? { monto: Number(m.monto) || 0, propio: true } : { monto: Number(r.monto) || 0, propio: false };
}

function abcMontoRecurso(r, periodo) {
    if (r.origen === 'planilla') {
        return abc.planillas
            .filter(p => p.periodo === periodo && abcNorm(p.empleado_cargo) === abcNorm(r.cargo))
            .reduce((s, p) => s + (Number(p.costo_total_empleador) || 0), 0);
    }
    return abcMontoMes(r, periodo).monto;
}

function abcPctRecurso(recurso, centro) {
    const f = abc.inductor1.find(x => x.recurso_codigo === recurso && x.centro_codigo === centro);
    return f ? Number(f.porcentaje) || 0 : 0;
}

function abcPctEtapa(etapa, origen, destino) {
    const f = abc.etapaDist.find(x => x.etapa_codigo === etapa && x.origen === origen && x.destino === destino);
    return f ? Number(f.porcentaje) || 0 : 0;
}

function abcConsumoDe(inductor, producto) {
    const f = abc.consumo.find(x => x.inductor_codigo === inductor && x.producto_codigo === producto);
    return f ? Number(f.cantidad) || 0 : 0;
}

function abcProducto(codigo) {
    const p = abc.productos.find(x => x.codigo === codigo) || {};
    const o = abc.objetos.find(x => x.producto_codigo === codigo) || {};
    return { codigo, nombre: p.nombre || codigo, precio: Number(p.precio) || 0, id: p.id,
             presentacion: o.presentacion || '', unidades: Number(o.unidades) || 0 };
}

// Vectores de costo por categoría de recurso { MOD, MOI, CIF, GADM, GVTA }
const abcVecTotal = v => Object.values(v).reduce((s, x) => s + x, 0);
function abcVecSumar(destino, origen, factor) {
    Object.entries(origen).forEach(([k, x]) => { destino[k] = (destino[k] || 0) + x * factor; });
}

// Aplica una etapa de reparto sobre los nodos (centros o actividades). Cada origen envía a sus destinos
// el % indicado del costo que tenía al iniciar la etapa y retiene el resto.
function abcAplicarEtapa(etapa, nodos, nombreDe, avisos) {
    const antes = {};
    Object.entries(nodos).forEach(([k, v]) => { antes[k] = abcVecTotal(v); });
    const enviado = {}, recibido = {}, pctEnviado = {};
    const traslados = [];
    Object.keys(nodos).forEach(origen => {
        const filas = abc.etapaDist.filter(d => d.etapa_codigo === etapa.codigo && d.origen === origen &&
            d.destino !== origen && nodos[d.destino] !== undefined && (Number(d.porcentaje) || 0) > 0);
        const suma = filas.reduce((s, d) => s + Number(d.porcentaje), 0);
        if (!suma) return;
        pctEnviado[origen] = suma;
        let escala = 1;
        if (suma > 100.01) {
            escala = 100 / suma;
            if (antes[origen] > 0) avisos.push(`Etapa "${etapa.nombre}": ${nombreDe(origen)} reparte ${abcPct(suma)} (máximo 100%); se ajustó proporcionalmente.`);
        }
        const base = { ...nodos[origen] };
        filas.forEach(d => traslados.push([origen, d.destino, base, Number(d.porcentaje) / 100 * escala]));
    });
    traslados.forEach(([o, d, base, f]) => {
        abcVecSumar(nodos[d], base, f);
        abcVecSumar(nodos[o], base, -f);
        const v = abcVecTotal(base) * f;
        enviado[o] = (enviado[o] || 0) + v;
        recibido[d] = (recibido[d] || 0) + v;
    });
    const despues = {};
    Object.entries(nodos).forEach(([k, v]) => { despues[k] = abcVecTotal(v); });
    return { codigo: etapa.codigo, nombre: etapa.nombre, nivel: etapa.nivel, antes, enviado, recibido, despues, pctEnviado,
             movido: Object.values(enviado).reduce((s, x) => s + x, 0) };
}

function abcCalcular(periodo = abc.periodo) {
    const prods = abc.objetos.map(o => abcProducto(o.producto_codigo));
    const avisos = [];
    const nombreCentro = cod => (abc.centros.find(x => x.codigo === cod) || {}).nombre || cod;
    const nombreAct = cod => (abc.actividades.find(x => x.codigo === cod) || {}).nombre || cod;

    // ---- Etapa ①: Recursos → Centros ----
    const recursos = abc.recursos.map(r => {
        const monto = abcMontoRecurso(r, periodo);
        const pctTotal = abc.centros.reduce((s, c) => s + abcPctRecurso(r.codigo, c.codigo), 0);
        if (monto > 0 && Math.abs(pctTotal - 100) > 0.01) avisos.push(`Recurso "${r.nombre}": la distribución suma ${abcPct(pctTotal)} (debe ser 100%).`);
        return { ...r, montoCalc: monto, pctTotal };
    });

    const vecCentro = {};
    abc.centros.forEach(c => { vecCentro[c.codigo] = {}; });
    recursos.forEach(r => {
        abc.centros.forEach(c => {
            const v = r.montoCalc * abcPctRecurso(r.codigo, c.codigo) / 100;
            if (v) vecCentro[c.codigo][r.categoria] = (vecCentro[c.codigo][r.categoria] || 0) + v;
        });
    });
    const centroPrimario = {}, centroPrimarioCat = {};
    abc.centros.forEach(c => { centroPrimario[c.codigo] = abcVecTotal(vecCentro[c.codigo]); centroPrimarioCat[c.codigo] = { ...vecCentro[c.codigo] }; });

    // ---- Etapas adicionales entre centros ----
    const etapas = {};
    abcEtapasDe('centro').forEach(e => { etapas[e.codigo] = abcAplicarEtapa(e, vecCentro, nombreCentro, avisos); });

    const centroCosto = {}, centroPorCategoria = vecCentro;
    abc.centros.forEach(c => { centroCosto[c.codigo] = abcVecTotal(vecCentro[c.codigo]); });

    // ---- Centros → Actividades ----
    abc.centros.forEach(c => {
        const suma = abc.actividades.filter(a => a.centro_codigo === c.codigo).reduce((s, a) => s + (Number(a.porcentaje) || 0), 0);
        if (centroCosto[c.codigo] > 0.005 && Math.abs(suma - 100) > 0.01) avisos.push(`Centro "${c.nombre}": sus actividades suman ${abcPct(suma)} (debe ser 100%).`);
    });
    const vecAct = {};
    abc.actividades.forEach(a => {
        vecAct[a.codigo] = {};
        abcVecSumar(vecAct[a.codigo], vecCentro[a.centro_codigo] || {}, (Number(a.porcentaje) || 0) / 100);
    });
    const actPrimario = {};
    abc.actividades.forEach(a => { actPrimario[a.codigo] = abcVecTotal(vecAct[a.codigo]); });

    // ---- Etapas adicionales entre actividades ----
    abcEtapasDe('actividad').forEach(e => { etapas[e.codigo] = abcAplicarEtapa(e, vecAct, nombreAct, avisos); });

    const totalInductor = {};
    abc.inductores.forEach(i => { totalInductor[i.codigo] = prods.reduce((s, p) => s + abcConsumoDe(i.codigo, p.codigo), 0); });

    // ---- Actividades → Objetos de costo (inductor de actividad) ----
    const actividades = abc.actividades.map(a => {
        const costoCategoria = vecAct[a.codigo];
        const costo = abcVecTotal(costoCategoria);
        const total = totalInductor[a.inductor_codigo] || 0;
        const tasa = total > 0 ? costo / total : 0;
        if (costo > 0.005 && !(total > 0)) avisos.push(`Actividad "${a.nombre}": su inductor no tiene consumo; S/ ${abcFmt(costo)} quedan sin asignar.`);
        const asignado = {};
        prods.forEach(p => { asignado[p.codigo] = tasa * abcConsumoDe(a.inductor_codigo, p.codigo); });
        return { ...a, costoPrimario: actPrimario[a.codigo], costo, totalInductor: total, tasa, asignado, costoCategoria };
    });

    const productos = prods.map(p => {
        const mpUnit = abc.materiales.filter(m => m.producto_codigo === p.codigo)
            .reduce((s, m) => s + (Number(m.cantidad) || 0) * (Number(m.costo_unitario) || 0), 0);
        const mp = mpUnit * p.unidades;
        const porCentroTipo = { estrategico: 0, operativo: 0, apoyo: 0 };
        const rubros = { MOD: 0, MOI: 0, CIF: 0, GADM: 0, GVTA: 0 };
        let indirecto = 0;
        actividades.forEach(a => {
            const v = a.asignado[p.codigo] || 0;
            indirecto += v;
            const c = abc.centros.find(x => x.codigo === a.centro_codigo);
            if (c) porCentroTipo[c.tipo] += v;
            if (a.costo > 0) Object.entries(a.costoCategoria).forEach(([k, m]) => { rubros[k] = (rubros[k] || 0) + v * m / a.costo; });
        });
        const total = mp + indirecto;
        const ventas = p.unidades * p.precio;
        const costoProduccion = mp + rubros.MOD + rubros.MOI + rubros.CIF;
        return {
            ...p, mpUnit, mp, indirecto, porCentroTipo, rubros, costoProduccion, gastosOperacion: rubros.GADM + rubros.GVTA, total,
            unitario: p.unidades > 0 ? total / p.unidades : 0,
            ventas, utilidad: ventas - total,
            margen: ventas > 0 ? (ventas - total) / ventas * 100 : 0
        };
    });

    // ---- Costeo tradicional (comparativo): indirectos según horas MOD ----
    const totalIndirecto = recursos.reduce((s, r) => s + r.montoCalc, 0);
    const baseTrad = prods.reduce((s, p) => s + abcConsumoDe('IND-HMOD', p.codigo), 0);
    productos.forEach(p => {
        const ind = baseTrad > 0 ? totalIndirecto * abcConsumoDe('IND-HMOD', p.codigo) / baseTrad : 0;
        p.tradTotal = p.mp + ind;
        p.tradUnitario = p.unidades > 0 ? p.tradTotal / p.unidades : 0;
    });

    const totalAsignado = productos.reduce((s, p) => s + p.indirecto, 0);
    const porCategoria = {};
    recursos.forEach(r => { porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + r.montoCalc; });

    return {
        periodo, recursos, centroPrimario, centroPrimarioCat, centroCosto, centroPorCategoria, etapas,
        actividades, totalInductor, productos, avisos,
        totalRecursos: totalIndirecto, totalAsignado, porCategoria,
        totalMP: productos.reduce((s, p) => s + p.mp, 0)
    };
}

// Costo de cada centro y actividad en todos los períodos (para alertas y gráficas)
function abcHistorial() {
    if (abc.hist) return abc.hist;
    const hist = {};
    abc.periodos.forEach(p => {
        const c = p === abc.periodo && abc.calc ? abc.calc : abcCalcular(p);
        const actividades = {};
        c.actividades.forEach(a => { actividades[a.codigo] = a.costo; });
        hist[p] = { centro: { ...c.centroCosto }, actividad: actividades, total: c.totalRecursos };
    });
    abc.hist = hist;
    return hist;
}

function abcSerie(tipo, codigo) {
    const h = abcHistorial();
    return abc.periodos.map(p => ({ periodo: p, costo: (h[p] && h[p][tipo] && h[p][tipo][codigo]) || 0 }));
}

// ==================== PRESUPUESTO Y ALERTAS ====================
function abcPresupuesto(tipo, codigo) {
    return abc.presupuestos.find(x => x.tipo === tipo && x.codigo === codigo) || null;
}

// Presupuesto sugerido = promedio mensual × 1.15, redondeado a decenas
function abcPresupuestosSugeridos(soloFaltantes) {
    const filas = [];
    const sugerir = (tipo, codigo) => {
        const actual = abcPresupuesto(tipo, codigo);
        if (soloFaltantes && actual && Number(actual.monto) > 0) return;
        const serie = abcSerie(tipo, codigo).filter(x => x.costo > 0);
        if (!serie.length) return;
        const prom = serie.reduce((s, x) => s + x.costo, 0) / serie.length;
        filas.push({ tipo, codigo, monto: Math.ceil(prom * 1.15 / 10) * 10,
                     umbral: actual ? Number(actual.umbral) || ABC_UMBRAL_DEFECTO : abc.umbralNuevo });
    };
    abc.hist = null;
    abc.centros.forEach(c => sugerir('centro', c.codigo));
    abc.actividades.forEach(a => sugerir('actividad', a.codigo));
    abc.hist = null;
    return filas;
}

const ABC_ESTADOS = {
    excedido: { nombre: 'Excedido', icono: '🔴', orden: 0 },
    cerca:    { nombre: 'Cerca del límite', icono: '🟠', orden: 1 },
    ok:       { nombre: 'Dentro del presupuesto', icono: '🟢', orden: 2 },
    sin:      { nombre: 'Sin presupuesto', icono: '⚪', orden: 3 }
};

function abcEstado(costo, pres) {
    const monto = pres ? Number(pres.monto) || 0 : 0;
    const umbral = pres ? Number(pres.umbral) || ABC_UMBRAL_DEFECTO : ABC_UMBRAL_DEFECTO;
    if (!(monto > 0)) return { estado: 'sin', pct: 0, monto: 0, umbral };
    const pct = costo / monto * 100;
    return { estado: pct >= 100 ? 'excedido' : pct >= umbral ? 'cerca' : 'ok', pct, monto, umbral };
}

// Estado de presupuesto de todos los centros y actividades en el período seleccionado
function abcCalcularAlertas() {
    const c = abc.calc;
    const idx = abc.periodos.indexOf(abc.periodo);
    const previo = idx > 0 ? abc.periodos[idx - 1] : null;
    const h = previo ? abcHistorial()[previo] : null;
    const fila = (tipo, x, costo, extra) => {
        const e = abcEstado(costo, abcPresupuesto(tipo, x.codigo));
        const ant = h ? (h[tipo][x.codigo] || 0) : null;
        return { tipo, codigo: x.codigo, nombre: x.nombre, costo, ...e, ...extra,
                 anterior: ant, variacion: ant > 0 ? (costo - ant) / ant * 100 : null };
    };
    const lista = [
        ...abc.centros.map(x => fila('centro', x, c.centroCosto[x.codigo] || 0, { centroTipo: x.tipo })),
        ...c.actividades.map(a => {
            const cen = abc.centros.find(x => x.codigo === a.centro_codigo) || {};
            return fila('actividad', a, a.costo, { centroTipo: cen.tipo, centroNombre: cen.nombre || a.centro_codigo });
        })
    ];
    lista.sort((a, b) => ABC_ESTADOS[a.estado].orden - ABC_ESTADOS[b.estado].orden || b.pct - a.pct);
    abc.alertas = lista;
    return lista;
}

// ==================== INTERFAZ ====================
function abcConstruirSidebar() {
    if (document.querySelector('.app-sidebar')) return;
    const html = `
        <a class="skip-link" href="#workspace">Ir al contenido</a>
        <aside class="app-sidebar">
            <a class="app-brand" href="index.html">
                🎯 VSS Costeo ABC
                <small>COSTOS POR ACTIVIDADES</small>
            </a>
            <div class="nav-caption">Espacio de trabajo</div>
            <nav aria-label="Navegación principal" id="abcNav"></nav>
            <div class="sidebar-bottom">
                <strong>VSS S.A.C.</strong>
                RUC 20601234567<br>
                Soles peruanos · PEN
                <button onclick="abcCerrarSesion()" class="abc-logout">🚪 Cerrar Sesión</button>
            </div>
        </aside>`;
    document.body.insertAdjacentHTML('afterbegin', html);
    document.getElementById('abcNav').addEventListener('click', e => {
        const a = e.target.closest('a[data-tab]');
        if (!a) return;
        e.preventDefault();
        abcMostrarTab(a.dataset.tab);
    });
}

// Menú lateral y sub-navegación: incluye una entrada por cada etapa del modelo
function abcRenderNav() {
    const n = abc.alertas.filter(x => x.estado === 'excedido' || x.estado === 'cerca').length;
    const exc = abc.alertas.some(x => x.estado === 'excedido');
    const badge = id => id === 'alertas' && n ? ` <span class="abc-badge ${exc ? 'abc-badge-red' : ''}">${n}</span>` : '';
    const actual = abc.tabActual;
    const nav = document.getElementById('abcNav');
    if (nav) nav.innerHTML = abcSecciones().map(([id, icon, label]) =>
        `<a href="#${esc(id)}" data-tab="${esc(id)}" ${id === actual ? 'aria-current="page"' : ''}><span class="nav-symbol" aria-hidden="true">${icon}</span>${esc(label)}${badge(id)}</a>`).join('');

    const etapas = abcEtapasModelo();
    const sub = document.getElementById('abcSubNav');
    if (sub) sub.innerHTML = [
        ...ABC_SECCIONES_INICIO.map(([id, icon, label]) => [id, icon + ' ' + label]),
        ...etapas.map(x => [x.id, x.simbolo + ' ' + x.nombre]),
        ...ABC_SECCIONES_FIN.map(([id, icon, label]) => [id, icon + ' ' + label])
    ].map(([id, label]) => `<button data-tab="${esc(id)}" class="${id === actual ? 'active' : ''} ${id.startsWith('etapa:') ? 'abc-subnav-etapa' : ''}"
        onclick="abcMostrarTab(this.dataset.tab)">${esc(label)}${badge(id)}</button>`).join('') +
        `<button class="abc-subnav-add" title="Agregar una etapa de reparto" onclick="abcAbrirEtapa()">＋ Etapa</button>`;

    // Números de etapa en los títulos fijos
    document.querySelectorAll('[data-num-etapa]').forEach(el => { el.textContent = abcNumEtapa(el.dataset.numEtapa); });
}

async function abcCerrarSesion() {
    if (!confirm('¿Cerrar sesión?')) return;
    try { await supabaseClient.auth.signOut(); } catch (e) { console.warn(e); }
    localStorage.removeItem('vss_session');
    window.location.href = '../index.html';
}

function abcMostrarTab(id, sinScroll) {
    try { id = decodeURIComponent(id); } catch (e) { /* hash inválido */ }
    const secciones = abcSecciones();
    if (!secciones.some(s => s[0] === id)) id = 'resumen';
    abc.tabActual = id;
    const contenedor = id.startsWith('etapa:') ? 'etapa' : id;
    if (contenedor === 'etapa') { abc.etapaActiva = id.slice(6); abcRenderEtapa(); }
    document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + contenedor));
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('#abcNav a').forEach(a => {
        if (a.dataset.tab === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const sec = secciones.find(s => s[0] === id);
    document.getElementById('abcTitulo').textContent = (id.startsWith('etapa:') || ['ind1', 'ind2', 'ind3'].includes(id) ? '🔗 Etapa ' + sec[1] + ' · ' : '🎯 ') + sec[2];
    history.replaceState(null, '', '#' + id);
    if (!sinScroll) window.scrollTo({ top: 0 });
}

// Resumen del costeo calculado para Aurora (asistente), disponible desde cualquier página
function abcGuardarResumenAurora() {
    const c = abc.calc;
    const centro = cod => (abc.centros.find(x => x.codigo === cod) || {}).nombre || cod;
    const ind = cod => (abc.inductores.find(x => x.codigo === cod) || {}).nombre || cod;
    const r4 = n => Math.round((Number(n) || 0) * 10000) / 10000;
    const resumen = {
        periodo: abc.periodo, modo_datos: abc.modo === 'db' ? 'tablas abc_* en Supabase' : 'datos de ejemplo en memoria (tablas abc_* no creadas)',
        total_recursos_indirectos: r4(c.totalRecursos), total_mp_directa: r4(c.totalMP), recursos_por_categoria: c.porCategoria,
        productos: c.productos.map(p => ({
            codigo: p.codigo, nombre: p.nombre, unidades: p.unidades, precio: p.precio, mpUnit: r4(p.mpUnit),
            indirecto: r4(p.indirecto), unitario: r4(p.unitario), margen: r4(p.margen), utilidad: r4(p.utilidad),
            costo_unitario_tradicional: r4(p.tradUnitario), por_tipo_de_centro: p.porCentroTipo
        })),
        centros: abc.centros.map(x => ({ codigo: x.codigo, nombre: x.nombre, tipo: x.tipo, depende_de: x.padre_codigo || null, costo: r4(c.centroCosto[x.codigo]) })),
        actividades: c.actividades.map(a => ({ nombre: a.nombre, centro: centro(a.centro_codigo), porcentaje: a.porcentaje,
            costo: r4(a.costo), inductor: ind(a.inductor_codigo), total_inductor: a.totalInductor, tasa: r4(a.tasa) })),
        etapas_del_modelo: abcEtapasModelo().map(x => x.simbolo + ' ' + x.nombre),
        alertas_presupuesto: abc.alertas.filter(x => x.estado === 'excedido' || x.estado === 'cerca').map(x => ({
            tipo: x.tipo, nombre: x.nombre, costo: r4(x.costo), presupuesto: x.monto, consumo_pct: r4(x.pct), estado: ABC_ESTADOS[x.estado].nombre })),
        avisos: c.avisos,
        actualizado: new Date().toLocaleString('es-PE')
    };
    try { localStorage.setItem('aurora_abc', JSON.stringify(resumen)); } catch (e) { /* sin almacenamiento */ }
}

function abcRenderTodo() {
    abc.hist = null;
    abc.calc = abcCalcular(abc.periodo);
    abcCalcularAlertas();
    abcGuardarResumenAurora();
    abcRenderNav();
    abcRenderAvisos();
    abcRenderAlertas();
    abcRenderResumen();
    abcRenderAnalisis();
    abcRenderCentros();
    abcRenderRecursos();
    abcRenderActividades();
    abcRenderInd1();
    abcRenderInd2();
    abcRenderInd3();
    abcRenderObjetos();
    if (abc.tabActual && abc.tabActual.startsWith('etapa:')) {
        if (abc.etapas.some(e => 'etapa:' + e.codigo === abc.tabActual)) abcRenderEtapa();
        else abcMostrarTab('resumen');
    }
}

function abcRenderAvisos() {
    const el = document.getElementById('abcModo');
    el.innerHTML = abc.modo === 'local' ? `
        <div class="abc-banner abc-banner-warn">
            <strong>⚠️ Las tablas del costeo ABC aún no existen en Supabase.</strong>
            El sistema está calculando con los datos de ejemplo en memoria (los cambios no se guardan).
            Para guardarlos, ejecute una vez el archivo <code>sistema-costeo-abc/sql/abc_schema.sql</code>
            en Supabase → SQL Editor y recargue la página: los datos se generarán automáticamente.
        </div>` : abc.faltan.size ? `
        <div class="abc-banner abc-banner-warn">
            <strong>⚠️ Falta actualizar la base de datos.</strong>
            Las tablas ${[...abc.faltan].map(t => `<code>${t}</code>`).join(', ')} aún no existen: etapas, presupuestos y montos mensuales
            funcionan en memoria (no se guardan). Vuelva a ejecutar <code>sistema-costeo-abc/sql/abc_schema.sql</code> en Supabase → SQL Editor
            (no borra datos) y recargue la página.
        </div>` : '';

    const av = abc.calc.avisos;
    document.getElementById('abcAvisos').innerHTML = av.length ? `
        <div class="abc-banner abc-banner-info">
            <strong>🔎 Revisión de la distribución (${av.length})</strong>
            <ul>${av.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
        </div>` : '';
}

// ---------- RESUMEN ----------
function abcRenderResumen() {
    const c = abc.calc;
    const totalUnidades = c.productos.reduce((s, p) => s + p.unidades, 0);
    const totalVentas = c.productos.reduce((s, p) => s + p.ventas, 0);
    const totalCosto = c.productos.reduce((s, p) => s + p.total, 0);
    const cuenta = t => abc.centros.filter(x => x.tipo === t).length;

    document.getElementById('abcMetricas').innerHTML = `
        <div class="metric metric-activo"><div class="metric-icon">💰</div><div class="metric-label">Recursos indirectos</div>
            <strong>${abcSoles(c.totalRecursos)}</strong><small>MOD, CIF, G. Adm. y G. Ventas</small></div>
        <div class="metric metric-ventas"><div class="metric-icon">📦</div><div class="metric-label">Materia prima directa</div>
            <strong>${abcSoles(c.totalMP)}</strong><small>Asignación directa (lista de materiales)</small></div>
        <div class="metric metric-compras"><div class="metric-icon">🎯</div><div class="metric-label">Costo total productos</div>
            <strong>${abcSoles(totalCosto)}</strong><small>${abcFmt(totalUnidades, 0)} unidades</small></div>
        <div class="metric metric-inventario"><div class="metric-icon">📈</div><div class="metric-label">Margen sobre ventas</div>
            <strong>${abcPct(totalVentas ? (totalVentas - totalCosto) / totalVentas * 100 : 0)}</strong><small>Ventas ${abcSoles(totalVentas)}</small></div>`;

    const flechaExtra = nivel => {
        const html = abcEtapasDe(nivel).map(e => `<em class="abc-arrow-extra" title="${esc(e.nombre)}"
            onclick="event.stopPropagation(); abcMostrarTab('etapa:${esc(e.codigo)}')">+ ${abcNumEtapa('etapa:' + e.codigo)} reparto</em>`).join('');
        return html ? `<div class="abc-arrow-extras">${html}</div>` : '';
    };
    const cat = Object.keys(ABC_CATEGORIAS).filter(k => c.porCategoria[k])
        .map(k => `<li><span>${k === 'GADM' ? 'G. Adm.' : k === 'GVTA' ? 'G. Ventas' : k}</span><b>${abcSoles(c.porCategoria[k], 0)}</b></li>`).join('');

    document.getElementById('abcFlujo').innerHTML = `
        <div class="abc-flow">
            <div class="abc-node abc-node-rec" onclick="abcMostrarTab('recursos')">
                <div class="abc-node-title">Recursos</div>
                <ul class="abc-node-list"><li><span>MP (directa)</span><b>${abcSoles(c.totalMP, 0)}</b></li>${cat}</ul>
                <div class="abc-node-foot">${abc.recursos.length} recursos</div>
            </div>
            <div class="abc-arrow" onclick="abcMostrarTab('ind1')"><span>Etapa ${abcNumEtapa('ind1')}</span><small>% = tasa</small>${flechaExtra('centro')}</div>
            <div class="abc-node abc-node-cen" onclick="abcMostrarTab('centros')">
                <div class="abc-node-title">Centros de Actividad</div>
                <ul class="abc-node-list">
                    ${Object.entries(ABC_TIPOS).map(([t, v]) => {
                        const tot = abc.centros.filter(x => x.tipo === t).reduce((s, x) => s + (c.centroCosto[x.codigo] || 0), 0);
                        return `<li><span>${v.icono} ${v.nombre} (${cuenta(t)})</span><b>${abcSoles(tot, 0)}</b></li>`;
                    }).join('')}
                </ul>
                <div class="abc-node-foot">${abc.centros.length} centros</div>
            </div>
            <div class="abc-arrow" onclick="abcMostrarTab('ind2')"><span>Etapa ${abcNumEtapa('ind2')}</span><small>% por actividad</small>${flechaExtra('actividad')}</div>
            <div class="abc-node abc-node-act" onclick="abcMostrarTab('ind3')">
                <div class="abc-node-title">Actividades</div>
                <ul class="abc-node-list">
                    ${c.actividades.slice().sort((a, b) => b.costo - a.costo).slice(0, 4)
                        .map(a => `<li><span>${esc(a.nombre)}</span><b>${abcSoles(a.costo, 0)}</b></li>`).join('')}
                </ul>
                <div class="abc-node-foot">${abc.actividades.length} actividades</div>
            </div>
            <div class="abc-arrow" onclick="abcMostrarTab('ind3')"><span>Etapa ${abcNumEtapa('ind3')}</span><small>consumo</small></div>
            <div class="abc-node abc-node-obj" onclick="abcMostrarTab('objetos')">
                <div class="abc-node-title">Objeto de Costos</div>
                <ul class="abc-node-list">
                    ${c.productos.map(p => `<li><span>${esc(p.nombre)}</span><b>${abcSoles(p.unitario, 4)}</b></li>`).join('')}
                </ul>
                <div class="abc-node-foot">costo unitario</div>
            </div>
        </div>`;

    abcRenderCadenaEtapas('abcEtapasCadena');
    abcRenderAlertasResumen();

    const maxTotal = Math.max(1, ...c.productos.map(p => p.total));
    document.getElementById('abcResumenProductos').innerHTML = c.productos.map(p => {
        const w = v => (v / maxTotal * 100).toFixed(2) + '%';
        return `
        <tr>
            <td><strong>${esc(p.nombre)}</strong><br><small class="abc-muted">${esc(p.codigo)}</small></td>
            <td class="num">${abcFmt(p.unidades, 0)}</td>
            <td class="num">${abcSoles(p.mp)}</td>
            <td class="num">${abcSoles(p.indirecto)}</td>
            <td class="num"><strong>${abcSoles(p.total)}</strong></td>
            <td class="num"><strong>${abcSoles(p.unitario, 4)}</strong></td>
            <td class="num">${abcSoles(p.precio)}</td>
            <td class="num ${p.margen < 0 ? 'abc-neg' : 'abc-pos'}">${abcPct(p.margen)}</td>
            <td class="abc-bar-cell">
                <div class="abc-stack" title="MP ${abcSoles(p.mp)} · Operativos ${abcSoles(p.porCentroTipo.operativo)} · Apoyo ${abcSoles(p.porCentroTipo.apoyo)} · Estratégicos ${abcSoles(p.porCentroTipo.estrategico)}">
                    <span class="seg-mp" style="width:${w(p.mp)}"></span>
                    <span class="seg-op" style="width:${w(p.porCentroTipo.operativo)}"></span>
                    <span class="seg-ap" style="width:${w(p.porCentroTipo.apoyo)}"></span>
                    <span class="seg-es" style="width:${w(p.porCentroTipo.estrategico)}"></span>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ---------- ANÁLISIS · ESTRUCTURA · PRINCIPALES CÁLCULOS ----------
function abcRenderAnalisis() {
    abcRenderConclusiones();
    abcRenderEstructura();
    abcRenderCalculos();
}

function abcRenderConclusiones() {
    const c = abc.calc;
    const prods = c.productos.filter(p => p.unidades > 0);
    const pctDe = (v, t) => t > 0 ? v / t * 100 : 0;
    const totalCosto = c.productos.reduce((s, p) => s + p.total, 0);
    const totalVentas = c.productos.reduce((s, p) => s + p.ventas, 0);
    const items = [];

    const porTipo = Object.entries(ABC_TIPOS).map(([t, v]) =>
        [v.nombre, abc.centros.filter(x => x.tipo === t).reduce((s, x) => s + (c.centroCosto[x.codigo] || 0), 0)]);
    items.push(`Los recursos indirectos del período suman <b>${abcSoles(c.totalRecursos)}</b>, consumidos por centros ` +
        porTipo.map(([n, v]) => `${n.toLowerCase()} (<b>${abcPct(pctDe(v, c.totalRecursos))}</b>)`).join(', ') + '.');

    const topAct = c.actividades.slice().sort((a, b) => b.costo - a.costo).slice(0, 3);
    if (topAct.length) {
        const sumaTop = topAct.reduce((s, a) => s + a.costo, 0);
        items.push(`Las actividades más costosas son ${topAct.map(a => `<b>${esc(a.nombre)}</b> (${abcSoles(a.costo, 0)})`).join(', ')}; ` +
            `juntas concentran el <b>${abcPct(pctDe(sumaTop, c.totalRecursos))}</b> de los recursos indirectos.`);
    }

    if (totalCosto > 0) {
        items.push(`La materia prima directa representa el <b>${abcPct(pctDe(c.totalMP, totalCosto))}</b> del costo total de los productos ` +
            `y los costos asignados por actividades el <b>${abcPct(pctDe(c.totalAsignado, totalCosto))}</b>.`);
    }

    if (prods.length) {
        const porUnit = prods.slice().sort((a, b) => b.unitario - a.unitario);
        const porMargen = prods.slice().sort((a, b) => b.margen - a.margen);
        const ultimo = arr => arr[arr.length - 1];
        items.push(`Mayor costo unitario: <b>${esc(porUnit[0].nombre)}</b> (${abcSoles(porUnit[0].unitario, 4)}); ` +
            `menor: <b>${esc(ultimo(porUnit).nombre)}</b> (${abcSoles(ultimo(porUnit).unitario, 4)}).`);
        items.push(`Producto más rentable: <b>${esc(porMargen[0].nombre)}</b> con margen de ${abcPct(porMargen[0].margen)}; ` +
            `el menos rentable es <b>${esc(ultimo(porMargen).nombre)}</b> con ${abcPct(ultimo(porMargen).margen)}.`);

        const perdida = prods.filter(p => p.margen < 0);
        if (perdida.length) items.push(`<span class="abc-neg">Productos con pérdida:</span> ${perdida.map(p => esc(p.nombre)).join(', ')}. ` +
            'Conviene revisar su precio o reducir las actividades que consumen.');

        const dist = prods.filter(p => p.tradUnitario > 0)
            .map(p => ({ p, dif: p.unitario - p.tradUnitario, rel: (p.unitario - p.tradUnitario) / p.tradUnitario * 100 }))
            .sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel))[0];
        if (dist && Math.abs(dist.dif) > 0.0001) {
            items.push(`Frente al costeo tradicional (una sola base: horas MOD), la mayor distorsión está en <b>${esc(dist.p.nombre)}</b>: ` +
                `el método tradicional lo ${dist.dif > 0 ? '<b>subcosteaba</b>' : '<b>sobrecosteaba</b>'} en ${abcSoles(Math.abs(dist.dif), 4)} ` +
                `por unidad (${abcPct(Math.abs(dist.rel))}).`);
        }
    }

    const sinAsignar = c.totalRecursos - c.totalAsignado;
    items.push(Math.abs(sinAsignar) > 0.5
        ? `<span class="abc-neg">Quedan ${abcSoles(sinAsignar)} sin asignar</span> a los productos; revise los avisos de distribución del Resumen.`
        : `El 100% de los recursos indirectos (${abcSoles(c.totalAsignado)}) quedó asignado a los objetos de costo.`);

    if (totalVentas > 0) {
        items.push(`Ventas del período: <b>${abcSoles(totalVentas)}</b> · utilidad: <b>${abcSoles(totalVentas - totalCosto)}</b> ` +
            `(margen ${abcPct(pctDe(totalVentas - totalCosto, totalVentas))}).`);
    }

    document.getElementById('abcAnalisis').innerHTML = `<ol class="abc-analisis">${items.map(i => `<li>${i}</li>`).join('')}</ol>`;
}

function abcRenderEstructura() {
    const n = t => abc.centros.filter(x => x.tipo === t).length;
    const filas = [
        ['0 · Datos base', 'Planilla del período', 'planillas', abc.planillas.filter(p => p.periodo === abc.periodo).length,
            'Costo empleador de cada trabajador → recursos MOD, MOI y gastos', 'recursos'],
        ['0 · Datos base', 'Productos', 'productos', abc.productos.length, 'Código, nombre y precio de venta', 'objetos'],
        ['1 · Recursos', 'Recursos indirectos', 'abc_recursos', abc.recursos.length, 'Planilla + CIF, gastos de administración y de ventas', 'recursos'],
        ['1 · Recursos', 'Materia prima directa', 'abc_materiales', abc.materiales.length, 'Lista de materiales por unidad (costo directo)', 'objetos'],
        ['2 · Etapa ' + abcNumEtapa('ind1'), 'Recurso → centro', 'abc_inductor1', abc.inductor1.length, '% de cada recurso que consume cada centro', 'ind1'],
        ['2 · Etapas adicionales', 'Etapas de reparto', 'abc_etapas', abc.etapas.length,
            abcEtapasDe('centro').length + ' entre centros y ' + abcEtapasDe('actividad').length + ' entre actividades', abc.etapas[0] ? 'etapa:' + abc.etapas[0].codigo : 'ind1'],
        ['2 · Etapas adicionales', 'Distribución de etapas', 'abc_etapa_dist', abc.etapaDist.length, '% que cada origen envía a cada destino', abc.etapas[0] ? 'etapa:' + abc.etapas[0].codigo : 'ind1'],
        ['1 · Recursos', 'Montos mensuales de gastos', 'abc_recursos_mes', abc.recursosMes.length, 'Monto de un gasto en un mes específico (si falta se usa el monto base)', 'recursos'],
        ['7 · Control', 'Presupuestos y umbrales', 'abc_presupuestos', abc.presupuestos.length, 'Presupuesto mensual por centro y actividad; alerta al superar el umbral', 'alertas'],
        ['3 · Centros de actividad', 'Centros de costo', 'abc_centros', abc.centros.length,
            `${n('estrategico')} estratégicos, ${n('operativo')} operativos y ${n('apoyo')} de apoyo`, 'centros'],
        ['3 · Centros de actividad', 'Puestos del organigrama', 'abc_organigrama', abc.organigrama.length, 'Cargos de la planilla ubicados en cada centro', 'centros'],
        ['4 · Etapa ' + abcNumEtapa('ind2'), 'Actividades', 'abc_actividades', abc.actividades.length, '% del costo del centro que consume cada actividad', 'actividades'],
        ['5 · Etapa ' + abcNumEtapa('ind3'), 'Inductores de actividad', 'abc_inductores', abc.inductores.length, 'Bases de asignación actividad → producto', 'ind3'],
        ['5 · Etapa ' + abcNumEtapa('ind3'), 'Consumo de inductores', 'abc_consumo', abc.consumo.length, 'Cantidad de cada inductor que consume cada producto', 'ind3'],
        ['6 · Objetos de costo', 'Productos costeados', 'abc_objetos_costo', abc.objetos.length, 'Unidades producidas al mes y presentación', 'objetos']
    ];
    const seccion = id => (abcSecciones().find(s => s[0] === id) || [])[2] || id;
    document.getElementById('abcEstructura').innerHTML = filas.map(([etapa, elem, tabla, cant, desc, tab]) => `
        <tr>
            <td><strong>${etapa}</strong></td>
            <td>${elem}</td>
            <td><code>${tabla}</code></td>
            <td class="num">${abcFmt(cant, 0)}</td>
            <td class="abc-muted">${desc}</td>
            <td><button class="btn btn-sm" onclick="abcMostrarTab('${tab}')">${seccion(tab)} →</button></td>
        </tr>`).join('');
}

function abcEjemploEtapa(c) {
    const movs = Object.values(c.etapas).filter(e => e.movido > 0.005).sort((a, b) => b.movido - a.movido);
    if (!movs.length) return 'Las etapas adicionales no movieron costos en este período.';
    const e = movs[0];
    const nombre = cod => ((e.nivel === 'centro' ? abc.centros : abc.actividades).find(x => x.codigo === cod) || {}).nombre || cod;
    const origen = Object.entries(e.enviado).sort((a, b) => b[1] - a[1])[0];
    const destino = Object.entries(e.recibido).sort((a, b) => b[1] - a[1])[0];
    return `Etapa ${abcNumEtapa('etapa:' + e.codigo)} "${esc(e.nombre)}": ${esc(nombre(origen[0]))} tenía ${abcSoles(e.antes[origen[0]])},
        envía ${abcPct(e.pctEnviado[origen[0]])} = <b>${abcSoles(origen[1])}</b> y retiene ${abcSoles(e.despues[origen[0]])}.
        El mayor receptor es ${esc(nombre(destino[0]))} (+${abcSoles(destino[1])}). En total se trasladaron <b>${abcSoles(movs.reduce((s, x) => s + x.movido, 0))}</b> entre etapas.`;
}

function abcRenderCalculos() {
    const c = abc.calc;
    const el = document.getElementById('abcCalculos');
    const act = c.actividades.filter(a => a.costo > 0 && a.totalInductor > 0).sort((a, b) => b.costo - a.costo)[0];
    if (!act) { el.innerHTML = '<p class="abc-muted">Aún no hay datos suficientes para mostrar un ejemplo.</p>'; return; }

    const centro = abc.centros.find(x => x.codigo === act.centro_codigo) || { nombre: act.centro_codigo };
    const costoCentro = c.centroCosto[act.centro_codigo] || 0;
    const aportes = c.recursos.map(r => {
        const pct = abcPctRecurso(r.codigo, act.centro_codigo);
        return { r, pct, v: r.montoCalc * pct / 100 };
    }).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    const rec = aportes[0];
    const ind = abc.inductores.find(i => i.codigo === act.inductor_codigo) || { nombre: act.inductor_codigo, unidad: '' };
    const prod = c.productos.filter(p => (act.asignado[p.codigo] || 0) > 0).sort((a, b) => b.unidades - a.unidades)[0] || c.productos[0];
    const consumo = abcConsumoDe(act.inductor_codigo, prod.codigo);
    const baseTrad = c.productos.reduce((s, p) => s + abcConsumoDe('IND-HMOD', p.codigo), 0);
    const hmodProd = abcConsumoDe('IND-HMOD', prod.codigo);

    const paso = (num, titulo, formula, ejemplo) => `
        <div class="abc-calc-step">
            <div class="abc-calc-num">${num}</div>
            <div class="abc-calc-body">
                <h3>${titulo}</h3>
                <div class="abc-formula">${formula}</div>
                <div class="abc-ejemplo">${ejemplo}</div>
            </div>
        </div>`;

    el.innerHTML = [
        paso(1, 'Monto de cada recurso',
            'Recurso de planilla = Σ costo total empleador del cargo · Recurso de gasto = monto mensual registrado',
            rec ? `${esc(rec.r.nombre)} (${rec.r.categoria}) = <b>${abcSoles(rec.r.montoCalc)}</b> en ${abcNombreMes(abc.periodo)}.` : '—'),
        paso(2, `Etapa ${abcNumEtapa('ind1')} · Reparto primario al centro de actividad`,
            'Costo del centro<sub>j</sub> = Σ<sub>i</sub> ( Recurso<sub>i</sub> × %<sub>i→j</sub> )',
            rec ? `${esc(rec.r.nombre)}: ${abcSoles(rec.r.montoCalc)} × ${abcPct(rec.pct)} = <b>${abcSoles(rec.v)}</b> hacia ${esc(centro.nombre)}.<br>
                   Sumando los ${aportes.length} recursos que consume, <b>${esc(centro.nombre)}</b> acumula <b>${abcSoles(c.centroPrimario[act.centro_codigo] || 0)}</b>.` : '—'),
        paso('2b', 'Etapas de reparto adicionales (' + abc.etapas.length + ')',
            'Costo final<sub>j</sub> = Costo<sub>j</sub> × (100% − Σ% enviado<sub>j</sub>) + Σ<sub>i</sub> ( Costo<sub>i</sub> × %<sub>i→j</sub> )',
            abcEjemploEtapa(c)),
        paso(3, `Etapa ${abcNumEtapa('ind2')} · Costo de la actividad`,
            'Costo de la actividad<sub>k</sub> = Costo final del centro<sub>j</sub> × %<sub>j→k</sub> (± etapas de reparto entre actividades)',
            `${esc(act.nombre)}: ${abcSoles(costoCentro)} × ${abcPct(act.porcentaje)} = <b>${abcSoles(act.costoPrimario)}</b>` +
            (Math.abs(act.costo - act.costoPrimario) > 0.005 ? ` → tras las etapas de reparto entre actividades: <b>${abcSoles(act.costo)}</b>.` : '.')),
        paso(4, `Etapa ${abcNumEtapa('ind3')} · Tasa de la actividad`,
            'Tasa<sub>k</sub> = Costo de la actividad<sub>k</sub> ÷ Total del inductor consumido por todos los productos',
            `${abcSoles(act.costo)} ÷ ${abcFmt(act.totalInductor, 0)} ${esc(ind.unidad)} (${esc(ind.nombre)}) = <b>${abcSoles(act.tasa, 4)} por ${esc(ind.unidad)}</b>.`),
        paso(5, 'Asignación de la actividad al objeto de costo',
            'Costo asignado<sub>k,p</sub> = Tasa<sub>k</sub> × Consumo del inductor por el producto<sub>p</sub>',
            `${esc(prod.nombre)}: ${abcSoles(act.tasa, 4)} × ${abcFmt(consumo, 0)} ${esc(ind.unidad)} = <b>${abcSoles(act.asignado[prod.codigo] || 0)}</b>.`),
        paso(6, 'Costo total, unitario y margen del producto',
            'Costo total = MP directa + Σ actividades asignadas · Costo unitario = Costo total ÷ Unidades · Margen = (Ventas − Costo) ÷ Ventas',
            `${esc(prod.nombre)}: ${abcSoles(prod.mp)} + ${abcSoles(prod.indirecto)} = <b>${abcSoles(prod.total)}</b> ÷ ${abcFmt(prod.unidades, 0)} und =
             <b>${abcSoles(prod.unitario, 4)}</b> por unidad · margen <b>${abcPct(prod.margen)}</b>.`),
        paso(7, 'Comparativo · costeo tradicional',
            'Tasa única = Total de recursos indirectos ÷ Total de horas MOD · Indirecto del producto = Tasa única × Horas MOD del producto',
            baseTrad > 0 ? `${abcSoles(c.totalRecursos)} ÷ ${abcFmt(baseTrad, 0)} h-h = ${abcSoles(c.totalRecursos / baseTrad, 4)} por h-h ·
                ${esc(prod.nombre)}: × ${abcFmt(hmodProd, 0)} h-h + MP = <b>${abcSoles(prod.tradUnitario, 4)}</b> por unidad
                (ABC: ${abcSoles(prod.unitario, 4)}).` : 'No hay consumo de horas MOD registrado.')
    ].join('');
}

// ---------- CENTROS: Mapa de procesos · Organigrama · MOF ----------
function abcCentrosOrdenados() {
    return abc.centros.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

function abcEmpleadosDeCargo(cargo) {
    const nombres = [];
    abc.planillas.filter(p => p.periodo === abc.periodo && abcNorm(p.empleado_cargo) === abcNorm(cargo))
        .forEach(p => { if (!nombres.includes(p.empleado_nombre)) nombres.push(p.empleado_nombre); });
    return nombres;
}

function abcToggleEdicion(cual) {
    abc[cual] = !abc[cual];
    abcRenderCentros();
}

function abcRenderCentros() {
    const c = abc.calc;
    const ed = abc.editMapa;
    const filtro = t => abcCentrosOrdenados().filter(x => x.tipo === t);

    const centroBox = x => `
        <div class="abc-proc abc-proc-${x.tipo} ${ed ? 'abc-editable' : ''}" data-centro="${esc(x.codigo)}"
             ${ed ? `draggable="true" ondragstart="abcDragInicio(event,'centro','${esc(x.codigo)}')"` : ''}>
            <div class="abc-proc-name">${esc(x.nombre)}</div>
            <div class="abc-proc-cost">${abcSoles(c.centroCosto[x.codigo] || 0, 0)}</div>
            ${ed ? `<div class="abc-proc-tools">
                <button class="abc-icon-btn" title="Mover a la izquierda" onclick="abcMoverCentroPaso('${esc(x.codigo)}',-1)">◀</button>
                <button class="abc-icon-btn" title="Editar" onclick="abcAbrirCentro('${esc(x.codigo)}')">✏️</button>
                <button class="abc-icon-btn" title="Mover a la derecha" onclick="abcMoverCentroPaso('${esc(x.codigo)}',1)">▶</button>
            </div>` : ''}
        </div>`;

    const banda = (t, etiqueta, cadena) => `
        <div class="abc-mapa-band band-${t}">
            <div class="abc-band-label">${etiqueta}
                ${ed ? `<button class="btn btn-sm" onclick="abcAbrirCentro(null,'${t}')">+ Centro</button>` : ''}</div>
            <div class="abc-band-items ${cadena ? 'abc-chain' : ''} ${ed ? 'abc-drop' : ''}" data-tipo="${t}"
                 ${ed ? `ondragover="abcDragSobre(event)" ondragleave="abcDragFuera(event)" ondrop="abcSoltarMapa(event,'${t}')"` : ''}>
                ${filtro(t).map(centroBox).join(cadena ? '<span class="abc-chain-arrow">➜</span>' : '') || '<span class="abc-muted">Sin centros</span>'}
            </div>
        </div>`;

    document.getElementById('abcMapaTools').innerHTML = `
        <button class="btn ${ed ? 'btn-success' : 'btn-primary'}" onclick="abcToggleEdicion('editMapa')">${ed ? '✔ Terminar edición' : '✏️ Editar mapa'}</button>
        ${ed ? '<span class="abc-muted">Arrastre los centros entre bandas o para reordenarlos · ✏️ edita nombre, tipo y funciones.</span>' : ''}`;

    document.getElementById('abcMapa').innerHTML = `
        <div class="abc-mapa">
            <div class="abc-mapa-side">Necesidades del cliente</div>
            <div class="abc-mapa-body">
                ${banda('estrategico', 'Procesos estratégicos', false)}
                ${banda('operativo', 'Procesos operativos', true)}
                ${banda('apoyo', 'Procesos de apoyo', false)}
            </div>
            <div class="abc-mapa-side">Satisfacción del cliente</div>
        </div>`;

    abcRenderOrganigrama();

    // MOF
    document.getElementById('abcMof').innerHTML = abcCentrosOrdenados().map(x => `
        <tr>
            <td><strong>${esc(x.codigo)}</strong></td>
            <td>${esc(x.nombre)}</td>
            <td><span class="abc-tag abc-tag-${x.tipo}">${ABC_TIPOS[x.tipo] ? ABC_TIPOS[x.tipo].nombre : esc(x.tipo)}</span></td>
            <td>${esc(x.responsable || '')}</td>
            <td class="abc-mof-fn">${esc(x.funciones || '')}</td>
            <td>${abc.actividades.filter(a => a.centro_codigo === x.codigo).map(a => esc(a.nombre)).join('<br>')}</td>
            <td><button class="abc-icon-btn" title="Editar" onclick="abcAbrirCentro('${esc(x.codigo)}')">✏️</button></td>
        </tr>`).join('');

    // Tabla de centros de costos
    const totalCentros = Object.values(c.centroCosto).reduce((s, v) => s + v, 0);
    document.getElementById('abcCentrosTabla').innerHTML = abcCentrosOrdenados().map(x => {
        const costo = c.centroCosto[x.codigo] || 0;
        const nRec = c.recursos.filter(r => r.montoCalc > 0 && abcPctRecurso(r.codigo, x.codigo) > 0).length;
        return `<tr>
            <td><strong>${esc(x.codigo)}</strong></td>
            <td>${esc(x.nombre)}</td>
            <td><span class="abc-tag abc-tag-${x.tipo}">${ABC_TIPOS[x.tipo] ? ABC_TIPOS[x.tipo].nombre : esc(x.tipo)}</span></td>
            <td>${esc(x.responsable || '')}</td>
            <td class="num">${nRec}</td>
            <td class="num">${abc.actividades.filter(a => a.centro_codigo === x.codigo).length}</td>
            <td class="num">${abcSoles(c.centroPrimario[x.codigo] || 0)}</td>
            <td class="num"><strong>${abcSoles(costo)}</strong></td>
            <td class="num">${abcPct(totalCentros ? costo / totalCentros * 100 : 0)}</td>
        </tr>`;
    }).join('') + `<tr class="abc-total"><td colspan="5">TOTAL CENTROS DE COSTOS</td>
        <td class="num">${abc.actividades.length}</td><td class="num">${abcSoles(Object.values(c.centroPrimario).reduce((s, v) => s + v, 0))}</td><td class="num">${abcSoles(totalCentros)}</td><td class="num">${abcPct(totalCentros ? 100 : 0)}</td></tr>`;
}

// ---------- ACTIVIDADES ----------
function abcRenderActividades() {
    const c = abc.calc;
    const total = c.actividades.reduce((s, a) => s + a.costo, 0);
    const nivelDe = a => ABC_NIVEL_INDUCTOR[a.inductor_codigo];

    document.getElementById('abcActividadesTabla').innerHTML = c.actividades.map(a => {
        const centro = abc.centros.find(x => x.codigo === a.centro_codigo) || {};
        const i = abc.inductores.find(x => x.codigo === a.inductor_codigo) || { nombre: '—', unidad: '' };
        const nivel = nivelDe(a);
        return `<tr>
            <td>${esc(a.codigo)}</td>
            <td><strong>${esc(a.nombre)}</strong></td>
            <td><span class="abc-tag abc-tag-${centro.tipo}">${esc(centro.nombre || a.centro_codigo)}</span></td>
            <td>${nivel ? `<span class="abc-nivel abc-nivel-${nivel}">${ABC_NIVELES[nivel]}</span>` : '<span class="abc-muted">—</span>'}</td>
            <td class="num">${abcPct(a.porcentaje)}</td>
            <td class="num"><strong>${abcSoles(a.costo)}</strong>${Math.abs(a.costo - a.costoPrimario) > 0.005
                ? `<br><small class="abc-muted" title="Costo recibido del centro antes de las etapas de reparto entre actividades">antes: ${abcSoles(a.costoPrimario, 0)}</small>` : ''}</td>
            <td class="num">${abcPct(total ? a.costo / total * 100 : 0)}</td>
            <td>${esc(i.nombre)}</td>
            <td class="num">${abcSoles(a.tasa, 4)} <small class="abc-muted">/ ${esc(i.unidad)}</small></td>
        </tr>`;
    }).join('') + `<tr class="abc-total"><td colspan="5">TOTAL ACTIVIDADES (${c.actividades.length})</td>
        <td class="num">${abcSoles(total)}</td><td class="num">${abcPct(total ? 100 : 0)}</td><td colspan="2"></td></tr>`;

    const top = c.actividades.slice().sort((a, b) => b.costo - a.costo).slice(0, 8);
    const max = Math.max(1, ...top.map(a => a.costo));
    const porNivel = {};
    c.actividades.forEach(a => { const n = nivelDe(a) || 'otro'; porNivel[n] = (porNivel[n] || 0) + a.costo; });

    document.getElementById('abcActividadesRanking').innerHTML = `
        <div class="overview-grid">
            <div>
                <h3 class="abc-subtitle">Top ${top.length} por costo</h3>
                <table class="abc-mini">
                    <tbody>${top.map(a => `<tr>
                        <td>${esc(a.nombre)}</td>
                        <td class="abc-bar-cell"><div class="abc-stack"><span class="seg-op" style="width:${(a.costo / max * 100).toFixed(2)}%"></span></div></td>
                        <td class="num">${abcSoles(a.costo, 0)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
            <div>
                <h3 class="abc-subtitle">Costo por nivel de jerarquía</h3>
                <table class="abc-mini">
                    <thead><tr><th>Nivel</th><th class="num">Costo</th><th class="num">%</th></tr></thead>
                    <tbody>${Object.entries(porNivel).sort((a, b) => b[1] - a[1]).map(([n, v]) => `<tr>
                        <td>${ABC_NIVELES[n] ? `<span class="abc-nivel abc-nivel-${n}">${ABC_NIVELES[n]}</span>` : 'Sin clasificar'}</td>
                        <td class="num">${abcSoles(v)}</td>
                        <td class="num">${abcPct(total ? v / total * 100 : 0)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;
}

function abcRenderOrganigrama() {
    const ed = abc.editOrg;
    const existe = cod => abc.centros.some(x => x.codigo === cod);
    const hijos = cod => abcCentrosOrdenados().filter(x => x.padre_codigo === cod && x.codigo !== cod);
    const raices = abcCentrosOrdenados().filter(x => !x.padre_codigo || !existe(x.padre_codigo));
    const opcionesCentro = sel => abcCentrosOrdenados().map(x =>
        `<option value="${esc(x.codigo)}" ${x.codigo === sel ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('');

    const puesto = o => {
        const emps = abcEmpleadosDeCargo(o.cargo);
        return `
        <div class="abc-org-emp ${ed ? 'abc-editable' : ''}" ${ed ? `draggable="true" ondragstart="abcDragInicio(event,'puesto','${o.id}')"` : ''}>
            <b>${esc(o.cargo)}</b>
            ${emps.length ? emps.map(n => `<span>${esc(n)}</span>`).join('') : '<span class="abc-vacante">Vacante</span>'}
            ${ed ? `<div class="abc-puesto-tools">
                <select class="abc-input-sel" title="Mover a otro centro" onchange="abcMoverPuesto(${o.id}, this.value)">
                    <option value="">— Sin asignar —</option>${opcionesCentro(o.centro_codigo)}</select>
                <button class="abc-icon-btn" title="Quitar puesto" onclick="abcQuitarPuesto(${o.id})">✕</button>
            </div>` : ''}
        </div>`;
    };
    const puestosDe = cod => abc.organigrama.filter(o => (o.centro_codigo || null) === cod)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));

    const visitados = new Set();
    const nodo = x => {
        if (visitados.has(x.codigo)) return '';
        visitados.add(x.codigo);
        const subs = hijos(x.codigo);
        const ps = puestosDe(x.codigo);
        return `<li>
            <div class="abc-org-box abc-proc-${x.tipo} ${ed ? 'abc-editable abc-drop' : ''}" data-centro="${esc(x.codigo)}"
                ${ed ? `draggable="true" ondragstart="abcDragInicio(event,'centro','${esc(x.codigo)}')"
                        ondragover="abcDragSobre(event)" ondragleave="abcDragFuera(event)" ondrop="abcSoltarOrg(event,'${esc(x.codigo)}')"` : ''}>
                <div class="abc-org-centro">${esc(x.nombre)}
                    ${ed ? `<button class="abc-icon-btn" title="Editar centro" onclick="abcAbrirCentro('${esc(x.codigo)}')">✏️</button>` : ''}</div>
                ${ps.map(puesto).join('') || '<div class="abc-org-emp abc-muted">Personal compartido</div>'}
                ${ed ? `<button class="btn btn-sm abc-add-puesto" onclick="abcAgregarPuesto('${esc(x.codigo)}')">+ Puesto</button>` : ''}
            </div>
            ${subs.length ? `<ul>${subs.map(nodo).join('')}</ul>` : ''}
        </li>`;
    };
    let arbol = raices.map(nodo).join('');
    // Centros atrapados en un ciclo de dependencias: se muestran como raíz
    abcCentrosOrdenados().filter(x => !visitados.has(x.codigo)).forEach(x => { arbol += nodo(x); });

    const sinAsignar = puestosDe(null);
    const totalEmp = new Set(abc.planillas.filter(p => p.periodo === abc.periodo).map(p => p.empleado_nombre)).size;

    document.getElementById('abcOrgTools').innerHTML = `
        <button class="btn ${ed ? 'btn-success' : 'btn-primary'}" onclick="abcToggleEdicion('editOrg')">${ed ? '✔ Terminar edición' : '✏️ Editar organigrama'}</button>
        ${ed ? '<span class="abc-muted">Arrastre un centro sobre otro para cambiar de quién depende · arrastre un puesto a otro centro · ✏️ edita el centro.</span>' : ''}`;

    document.getElementById('abcOrganigrama').innerHTML = `
        ${ed ? `<div class="abc-org-root abc-drop" ondragover="abcDragSobre(event)" ondragleave="abcDragFuera(event)" ondrop="abcSoltarOrg(event,null)">
            ⬆ Soltar aquí un centro para ubicarlo en el nivel superior · o un puesto para dejarlo sin asignar</div>` : ''}
        <div class="abc-tree"><ul>${arbol}</ul></div>
        ${sinAsignar.length ? `<div class="abc-org-box abc-sin-asignar"><div class="abc-org-centro">Puestos sin asignar</div>${sinAsignar.map(puesto).join('')}</div>` : ''}
        <p class="abc-muted abc-note">Fuente: tabla <b>planillas</b> · ${abcNombreMes(abc.periodo)} · ${totalEmp} trabajadores.
        Los cambios se guardan en las tablas <b>abc_centros</b> y <b>abc_organigrama</b>.</p>`;
}

// ---------- Arrastrar y soltar ----------
function abcDragInicio(ev, tipo, valor) {
    ev.stopPropagation();
    ev.dataTransfer.setData('text/plain', tipo + ':' + valor);
    ev.dataTransfer.effectAllowed = 'move';
}
function abcDragSobre(ev) { ev.preventDefault(); ev.currentTarget.classList.add('abc-drop-over'); }
function abcDragFuera(ev) { ev.currentTarget.classList.remove('abc-drop-over'); }
function abcLeerDrag(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.classList.remove('abc-drop-over');
    const [tipo, ...resto] = (ev.dataTransfer.getData('text/plain') || '').split(':');
    return { tipo, valor: resto.join(':') };
}

function abcSoltarMapa(ev, tipo) {
    const d = abcLeerDrag(ev);
    if (d.tipo !== 'centro') return;
    const destino = ev.target.closest('[data-centro]');
    abcReordenarCentro(d.valor, tipo, destino ? destino.dataset.centro : null);
}

function abcSoltarOrg(ev, centroDestino) {
    const d = abcLeerDrag(ev);
    if (d.tipo === 'puesto') abcMoverPuesto(Number(d.valor), centroDestino || '');
    else if (d.tipo === 'centro') abcCambiarPadre(d.valor, centroDestino);
}

// ---------- Mapa de procesos ----------
async function abcGuardarOrdenCentros(lista) {
    const cambios = [];
    lista.forEach((x, i) => { if (x.orden !== i + 1) { x.orden = i + 1; cambios.push(x); } });
    for (const x of cambios) await abcGuardarFilaCentro(x);
}

function abcGuardarFilaCentro(x) {
    return abcGuardar('abc_centros', {
        codigo: x.codigo, nombre: x.nombre, tipo: x.tipo, responsable: x.responsable || null,
        funciones: x.funciones || null, padre_codigo: x.padre_codigo || null, orden: x.orden || 0
    }, 'codigo');
}

function abcReordenarCentro(codigo, tipo, antesDe) {
    if (codigo === antesDe) return;
    abcTrasCambio(async () => {
        const lista = abcCentrosOrdenados();
        const item = lista.find(x => x.codigo === codigo);
        if (!item) return;
        lista.splice(lista.indexOf(item), 1);
        const tipoCambio = item.tipo !== tipo;
        item.tipo = tipo;
        let idx = antesDe ? lista.findIndex(x => x.codigo === antesDe) : -1;
        if (idx < 0) {
            const ultimos = lista.map((x, i) => x.tipo === tipo ? i : -1).filter(i => i >= 0);
            idx = ultimos.length ? ultimos[ultimos.length - 1] + 1 : lista.length;
        }
        lista.splice(idx, 0, item);
        await abcGuardarOrdenCentros(lista);
        if (tipoCambio) await abcGuardarFilaCentro(item);
    });
}

function abcMoverCentroPaso(codigo, paso) {
    const mismos = abcCentrosOrdenados().filter(x => x.tipo === (abc.centros.find(c => c.codigo === codigo) || {}).tipo);
    const i = mismos.findIndex(x => x.codigo === codigo);
    const j = i + paso;
    if (i < 0 || j < 0 || j >= mismos.length) return;
    // Se inserta antes del vecino (izquierda) o antes del siguiente al vecino (derecha)
    const antes = paso < 0 ? mismos[j].codigo : (mismos[j + 1] ? mismos[j + 1].codigo : null);
    abcReordenarCentro(codigo, mismos[i].tipo, antes);
}

// ---------- Organigrama ----------
function abcEsDescendiente(posible, ancestro) {
    let actual = abc.centros.find(x => x.codigo === posible);
    const vistos = new Set();
    while (actual && actual.padre_codigo && !vistos.has(actual.codigo)) {
        if (actual.padre_codigo === ancestro) return true;
        vistos.add(actual.codigo);
        actual = abc.centros.find(x => x.codigo === actual.padre_codigo);
    }
    return false;
}

function abcCambiarPadre(codigo, padre) {
    if (codigo === padre) return;
    if (padre && abcEsDescendiente(padre, codigo)) {
        showAlert('⚠️ No se puede: ese centro depende de ' + codigo + ' (se formaría un ciclo).', 'error');
        return;
    }
    abcTrasCambio(async () => {
        const x = abc.centros.find(c => c.codigo === codigo);
        x.padre_codigo = padre || null;
        await abcGuardarFilaCentro(x);
    });
}

function abcMoverPuesto(id, centro) {
    abcTrasCambio(async () => {
        const o = abc.organigrama.find(p => p.id === id);
        if (!o) return;
        o.centro_codigo = centro || null;
        await abcGuardar('abc_organigrama', { cargo: o.cargo, centro_codigo: o.centro_codigo, orden: o.orden || 0 }, 'cargo');
    });
}

function abcAgregarPuesto(centro) {
    const libres = [...new Set(abc.planillas.map(p => p.empleado_cargo))]
        .filter(c => !abc.organigrama.some(o => abcNorm(o.cargo) === abcNorm(c)));
    const cargo = (prompt('Nombre del puesto (cargo):' + (libres.length ? '\nCargos de planilla sin ubicar: ' + libres.join(', ') : ''), libres[0] || '') || '').trim();
    if (!cargo) return;
    const existente = abc.organigrama.find(o => abcNorm(o.cargo) === abcNorm(cargo));
    if (existente) { abcMoverPuesto(existente.id, centro); return; }
    abcTrasCambio(async () => {
        const fila = { cargo, centro_codigo: centro, orden: abc.organigrama.length + 1 };
        const [g] = await abcInsertar('abc_organigrama', [fila]);
        abc.organigrama.push(g && g.id ? g : { id: Date.now(), ...fila });
    });
}

function abcQuitarPuesto(id) {
    const o = abc.organigrama.find(p => p.id === id);
    if (!o) return;
    // Un cargo de la planilla no se borra (se volvería a crear al recargar): queda sin asignar
    if (abc.planillas.some(p => abcNorm(p.empleado_cargo) === abcNorm(o.cargo))) {
        abcMoverPuesto(id, '');
        return;
    }
    if (!confirm('¿Eliminar el puesto "' + o.cargo + '"?')) return;
    abcTrasCambio(async () => {
        await abcBorrar('abc_organigrama', 'id', id);
        abc.organigrama = abc.organigrama.filter(p => p.id !== id);
    });
}

// ---------- Modal de centro de actividad ----------
function abcAbrirCentro(codigo, tipo) {
    const x = codigo ? abc.centros.find(c => c.codigo === codigo) : null;
    abc._centroEditando = x ? x.codigo : null;
    document.getElementById('cenTituloModal').textContent = x ? '🏢 Editar centro de actividad' : '🏢 Nuevo centro de actividad';
    document.getElementById('cenCodigo').value = x ? x.codigo : abcSiguienteCodigo(abc.centros, 'CA-N');
    document.getElementById('cenCodigo').readOnly = !!x;
    document.getElementById('cenNombre').value = x ? x.nombre : '';
    document.getElementById('cenTipo').value = x ? x.tipo : (tipo || 'operativo');
    document.getElementById('cenResponsable').value = x ? (x.responsable || '') : '';
    document.getElementById('cenFunciones').value = x ? (x.funciones || '') : '';
    document.getElementById('cenPadre').innerHTML = '<option value="">— Ninguno (nivel superior) —</option>' +
        abcCentrosOrdenados().filter(c => !x || (c.codigo !== x.codigo && !abcEsDescendiente(c.codigo, x.codigo)))
            .map(c => `<option value="${esc(c.codigo)}">${esc(c.nombre)}</option>`).join('');
    document.getElementById('cenPadre').value = x ? (x.padre_codigo || '') : (abc.centros.some(c => c.codigo === 'CA-GER') ? 'CA-GER' : '');
    document.getElementById('cenCargos').innerHTML = [...new Set(abc.organigrama.map(o => o.cargo))].map(c => `<option value="${esc(c)}">`).join('');
    document.getElementById('cenEliminar').style.display = x ? '' : 'none';
    openModal('modalCentro');
}

function abcGuardarCentroModal() {
    const codigo = document.getElementById('cenCodigo').value.trim().toUpperCase();
    const nombre = document.getElementById('cenNombre').value.trim();
    if (!codigo || !nombre) { showAlert('Complete código y nombre del centro', 'error'); return; }
    const editando = abc._centroEditando;
    if (!editando && abc.centros.some(c => c.codigo === codigo)) { showAlert('El código ya existe', 'error'); return; }
    const datos = {
        nombre, tipo: document.getElementById('cenTipo').value,
        responsable: document.getElementById('cenResponsable').value.trim(),
        funciones: document.getElementById('cenFunciones').value.trim(),
        padre_codigo: document.getElementById('cenPadre').value || null
    };
    closeModal('modalCentro');
    abcTrasCambio(async () => {
        let x = abc.centros.find(c => c.codigo === editando);
        if (x) Object.assign(x, datos);
        else {
            x = { id: Date.now(), codigo, orden: Math.max(0, ...abc.centros.map(c => c.orden || 0)) + 1, ...datos };
            abc.centros.push(x);
        }
        const g = await abcGuardarFilaCentro(x);
        if (g && g.id) x.id = g.id;
        showAlert(editando ? '✅ Centro actualizado' : '✅ Centro creado. Agregue sus actividades en "Centros → Actividades" y su distribución en "Recursos → Centros".', 'success');
    });
}

function abcEliminarCentroModal() {
    const codigo = abc._centroEditando;
    if (!codigo) return;
    const nAct = abc.actividades.filter(a => a.centro_codigo === codigo).length;
    if (!confirm(`¿Eliminar el centro ${codigo}?\nTambién se eliminan sus ${nAct} actividades y su distribución del inductor tipo 1. Sus puestos quedan sin asignar.`)) return;
    closeModal('modalCentro');
    abcTrasCambio(async () => {
        const actsCentro = abc.actividades.filter(a => a.centro_codigo === codigo).map(a => a.codigo);
        await abcBorrar('abc_centros', 'codigo', codigo);
        await abcLimpiarReferencias('centro', codigo);
        for (const a of actsCentro) await abcLimpiarReferencias('actividad', a);
        abc.centros = abc.centros.filter(c => c.codigo !== codigo);
        abc.centros.forEach(c => { if (c.padre_codigo === codigo) c.padre_codigo = null; });
        abc.actividades = abc.actividades.filter(a => a.centro_codigo !== codigo);
        abc.inductor1 = abc.inductor1.filter(f => f.centro_codigo !== codigo);
        abc.organigrama.forEach(o => { if (o.centro_codigo === codigo) o.centro_codigo = null; });
    });
}

// ---------- RECURSOS ----------
function abcCeldaMonto(r) {
    const m = abcMontoMes(r, abc.periodo);
    const valor = abc.modoMonto === 'base' ? Number(r.monto) || 0 : m.monto;
    return `<input type="number" step="0.01" min="0" class="abc-input abc-input-w ${m.propio && abc.modoMonto === 'mes' ? 'abc-has' : ''}" value="${valor}"
            onchange="abcCambiarMontoRecurso('${esc(r.codigo)}', this.value)">
        <br><small class="abc-muted">${m.propio
            ? `monto de ${abcNombreMes(abc.periodo).toLowerCase()} · base ${abcFmt(r.monto)} <button class="abc-icon-btn" title="Volver al monto base" onclick="abcQuitarMontoMes('${esc(r.codigo)}')">↺</button>`
            : 'monto base (todos los meses)'}</small>`;
}

function abcRenderRecursos() {
    const c = abc.calc;
    const modo = document.getElementById('abcModoMonto');
    if (modo) modo.innerHTML = `<label>Al editar el monto de un gasto:
        <select class="abc-input-sel" onchange="abc.modoMonto=this.value; abcRenderRecursos()">
            <option value="mes" ${abc.modoMonto === 'mes' ? 'selected' : ''}>Cambiar solo ${abcNombreMes(abc.periodo)}</option>
            <option value="base" ${abc.modoMonto === 'base' ? 'selected' : ''}>Cambiar el monto base (meses sin monto propio)</option>
        </select></label>
        <button class="btn btn-sm" onclick="abcGenerarVariacionEjemplo()">🎲 Generar montos mensuales de ejemplo</button>`;
    let html = '';
    Object.entries(ABC_CATEGORIAS).forEach(([cat, nombre]) => {
        const filas = c.recursos.filter(r => r.categoria === cat);
        if (!filas.length) return;
        html += `<tr class="abc-group"><td colspan="5">${esc(nombre)} (${cat})</td><td class="num">${abcSoles(c.porCategoria[cat] || 0)}</td><td></td></tr>`;
        html += filas.map(r => `
            <tr>
                <td>${esc(r.codigo)}</td>
                <td>${esc(r.nombre)}</td>
                <td>${r.origen === 'planilla' ? '<span class="abc-tag abc-tag-apoyo">Planilla</span>' : '<span class="abc-tag abc-tag-operativo">Gasto</span>'}</td>
                <td>
                    <select class="abc-input-sel" onchange="abcCambiarCategoria('${esc(r.codigo)}', this.value)">
                        ${Object.keys(ABC_CATEGORIAS).map(k => `<option value="${k}" ${k === r.categoria ? 'selected' : ''}>${k}</option>`).join('')}
                    </select>
                </td>
                <td class="num ${Math.abs(r.pctTotal - 100) > 0.01 ? 'abc-neg' : ''}">${abcPct(r.pctTotal)}</td>
                <td class="num">${r.origen === 'planilla'
                    ? `<span title="Suma de costo_total_empleador del período">${abcSoles(r.montoCalc)}</span>`
                    : abcCeldaMonto(r)}</td>
                <td>${r.origen === 'planilla' ? '' : `<button class="abc-icon-btn" title="Eliminar" onclick="abcEliminarRecurso('${esc(r.codigo)}')">🗑️</button>`}</td>
            </tr>`).join('');
    });
    html += `<tr class="abc-total"><td colspan="5">TOTAL RECURSOS INDIRECTOS DEL PERÍODO</td><td class="num">${abcSoles(c.totalRecursos)}</td><td></td></tr>`;
    document.getElementById('abcRecursosTabla').innerHTML = html;

    // Detalle de planilla por trabajador
    const pl = abc.planillas.filter(p => p.periodo === abc.periodo);
    document.getElementById('abcPlanillaTabla').innerHTML = pl.map(p => `
        <tr>
            <td>${esc(p.empleado_nombre)}</td>
            <td>${esc(p.empleado_cargo)}</td>
            <td class="num">${abcSoles(p.total_bruto)}</td>
            <td class="num">${abcSoles(p.essalud)}</td>
            <td class="num">${abcSoles(p.cts)}</td>
            <td class="num"><strong>${abcSoles(p.costo_total_empleador)}</strong></td>
        </tr>`).join('') + `<tr class="abc-total"><td colspan="5">Total planilla ${abcNombreMes(abc.periodo)}</td>
            <td class="num">${abcSoles(pl.reduce((s, p) => s + (Number(p.costo_total_empleador) || 0), 0))}</td></tr>`;
}

// ---------- INDUCTOR TIPO 1 ----------
function abcRenderInd1() {
    const c = abc.calc;
    const cols = abc.centros;
    const head = `<tr><th class="abc-sticky">Recurso</th><th class="num">Monto</th>
        ${cols.map(x => `<th class="num abc-th-${x.tipo}" title="${esc(x.nombre)}">${esc(x.codigo.replace('CA-', ''))}</th>`).join('')}
        <th class="num">Σ %</th></tr>`;
    const body = c.recursos.map(r => `
        <tr>
            <td class="abc-sticky"><strong>${esc(r.nombre)}</strong><br><small class="abc-muted">${esc(r.codigo)} · ${r.categoria}</small></td>
            <td class="num">${abcSoles(r.montoCalc, 0)}</td>
            ${cols.map(x => {
                const p = abcPctRecurso(r.codigo, x.codigo);
                return `<td class="num"><input type="number" step="0.1" min="0" max="100" class="abc-input abc-pct ${p ? 'abc-has' : ''}"
                    value="${p || ''}" placeholder="0" title="${esc(x.nombre)}: ${abcSoles(r.montoCalc * p / 100)}"
                    onchange="abcCambiarInd1('${esc(r.codigo)}','${esc(x.codigo)}', this.value)"></td>`;
            }).join('')}
            <td class="num ${Math.abs(r.pctTotal - 100) > 0.01 ? 'abc-neg' : 'abc-pos'}"><strong>${abcPct(r.pctTotal)}</strong></td>
        </tr>`).join('');
    const pie = `<tr class="abc-total"><td class="abc-sticky">COSTO POR CENTRO</td><td class="num">${abcSoles(c.totalRecursos, 0)}</td>
        ${cols.map(x => `<td class="num">${abcFmt(c.centroPrimario[x.codigo] || 0, 0)}</td>`).join('')}<td></td></tr>`;
    document.getElementById('abcInd1Tabla').innerHTML = `<thead>${head}</thead><tbody>${body}${pie}</tbody>`;

    document.getElementById('abcInd1Centros').innerHTML = cols.map(x => {
        const cat = c.centroPrimarioCat[x.codigo] || {};
        return `<tr>
            <td><strong>${esc(x.codigo)}</strong></td><td>${esc(x.nombre)}</td>
            <td><span class="abc-tag abc-tag-${x.tipo}">${ABC_TIPOS[x.tipo].nombre}</span></td>
            ${['MOD', 'MOI', 'CIF', 'GADM', 'GVTA'].map(k => `<td class="num">${cat[k] ? abcFmt(cat[k]) : '–'}</td>`).join('')}
            <td class="num"><strong>${abcSoles(c.centroPrimario[x.codigo] || 0)}</strong></td>
        </tr>`;
    }).join('') + `<tr class="abc-total"><td colspan="8">TOTAL</td><td class="num">${abcSoles(Object.values(c.centroPrimario).reduce((s, v) => s + v, 0))}</td></tr>`;
}

// ---------- INDUCTOR TIPO 2 ----------
function abcRenderInd2() {
    const c = abc.calc;
    const opcionesInd = sel => abc.inductores.map(i => `<option value="${esc(i.codigo)}" ${i.codigo === sel ? 'selected' : ''}>${esc(i.nombre)}</option>`).join('');
    document.getElementById('abcInd2').innerHTML = Object.entries(ABC_TIPOS).map(([t, v]) => `
        <h3 class="abc-subtitle">${v.icono} Centros ${v.nombre.toLowerCase()}</h3>
        <div class="abc-grid">
        ${abc.centros.filter(x => x.tipo === t).map(x => {
            const acts = c.actividades.filter(a => a.centro_codigo === x.codigo);
            const suma = acts.reduce((s, a) => s + (Number(a.porcentaje) || 0), 0);
            return `
            <div class="abc-centro-card abc-proc-${x.tipo}">
                <div class="abc-centro-head">
                    <div><strong>${esc(x.nombre)}</strong><small>${esc(x.codigo)}</small></div>
                    <div class="abc-centro-cost">${abcSoles(c.centroCosto[x.codigo] || 0)}</div>
                </div>
                <table class="abc-mini">
                    <thead><tr><th>Actividad</th><th class="num">%</th><th class="num">Costo</th><th>Inductor tipo 3</th><th></th></tr></thead>
                    <tbody>
                    ${acts.map(a => `<tr>
                        <td>${esc(a.nombre)}<br><small class="abc-muted">${esc(a.codigo)}</small></td>
                        <td class="num"><input type="number" step="0.1" min="0" max="100" class="abc-input abc-pct abc-has" value="${Number(a.porcentaje) || 0}"
                            onchange="abcCambiarActividad('${esc(a.codigo)}','porcentaje', this.value)"></td>
                        <td class="num">${abcFmt(a.costoPrimario)}</td>
                        <td><select class="abc-input-sel" onchange="abcCambiarActividad('${esc(a.codigo)}','inductor_codigo', this.value)">${opcionesInd(a.inductor_codigo)}</select></td>
                        <td><button class="abc-icon-btn" title="Eliminar actividad" onclick="abcEliminarActividad('${esc(a.codigo)}')">🗑️</button></td>
                    </tr>`).join('')}
                    <tr class="abc-total"><td>Σ</td><td class="num ${Math.abs(suma - 100) > 0.01 ? 'abc-neg' : 'abc-pos'}">${abcPct(suma)}</td>
                        <td class="num">${abcFmt(acts.reduce((s, a) => s + a.costoPrimario, 0))}</td>
                        <td colspan="2"><button class="btn btn-sm" onclick="abcAbrirActividad('${esc(x.codigo)}')">+ Actividad</button></td></tr>
                    </tbody>
                </table>
            </div>`;
        }).join('')}
        </div>`).join('');
}

// ---------- INDUCTOR TIPO 3 ----------
function abcRenderInd3() {
    const c = abc.calc;
    const prods = c.productos;
    const ind = codigo => abc.inductores.find(i => i.codigo === codigo) || { nombre: '—', unidad: '' };

    document.getElementById('abcTasas').innerHTML = c.actividades.map(a => {
        const centro = abc.centros.find(x => x.codigo === a.centro_codigo) || {};
        const i = ind(a.inductor_codigo);
        return `<tr>
            <td>${esc(a.codigo)}</td>
            <td><strong>${esc(a.nombre)}</strong></td>
            <td><span class="abc-tag abc-tag-${centro.tipo}">${esc(centro.nombre || '')}</span></td>
            <td class="num">${abcSoles(a.costo)}</td>
            <td>${esc(i.nombre)}</td>
            <td class="num">${abcFmt(a.totalInductor, 0)} ${esc(i.unidad)}</td>
            <td class="num"><strong>${abcSoles(a.tasa, 4)}</strong> <small class="abc-muted">/ ${esc(i.unidad)}</small></td>
        </tr>`;
    }).join('');

    document.getElementById('abcConsumo').innerHTML = `
        <thead><tr><th class="abc-sticky">Inductor tipo 3</th><th>Unidad</th>
            ${prods.map(p => `<th class="num">${esc(p.nombre)}</th>`).join('')}<th class="num">Total</th></tr></thead>
        <tbody>${abc.inductores.map(i => `
            <tr>
                <td class="abc-sticky"><strong>${esc(i.nombre)}</strong><br><small class="abc-muted">${esc(i.codigo)}</small></td>
                <td>${esc(i.unidad || '')}</td>
                ${prods.map(p => `<td class="num"><input type="number" step="any" min="0" class="abc-input abc-input-w"
                    value="${abcConsumoDe(i.codigo, p.codigo)}" onchange="abcCambiarConsumo('${esc(i.codigo)}','${esc(p.codigo)}', this.value)"></td>`).join('')}
                <td class="num"><strong>${abcFmt(c.totalInductor[i.codigo] || 0, 0)}</strong></td>
            </tr>`).join('')}
        </tbody>`;

    document.getElementById('abcAsignacion').innerHTML = `
        <thead><tr><th class="abc-sticky">Actividad</th><th class="num">Tasa</th>
            ${prods.map(p => `<th class="num">${esc(p.nombre)}</th>`).join('')}<th class="num">Total</th></tr></thead>
        <tbody>${c.actividades.map(a => `
            <tr>
                <td class="abc-sticky">${esc(a.nombre)}</td>
                <td class="num">${abcFmt(a.tasa, 4)}</td>
                ${prods.map(p => `<td class="num">${abcFmt(a.asignado[p.codigo] || 0)}</td>`).join('')}
                <td class="num"><strong>${abcFmt(prods.reduce((s, p) => s + (a.asignado[p.codigo] || 0), 0))}</strong></td>
            </tr>`).join('')}
            <tr class="abc-total"><td class="abc-sticky">COSTO ABC ASIGNADO</td><td></td>
                ${prods.map(p => `<td class="num">${abcFmt(p.indirecto)}</td>`).join('')}
                <td class="num">${abcFmt(c.totalAsignado)}</td></tr>
        </tbody>`;
}

// ---------- OBJETO DE COSTOS ----------
function abcRenderRubros() {
    const prods = abc.calc.productos;
    const fila = (titulo, fn, clase = '', dec = 2) => `<tr class="${clase}">
        <td class="abc-sticky">${titulo}</td>
        ${prods.map(p => `<td class="num">${abcFmt(fn(p), dec)}</td>`).join('')}
        <td class="num">${dec === 2 ? abcFmt(prods.reduce((s, p) => s + fn(p), 0)) : ''}</td>
    </tr>`;
    const unit = (p, v) => p.unidades > 0 ? v / p.unidades : 0;
    document.getElementById('abcRubros').innerHTML = `
        <thead><tr><th class="abc-sticky">Rubro</th>${prods.map(p => `<th class="num">${esc(p.nombre)}</th>`).join('')}<th class="num">Total</th></tr></thead>
        <tbody>
            ${fila('Materia prima directa', p => p.mp)}
            ${fila('Mano de obra directa (MOD)', p => p.rubros.MOD)}
            ${fila('Mano de obra indirecta (MOI)', p => p.rubros.MOI)}
            ${fila('Costos indirectos de fabricación (CIF)', p => p.rubros.CIF)}
            ${fila('COSTO DE PRODUCCIÓN', p => p.costoProduccion, 'abc-total')}
            ${fila('Gastos de administración', p => p.rubros.GADM)}
            ${fila('Gastos de ventas', p => p.rubros.GVTA)}
            ${fila('GASTOS DE OPERACIÓN', p => p.gastosOperacion, 'abc-total')}
            ${fila('COSTO TOTAL', p => p.total, 'abc-total')}
            ${fila('Ventas', p => p.ventas)}
            ${fila('UTILIDAD', p => p.utilidad, 'abc-total')}
            <tr class="abc-group"><td class="abc-sticky" colspan="${prods.length + 2}">Por unidad</td></tr>
            ${fila('Unidades producidas', p => p.unidades, '', 0)}
            ${fila('Costo de producción unitario', p => unit(p, p.costoProduccion), '', 4)}
            ${fila('Gasto de operación unitario', p => unit(p, p.gastosOperacion), '', 4)}
            ${fila('Costo total unitario', p => p.unitario, 'abc-total', 4)}
            ${fila('Precio de venta', p => p.precio, '', 4)}
            ${fila('Margen %', p => p.margen, '', 1)}
        </tbody>`;
}

function abcRenderObjetos() {
    const c = abc.calc;
    abcRenderRubros();
    document.getElementById('abcObjetos').innerHTML = c.productos.map(p => {
        const mats = abc.materiales.filter(m => m.producto_codigo === p.codigo);
        return `
        <div class="card abc-prod-card">
            <div class="abc-prod-head">
                <div>
                    <h2>🎯 ${esc(p.nombre)}</h2>
                    <div class="abc-muted">${esc(p.codigo)} · ${esc(p.presentacion)}</div>
                </div>
                <div class="abc-prod-kpis">
                    <div><small>Unidades / mes</small><input type="number" min="0" step="1" class="abc-input abc-input-w" value="${p.unidades}"
                        onchange="abcCambiarUnidades('${esc(p.codigo)}', this.value)"></div>
                    <div><small>Precio venta</small><input type="number" min="0" step="0.01" class="abc-input abc-input-s" value="${p.precio}"
                        onchange="abcCambiarPrecio('${esc(p.codigo)}', this.value)"></div>
                    <div><small>Costo unitario ABC</small><b>${abcSoles(p.unitario, 4)}</b></div>
                    <div><small>Margen</small><b class="${p.margen < 0 ? 'abc-neg' : 'abc-pos'}">${abcPct(p.margen)}</b></div>
                    <button class="abc-icon-btn" title="Quitar del costeo ABC" onclick="abcEliminarProducto('${esc(p.codigo)}')">🗑️</button>
                </div>
            </div>
            <div class="overview-grid">
                <div>
                    <h3 class="abc-subtitle">📦 Materia prima directa (por unidad)</h3>
                    <table class="abc-mini">
                        <thead><tr><th>Insumo</th><th class="num">Cant.</th><th>Und</th><th class="num">C. unit.</th><th class="num">Subtotal</th><th></th></tr></thead>
                        <tbody>
                        ${mats.map(m => `<tr>
                            <td><input class="abc-input abc-input-txt" value="${esc(m.insumo)}" onchange="abcCambiarMaterial(${m.id},'insumo', this.value)"></td>
                            <td class="num"><input type="number" step="any" min="0" class="abc-input abc-input-s" value="${Number(m.cantidad)}" onchange="abcCambiarMaterial(${m.id},'cantidad', this.value)"></td>
                            <td>${esc(m.unidad || '')}</td>
                            <td class="num"><input type="number" step="any" min="0" class="abc-input abc-input-s" value="${Number(m.costo_unitario)}" onchange="abcCambiarMaterial(${m.id},'costo_unitario', this.value)"></td>
                            <td class="num">${abcFmt((Number(m.cantidad) || 0) * (Number(m.costo_unitario) || 0), 4)}</td>
                            <td><button class="abc-icon-btn" onclick="abcEliminarMaterial(${m.id})">✕</button></td>
                        </tr>`).join('')}
                        <tr class="abc-total"><td colspan="4">MP por unidad</td><td class="num">${abcFmt(p.mpUnit, 4)}</td>
                            <td><button class="abc-icon-btn" title="Agregar insumo" onclick="abcAgregarMaterial('${esc(p.codigo)}')">＋</button></td></tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <h3 class="abc-subtitle">🧾 Hoja de costo ABC</h3>
                    <table class="abc-mini">
                        <thead><tr><th>Concepto</th><th class="num">Total S/</th><th class="num">Por unidad</th></tr></thead>
                        <tbody>
                            <tr><td>Materia prima directa</td><td class="num">${abcFmt(p.mp)}</td><td class="num">${abcFmt(p.mpUnit, 4)}</td></tr>
                            ${c.actividades.filter(a => (a.asignado[p.codigo] || 0) > 0.005).map(a => `
                            <tr><td class="abc-indent">${esc(a.nombre)}</td><td class="num">${abcFmt(a.asignado[p.codigo])}</td>
                                <td class="num">${abcFmt(p.unidades ? a.asignado[p.codigo] / p.unidades : 0, 4)}</td></tr>`).join('')}
                            <tr class="abc-total"><td>COSTO TOTAL</td><td class="num">${abcFmt(p.total)}</td><td class="num">${abcFmt(p.unitario, 4)}</td></tr>
                            <tr><td>Ventas (${abcFmt(p.unidades, 0)} × ${abcSoles(p.precio)})</td><td class="num">${abcFmt(p.ventas)}</td><td class="num">${abcFmt(p.precio, 4)}</td></tr>
                            <tr class="abc-total"><td>UTILIDAD</td><td class="num ${p.utilidad < 0 ? 'abc-neg' : ''}">${abcFmt(p.utilidad)}</td>
                                <td class="num">${abcFmt(p.unidades ? p.utilidad / p.unidades : 0, 4)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }).join('');

    document.getElementById('abcComparativo').innerHTML = c.productos.map(p => {
        const dif = p.unitario - p.tradUnitario;
        return `<tr>
            <td><strong>${esc(p.nombre)}</strong></td>
            <td class="num">${abcSoles(p.tradUnitario, 4)}</td>
            <td class="num">${abcSoles(p.unitario, 4)}</td>
            <td class="num ${dif > 0 ? 'abc-neg' : 'abc-pos'}">${dif > 0 ? '+' : ''}${abcFmt(dif, 4)}</td>
            <td>${Math.abs(dif) < 0.0001 ? '—' : dif > 0 ? 'Estaba <b>subcosteado</b>' : 'Estaba <b>sobrecosteado</b>'}</td>
        </tr>`;
    }).join('');
}

// ==================== EDICIÓN ====================
async function abcTrasCambio(fn) {
    try {
        await fn();
    } catch (e) {
        console.error(e);
    }
    abcRenderTodo();
}

function abcCambiarMonto(codigo, valor) {
    abcTrasCambio(async () => {
        const r = abc.recursos.find(x => x.codigo === codigo);
        r.monto = abcNum(valor);
        await abcGuardar('abc_recursos', { codigo, nombre: r.nombre, categoria: r.categoria, origen: r.origen, cargo: r.cargo, monto: r.monto }, 'codigo');
    });
}

function abcCambiarCategoria(codigo, categoria) {
    abcTrasCambio(async () => {
        const r = abc.recursos.find(x => x.codigo === codigo);
        r.categoria = categoria;
        await abcGuardar('abc_recursos', { codigo, nombre: r.nombre, categoria, origen: r.origen, cargo: r.cargo, monto: r.monto }, 'codigo');
    });
}

function abcCambiarInd1(recurso, centro, valor) {
    abcTrasCambio(async () => {
        const pct = abcNum(valor);
        let f = abc.inductor1.find(x => x.recurso_codigo === recurso && x.centro_codigo === centro);
        if (!f) { f = { recurso_codigo: recurso, centro_codigo: centro, porcentaje: pct }; abc.inductor1.push(f); }
        f.porcentaje = pct;
        await abcGuardar('abc_inductor1', { recurso_codigo: recurso, centro_codigo: centro, porcentaje: pct }, 'recurso_codigo,centro_codigo');
    });
}

function abcCambiarActividad(codigo, campo, valor) {
    abcTrasCambio(async () => {
        const a = abc.actividades.find(x => x.codigo === codigo);
        a[campo] = campo === 'porcentaje' ? abcNum(valor) : valor;
        await abcGuardar('abc_actividades', { codigo, nombre: a.nombre, centro_codigo: a.centro_codigo,
            porcentaje: a.porcentaje, inductor_codigo: a.inductor_codigo }, 'codigo');
    });
}

function abcCambiarConsumo(inductor, producto, valor) {
    abcTrasCambio(async () => {
        const cant = abcNum(valor);
        let f = abc.consumo.find(x => x.inductor_codigo === inductor && x.producto_codigo === producto);
        if (!f) { f = { inductor_codigo: inductor, producto_codigo: producto, cantidad: cant }; abc.consumo.push(f); }
        f.cantidad = cant;
        await abcGuardar('abc_consumo', { inductor_codigo: inductor, producto_codigo: producto, cantidad: cant }, 'inductor_codigo,producto_codigo');
    });
}

function abcCambiarUnidades(producto, valor) {
    abcTrasCambio(async () => {
        const o = abc.objetos.find(x => x.producto_codigo === producto);
        o.unidades = abcNum(valor);
        await abcGuardar('abc_objetos_costo', { producto_codigo: producto, presentacion: o.presentacion, unidades: o.unidades }, 'producto_codigo');
    });
}

function abcCambiarPrecio(producto, valor) {
    abcTrasCambio(async () => {
        const p = abc.productos.find(x => x.codigo === producto);
        if (!p) return;
        p.precio = abcNum(valor);
        if (abc.modo === 'db' && p.id) await DB.update('productos', p.id, { precio: p.precio });
    });
}

function abcCambiarMaterial(id, campo, valor) {
    abcTrasCambio(async () => {
        const m = abc.materiales.find(x => x.id === id);
        m[campo] = campo === 'insumo' ? valor : abcNum(valor);
        if (abc.modo === 'db') await DB.update('abc_materiales', id, { [campo]: m[campo] });
    });
}

function abcAgregarMaterial(producto) {
    const insumo = prompt('Nombre del insumo:');
    if (!insumo) return;
    const unidad = prompt('Unidad de medida (und, L, kg…):', 'und') || 'und';
    abcTrasCambio(async () => {
        const fila = { producto_codigo: producto, insumo, cantidad: 1, unidad, costo_unitario: 0 };
        const [g] = await abcInsertar('abc_materiales', [fila]);
        abc.materiales.push(g && g.id ? g : { id: Date.now(), ...fila });
    });
}

function abcEliminarMaterial(id) {
    if (!confirm('¿Eliminar este insumo?')) return;
    abcTrasCambio(async () => {
        await abcBorrar('abc_materiales', 'id', id);
        abc.materiales = abc.materiales.filter(m => m.id !== id);
    });
}

function abcEliminarRecurso(codigo) {
    if (!confirm('¿Eliminar el recurso ' + codigo + ' y su distribución?')) return;
    abcTrasCambio(async () => {
        await abcBorrar('abc_recursos_mes', 'recurso_codigo', codigo);
        await abcBorrar('abc_recursos', 'codigo', codigo);
        abc.recursos = abc.recursos.filter(r => r.codigo !== codigo);
        abc.inductor1 = abc.inductor1.filter(f => f.recurso_codigo !== codigo);
        abc.recursosMes = abc.recursosMes.filter(f => f.recurso_codigo !== codigo);
    });
}

function abcEliminarActividad(codigo) {
    if (!confirm('¿Eliminar la actividad ' + codigo + '?')) return;
    abcTrasCambio(async () => {
        await abcBorrar('abc_actividades', 'codigo', codigo);
        abc.actividades = abc.actividades.filter(a => a.codigo !== codigo);
        await abcLimpiarReferencias('actividad', codigo);
    });
}

function abcEliminarProducto(codigo) {
    if (!confirm('¿Quitar ' + codigo + ' del costeo ABC? (el producto se mantiene en la tabla productos)')) return;
    abcTrasCambio(async () => {
        await abcBorrar('abc_objetos_costo', 'producto_codigo', codigo);
        await abcBorrar('abc_consumo', 'producto_codigo', codigo);
        await abcBorrar('abc_materiales', 'producto_codigo', codigo);
        abc.objetos = abc.objetos.filter(o => o.producto_codigo !== codigo);
        abc.consumo = abc.consumo.filter(o => o.producto_codigo !== codigo);
        abc.materiales = abc.materiales.filter(o => o.producto_codigo !== codigo);
    });
}

// ---------- Modales de alta ----------
function abcSiguienteCodigo(lista, prefijo) {
    let n = 1;
    while (lista.some(x => x.codigo === prefijo + String(n).padStart(2, '0'))) n++;
    return prefijo + String(n).padStart(2, '0');
}

function abcAbrirRecurso() {
    document.getElementById('recCodigo').value = abcSiguienteCodigo(abc.recursos, 'R-NEW-');
    document.getElementById('recNombre').value = '';
    document.getElementById('recMonto').value = '';
    document.getElementById('recCentro').innerHTML = abc.centros.map(c => `<option value="${esc(c.codigo)}">${esc(c.nombre)}</option>`).join('');
    openModal('modalRecurso');
}

function abcGuardarRecurso() {
    const codigo = document.getElementById('recCodigo').value.trim();
    const nombre = document.getElementById('recNombre').value.trim();
    if (!codigo || !nombre) { showAlert('Complete código y nombre', 'error'); return; }
    if (abc.recursos.some(r => r.codigo === codigo)) { showAlert('El código ya existe', 'error'); return; }
    const rec = { codigo, nombre, categoria: document.getElementById('recCategoria').value, origen: 'manual', cargo: null,
                  monto: abcNum(document.getElementById('recMonto').value) };
    const dist = { recurso_codigo: codigo, centro_codigo: document.getElementById('recCentro').value, porcentaje: 100 };
    closeModal('modalRecurso');
    abcTrasCambio(async () => {
        const [g] = await abcInsertar('abc_recursos', [rec]);
        abc.recursos.push(g || rec);
        const [g2] = await abcInsertar('abc_inductor1', [dist]);
        abc.inductor1.push(g2 || dist);
        showAlert('✅ Recurso registrado. Ajuste su distribución en "Recursos → Centros".', 'success');
    });
}

function abcAbrirActividad(centro) {
    document.getElementById('actCentro').innerHTML = abc.centros.map(c =>
        `<option value="${esc(c.codigo)}" ${c.codigo === centro ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
    document.getElementById('actInductor').innerHTML = abc.inductores.map(i => `<option value="${esc(i.codigo)}">${esc(i.nombre)} (${esc(i.unidad || '')})</option>`).join('');
    document.getElementById('actNombre').value = '';
    document.getElementById('actPct').value = '';
    openModal('modalActividad');
}

function abcGuardarActividadNueva() {
    const nombre = document.getElementById('actNombre').value.trim();
    if (!nombre) { showAlert('Ingrese el nombre de la actividad', 'error'); return; }
    let n = abc.actividades.length + 1, codigo;
    do { codigo = 'ACT-' + String(n++).padStart(2, '0'); } while (abc.actividades.some(a => a.codigo === codigo));
    const act = { codigo, nombre, centro_codigo: document.getElementById('actCentro').value,
                  porcentaje: abcNum(document.getElementById('actPct').value), inductor_codigo: document.getElementById('actInductor').value };
    closeModal('modalActividad');
    abcTrasCambio(async () => {
        const [g] = await abcInsertar('abc_actividades', [act]);
        abc.actividades.push(g || act);
        showAlert('✅ Actividad registrada. Verifique que el centro sume 100%.', 'success');
    });
}

function abcAbrirInductor() {
    document.getElementById('indCodigo').value = abcSiguienteCodigo(abc.inductores, 'IND-N');
    document.getElementById('indNombre').value = '';
    document.getElementById('indUnidad').value = '';
    openModal('modalInductor');
}

function abcGuardarInductor() {
    const codigo = document.getElementById('indCodigo').value.trim();
    const nombre = document.getElementById('indNombre').value.trim();
    if (!codigo || !nombre) { showAlert('Complete código y nombre', 'error'); return; }
    if (abc.inductores.some(i => i.codigo === codigo)) { showAlert('El código ya existe', 'error'); return; }
    const ind = { codigo, nombre, unidad: document.getElementById('indUnidad').value.trim() };
    closeModal('modalInductor');
    abcTrasCambio(async () => {
        const [g] = await abcInsertar('abc_inductores', [ind]);
        abc.inductores.push(g || ind);
        showAlert('✅ Inductor registrado. Ingrese su consumo por producto.', 'success');
    });
}

function abcAbrirProducto() {
    const libres = abc.productos.filter(p => !abc.objetos.some(o => o.producto_codigo === p.codigo));
    document.getElementById('prodExistente').innerHTML = '<option value="">— Crear producto nuevo —</option>' +
        libres.map(p => `<option value="${esc(p.codigo)}">${esc(p.codigo)} · ${esc(p.nombre)}</option>`).join('');
    ['prodCodigo', 'prodNombre', 'prodPresentacion', 'prodPrecio', 'prodUnidades'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('prodCodigo').value = abcSiguienteCodigo(abc.productos, 'BEB-N');
    abcToggleProductoNuevo();
    openModal('modalProducto');
}

function abcToggleProductoNuevo() {
    const existente = document.getElementById('prodExistente').value;
    document.getElementById('prodNuevoCampos').style.display = existente ? 'none' : '';
}

function abcGuardarProducto() {
    const existente = document.getElementById('prodExistente').value;
    const unidades = abcNum(document.getElementById('prodUnidades').value);
    const presentacion = document.getElementById('prodPresentacion').value.trim();
    let codigo = existente, nuevo = null;
    if (!existente) {
        codigo = document.getElementById('prodCodigo').value.trim();
        const nombre = document.getElementById('prodNombre').value.trim();
        if (!codigo || !nombre) { showAlert('Complete código y nombre del producto', 'error'); return; }
        if (abc.productos.some(p => p.codigo === codigo)) { showAlert('El código ya existe en productos', 'error'); return; }
        nuevo = { codigo, nombre, categoria: 'Bebidas', precio: abcNum(document.getElementById('prodPrecio').value), stock: 0 };
    }
    closeModal('modalProducto');
    abcTrasCambio(async () => {
        if (nuevo) {
            try { abc.productos.push(await DB.insert('productos', nuevo)); }
            catch (e) { abc.productos.push(nuevo); }
        }
        const obj = { producto_codigo: codigo, presentacion, unidades };
        const [g] = await abcInsertar('abc_objetos_costo', [obj]);
        abc.objetos.push(g || obj);
        // Consumo inicial: unidades producidas y ventas valorizadas; el resto se completa en Inductor tipo 3
        const precio = (abc.productos.find(p => p.codigo === codigo) || {}).precio || 0;
        const base = [];
        if (abc.inductores.some(i => i.codigo === 'IND-UND')) base.push({ inductor_codigo: 'IND-UND', producto_codigo: codigo, cantidad: unidades });
        if (abc.inductores.some(i => i.codigo === 'IND-VTA')) base.push({ inductor_codigo: 'IND-VTA', producto_codigo: codigo, cantidad: unidades * precio });
        const g2 = await abcInsertar('abc_consumo', base);
        abc.consumo.push(...(g2 || base));
        showAlert('✅ Producto agregado al costeo. Complete su consumo de inductores y su lista de materiales.', 'success');
    });
}

async function abcRestablecer() {
    if (!confirm('¿Borrar la configuración ABC actual y volver a generar los datos de ejemplo?')) return;
    try {
        if (abc.modo === 'db') {
            for (const t of ['abc_etapa_dist', 'abc_etapas', 'abc_presupuestos', 'abc_recursos_mes'].filter(abcEnBD)) {
                const { error } = await supabaseClient.from(t).delete().neq('id', 0);
                if (error) throw error;
            }
            for (const t of ['abc_organigrama', 'abc_consumo', 'abc_materiales', 'abc_objetos_costo', 'abc_actividades',
                             'abc_inductor1', 'abc_inductores', 'abc_recursos', 'abc_centros']) {
                const { error } = await supabaseClient.from(t).delete().neq('id', 0);
                if (error) throw error;
            }
        }
        abc.etapas = []; abc.etapaDist = []; abc.presupuestos = []; abc.recursosMes = [];
        await abcCargar();
        abcRellenarPeriodos();
        abcRenderTodo();
    } catch (e) {
        console.error(e);
        showAlert('❌ Error al restablecer: ' + (e.message || e), 'error');
    }
}

// ==================== ETAPAS DEL MODELO (5 como mínimo, se pueden agregar más) ====================
function abcRenderCadenaEtapas(idEl) {
    const el = document.getElementById(idEl);
    if (!el) return;
    const c = abc.calc;
    const movido = x => x.etapa && c.etapas[x.etapa.codigo] ? c.etapas[x.etapa.codigo].movido : null;
    el.innerHTML = `<div class="abc-etapas-cadena">
        ${abcEtapasModelo().map(x => `
            <button class="abc-etapa-chip ${x.fija ? '' : 'abc-etapa-chip-extra'} ${abc.tabActual === x.id ? 'activa' : ''}" onclick="abcMostrarTab('${esc(x.id)}')">
                <b>${x.simbolo}</b><span>${esc(x.nombre)}</span>
                <small>${x.fija ? 'etapa base' : (ABC_NIVELES_ETAPA[x.etapa.nivel] + ' · ' + abcSoles(movido(x) || 0, 0) + ' trasladados')}</small>
            </button>`).join('<span class="abc-chain-arrow">➜</span>')}
        <button class="abc-etapa-chip abc-etapa-add" onclick="abcAbrirEtapa()"><b>＋</b><span>Agregar etapa</span><small>entre centros o actividades</small></button>
    </div>
    <p class="abc-muted abc-note">El modelo tiene <b>${abcEtapasModelo().length} etapas</b> (mínimo ${ABC_MIN_ETAPAS}).
        Las etapas de reparto trasladan costo entre centros (p. ej. de apoyo a operativos) o entre actividades (p. ej. mantenimiento → llenado).</p>`;
}

function abcRenderEtapa() {
    const e = abc.etapas.find(x => x.codigo === abc.etapaActiva);
    const el = document.getElementById('abcEtapa');
    if (!e || !el || !abc.calc) return;
    const c = abc.calc;
    const r = c.etapas[e.codigo] || { antes: {}, enviado: {}, recibido: {}, despues: {}, pctEnviado: {}, movido: 0 };
    const esCentro = e.nivel === 'centro';
    const nodos = esCentro ? abcCentrosOrdenados() : abc.actividades.slice();
    const mismas = abcEtapasDe(e.nivel);
    const i = mismas.indexOf(e);
    const puedeEliminar = abcEtapasModelo().length > ABC_MIN_ETAPAS;
    const corto = x => esCentro ? x.codigo.replace('CA-', '') : x.codigo.replace('ACT-', 'A');
    const tipoDe = x => esCentro ? x.tipo : ((abc.centros.find(cc => cc.codigo === x.centro_codigo) || {}).tipo || '');
    const soloConReparto = abc.etapaSoloOrigen;
    const filas = nodos.filter(x => !soloConReparto || r.pctEnviado[x.codigo] || (r.antes[x.codigo] || 0) > 0.005);

    el.innerHTML = `
    <div class="card">
        <div class="abc-etapa-head">
            <div>
                <h2>${abcNumEtapa('etapa:' + e.codigo)} ${esc(e.nombre)} <small class="abc-muted">· ${ABC_NIVELES_ETAPA[e.nivel]} · ${esc(e.codigo)}</small></h2>
                <p class="abc-muted">${esc(e.descripcion || '')}</p>
                <p class="abc-muted">Indique qué % de su costo envía cada <b>origen</b> (fila) a cada <b>destino</b> (columna). Lo que no se envía lo retiene el origen.
                    Se aplica ${esCentro ? `después de la etapa ${abcNumEtapa('ind1')} (Recursos → Centros) y antes de asignar los centros a sus actividades`
                                         : `después de la etapa ${abcNumEtapa('ind2')} (Centros → Actividades) y antes de asignar las actividades a los productos`}.</p>
            </div>
            <div class="abc-etapa-kpi"><small>Trasladado en ${abcNombreMes(abc.periodo)}</small><b>${abcSoles(r.movido)}</b></div>
        </div>
        <div class="btn-group abc-actions">
            <button class="btn" onclick="abcAbrirEtapa('${esc(e.codigo)}')">✏️ Editar etapa</button>
            <button class="btn" ${i <= 0 ? 'disabled' : ''} onclick="abcMoverEtapa('${esc(e.codigo)}',-1)">⬆ Antes</button>
            <button class="btn" ${i >= mismas.length - 1 ? 'disabled' : ''} onclick="abcMoverEtapa('${esc(e.codigo)}',1)">⬇ Después</button>
            <button class="btn btn-primary" onclick="abcAbrirEtapa()">＋ Nueva etapa</button>
            <button class="btn btn-danger" ${puedeEliminar ? '' : `disabled title="El modelo debe tener al menos ${ABC_MIN_ETAPAS} etapas"`} onclick="abcEliminarEtapa('${esc(e.codigo)}')">🗑️ Eliminar etapa</button>
            <button class="btn" onclick="abcExportarExcel('abcEtapaMatriz','etapa-${esc(e.codigo)}')">📥 Exportar Excel</button>
            <label class="abc-check"><input type="checkbox" ${soloConReparto ? 'checked' : ''} onchange="abc.etapaSoloOrigen=this.checked; abcRenderEtapa()"> Solo orígenes con costo o reparto</label>
        </div>
        <div class="table-container abc-scroll">
            <table id="abcEtapaMatriz" class="abc-matrix">
                <thead><tr><th class="abc-sticky">Origen</th><th class="num">Costo al inicio</th>
                    ${nodos.map(x => `<th class="num abc-th-${tipoDe(x)}" title="${esc(x.nombre)}">${esc(corto(x))}</th>`).join('')}
                    <th class="num">Σ % enviado</th><th class="num">Retiene</th></tr></thead>
                <tbody>
                ${filas.map(o => {
                    const suma = r.pctEnviado[o.codigo] || 0;
                    return `<tr>
                        <td class="abc-sticky"><strong>${esc(o.nombre)}</strong><br><small class="abc-muted">${esc(o.codigo)}</small></td>
                        <td class="num">${abcSoles(r.antes[o.codigo] || 0, 0)}</td>
                        ${nodos.map(d => {
                            if (d.codigo === o.codigo) return '<td class="num abc-celda-off">—</td>';
                            const p = abcPctEtapa(e.codigo, o.codigo, d.codigo);
                            return `<td class="num"><input type="number" step="0.1" min="0" max="100" class="abc-input abc-pct ${p ? 'abc-has' : ''}"
                                value="${p || ''}" placeholder="0" title="${esc(o.nombre)} → ${esc(d.nombre)}"
                                onchange="abcCambiarEtapaDist('${esc(e.codigo)}','${esc(o.codigo)}','${esc(d.codigo)}', this.value)"></td>`;
                        }).join('')}
                        <td class="num ${suma > 100.01 ? 'abc-neg' : suma ? 'abc-pos' : ''}"><strong>${abcPct(suma)}</strong></td>
                        <td class="num">${abcPct(Math.max(0, 100 - suma))}</td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
        </div>
    </div>
    <div class="card">
        <h2>📦 Resultado de la etapa · ${abcNombreMes(abc.periodo)}</h2>
        <div class="table-container">
            <table id="abcEtapaResultado">
                <thead><tr><th>Código</th><th>${esCentro ? 'Centro' : 'Actividad'}</th><th class="num">Costo al inicio</th><th class="num">Enviado</th>
                    <th class="num">Recibido</th><th class="num">Costo al final</th><th class="num">Variación</th></tr></thead>
                <tbody>
                ${nodos.filter(x => (r.antes[x.codigo] || 0) > 0.005 || (r.despues[x.codigo] || 0) > 0.005).map(x => {
                    const a = r.antes[x.codigo] || 0, d = r.despues[x.codigo] || 0;
                    return `<tr><td>${esc(x.codigo)}</td><td>${esc(x.nombre)}</td><td class="num">${abcSoles(a)}</td>
                        <td class="num">${r.enviado[x.codigo] ? '−' + abcFmt(r.enviado[x.codigo]) : '–'}</td>
                        <td class="num">${r.recibido[x.codigo] ? '+' + abcFmt(r.recibido[x.codigo]) : '–'}</td>
                        <td class="num"><strong>${abcSoles(d)}</strong></td>
                        <td class="num ${d - a > 0.005 ? 'abc-neg' : d - a < -0.005 ? 'abc-pos' : ''}">${Math.abs(d - a) > 0.005 ? (d > a ? '+' : '') + abcFmt(d - a) : '–'}</td></tr>`;
                }).join('')}
                <tr class="abc-total"><td colspan="3">TOTAL TRASLADADO</td><td class="num">${abcFmt(r.movido)}</td><td class="num">${abcFmt(r.movido)}</td><td colspan="2"></td></tr>
                </tbody>
            </table>
        </div>
    </div>`;
}

function abcAbrirEtapa(codigo) {
    const e = codigo ? abc.etapas.find(x => x.codigo === codigo) : null;
    abc._etapaEditando = e ? e.codigo : null;
    document.getElementById('etaTituloModal').textContent = e ? '🔗 Editar etapa de reparto' : '🔗 Nueva etapa de reparto';
    document.getElementById('etaNombre').value = e ? e.nombre : '';
    document.getElementById('etaNivel').value = e ? e.nivel : 'centro';
    document.getElementById('etaNivel').disabled = !!e;
    document.getElementById('etaDescripcion').value = e ? (e.descripcion || '') : '';
    openModal('modalEtapa');
}

function abcGuardarEtapa() {
    const nombre = document.getElementById('etaNombre').value.trim();
    if (!nombre) { showAlert('Ingrese el nombre de la etapa', 'error'); return; }
    const nivel = document.getElementById('etaNivel').value;
    const descripcion = document.getElementById('etaDescripcion').value.trim();
    const editando = abc._etapaEditando;
    closeModal('modalEtapa');
    abcTrasCambio(async () => {
        let e = abc.etapas.find(x => x.codigo === editando);
        if (e) Object.assign(e, { nombre, descripcion });
        else {
            e = { id: abcIdLocal++, codigo: abcSiguienteCodigo(abc.etapas, 'ET-'), nombre, nivel, descripcion,
                  orden: Math.max(0, ...abcEtapasDe(nivel).map(x => x.orden || 0)) + 1 };
            abc.etapas.push(e);
        }
        const g = await abcGuardar('abc_etapas', { codigo: e.codigo, nombre: e.nombre, nivel: e.nivel, orden: e.orden, descripcion: e.descripcion || null }, 'codigo');
        if (g && g.id) e.id = g.id;
        if (!editando) {
            showAlert(`✅ Etapa creada: ahora el modelo tiene ${abcEtapasModelo().length} etapas. Indique los % de reparto.`, 'success');
            setTimeout(() => abcMostrarTab('etapa:' + e.codigo), 0);
        }
    });
}

function abcMoverEtapa(codigo, paso) {
    const e = abc.etapas.find(x => x.codigo === codigo);
    const lista = abcEtapasDe(e.nivel);
    const i = lista.indexOf(e), j = i + paso;
    if (j < 0 || j >= lista.length) return;
    lista.splice(i, 1);
    lista.splice(j, 0, e);
    abcTrasCambio(async () => {
        lista.forEach((x, k) => { x.orden = k + 1; });
        await abcGuardarVarios('abc_etapas', lista.map(x => ({ codigo: x.codigo, nombre: x.nombre, nivel: x.nivel, orden: x.orden, descripcion: x.descripcion || null })), 'codigo');
    });
}

function abcEliminarEtapa(codigo) {
    if (abcEtapasModelo().length <= ABC_MIN_ETAPAS) { showAlert(`⚠️ El modelo debe tener al menos ${ABC_MIN_ETAPAS} etapas`, 'error'); return; }
    const e = abc.etapas.find(x => x.codigo === codigo);
    if (!e || !confirm(`¿Eliminar la etapa "${e.nombre}" y su distribución?`)) return;
    abcTrasCambio(async () => {
        await abcBorrar('abc_etapa_dist', 'etapa_codigo', codigo);
        await abcBorrar('abc_etapas', 'codigo', codigo);
        abc.etapas = abc.etapas.filter(x => x.codigo !== codigo);
        abc.etapaDist = abc.etapaDist.filter(x => x.etapa_codigo !== codigo);
        abc.tabActual = 'resumen';
        setTimeout(() => abcMostrarTab('resumen'), 0);
    });
}

function abcCambiarEtapaDist(etapa, origen, destino, valor) {
    abcTrasCambio(async () => {
        const pct = Math.max(0, abcNum(valor));
        let f = abc.etapaDist.find(x => x.etapa_codigo === etapa && x.origen === origen && x.destino === destino);
        if (!f) { f = { id: abcIdLocal++, etapa_codigo: etapa, origen, destino, porcentaje: pct }; abc.etapaDist.push(f); }
        f.porcentaje = pct;
        await abcGuardar('abc_etapa_dist', { etapa_codigo: etapa, origen, destino, porcentaje: pct }, 'etapa_codigo,origen,destino');
    });
}

// Limpia repartos y presupuestos de un centro o actividad eliminado
async function abcLimpiarReferencias(tipo, codigo) {
    const etapas = abc.etapas.filter(e => e.nivel === tipo).map(e => e.codigo);
    for (const campo of ['origen', 'destino']) {
        for (const et of etapas) {
            if (abc.etapaDist.some(d => d.etapa_codigo === et && d[campo] === codigo)) await abcBorrarDonde('abc_etapa_dist', { etapa_codigo: et, [campo]: codigo });
        }
    }
    abc.etapaDist = abc.etapaDist.filter(d => !(etapas.includes(d.etapa_codigo) && (d.origen === codigo || d.destino === codigo)));
    if (abcPresupuesto(tipo, codigo)) await abcBorrarDonde('abc_presupuestos', { tipo, codigo });
    abc.presupuestos = abc.presupuestos.filter(p => !(p.tipo === tipo && p.codigo === codigo));
}

// ==================== ALERTAS Y PRESUPUESTO ====================
function abcBarraConsumo(x) {
    if (x.estado === 'sin') return '<span class="abc-muted">—</span>';
    const w = Math.min(100, x.pct);
    return `<div class="abc-consumo" title="${abcPct(x.pct)} del presupuesto · umbral ${abcPct(x.umbral)}">
        <div class="abc-consumo-bar abc-consumo-${x.estado}" style="width:${w.toFixed(1)}%"></div>
        <i class="abc-consumo-umbral" style="left:${Math.min(100, x.umbral).toFixed(1)}%"></i>
        <span>${abcPct(x.pct)}</span></div>`;
}

const abcChipEstado = x => `<span class="abc-estado abc-estado-${x.estado}">${ABC_ESTADOS[x.estado].icono} ${ABC_ESTADOS[x.estado].nombre}</span>`;
const abcVariacion = x => x.variacion === null ? '<span class="abc-muted">—</span>'
    : `<span class="${x.variacion > 0.05 ? 'abc-neg' : x.variacion < -0.05 ? 'abc-pos' : ''}">${x.variacion > 0 ? '▲ +' : x.variacion < 0 ? '▼ ' : ''}${abcPct(x.variacion)}</span>`;

function abcRenderAlertasResumen() {
    const el = document.getElementById('abcAlertasResumen');
    if (!el) return;
    const activas = abc.alertas.filter(x => x.estado === 'excedido' || x.estado === 'cerca');
    if (!activas.length) {
        el.innerHTML = abc.presupuestos.length ? `<div class="abc-banner abc-banner-ok"><strong>🟢 Sin alertas de presupuesto en ${abcNombreMes(abc.periodo)}.</strong>
            Todos los centros y actividades con presupuesto están por debajo de su umbral.</div>` : '';
        return;
    }
    const exc = activas.filter(x => x.estado === 'excedido').length;
    el.innerHTML = `<div class="abc-banner ${exc ? 'abc-banner-alerta' : 'abc-banner-warn'}">
        <strong>🚨 Alertas de presupuesto · ${abcNombreMes(abc.periodo)}: ${exc} excedidos, ${activas.length - exc} cerca del límite</strong>
        <ul class="abc-alerta-lista">${activas.slice(0, 6).map(x => `<li>
            ${ABC_ESTADOS[x.estado].icono} <b>${esc(x.nombre)}</b> <small>(${x.tipo === 'centro' ? 'centro' : 'actividad'})</small>:
            ${abcSoles(x.costo, 0)} de ${abcSoles(x.monto, 0)} (<b>${abcPct(x.pct)}</b>)
            <button class="btn btn-sm" onclick="abcAbrirGrafica('${x.tipo}','${esc(x.codigo)}')">📈 Ver gráfica</button></li>`).join('')}</ul>
        ${activas.length > 6 ? `<p>… y ${activas.length - 6} más.</p>` : ''}
        <button class="btn btn-sm" onclick="abcMostrarTab('alertas')">Ver todas las alertas →</button>
    </div>`;
}

function abcRenderAlertas() {
    const el = document.getElementById('abcAlertasTabla');
    if (!el) return;
    const f = abc.filtroAlertas;
    const lista = abc.alertas.filter(x => (f.tipo === 'todos' || x.tipo === f.tipo) &&
        (f.estado === 'todos' || (f.estado === 'alertas' ? (x.estado === 'excedido' || x.estado === 'cerca') : x.estado === f.estado)));
    const cuenta = e => abc.alertas.filter(x => x.estado === e).length;

    document.getElementById('abcAlertasMetricas').innerHTML = ['excedido', 'cerca', 'ok', 'sin'].map(e => `
        <button class="abc-alerta-kpi abc-alerta-kpi-${e} ${f.estado === e ? 'activa' : ''}" onclick="abcFiltrarAlertas('estado','${f.estado === e ? 'todos' : e}')">
            <span>${ABC_ESTADOS[e].icono}</span><b>${cuenta(e)}</b><small>${ABC_ESTADOS[e].nombre}</small></button>`).join('');

    document.getElementById('abcAlertasFiltros').innerHTML = `
        <label>Mostrar <select class="abc-input-sel" onchange="abcFiltrarAlertas('tipo', this.value)">
            ${[['todos', 'Centros y actividades'], ['centro', 'Solo centros'], ['actividad', 'Solo actividades']].map(([v, t]) => `<option value="${v}" ${f.tipo === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select></label>
        <label>Estado <select class="abc-input-sel" onchange="abcFiltrarAlertas('estado', this.value)">
            ${[['alertas', '🚨 Solo alertas'], ['todos', 'Todos'], ['excedido', '🔴 Excedidos'], ['cerca', '🟠 Cerca del límite'], ['ok', '🟢 Dentro'], ['sin', '⚪ Sin presupuesto']]
                .map(([v, t]) => `<option value="${v}" ${f.estado === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select></label>
        <label>Umbral para nuevos / aplicar a todos <input type="number" min="1" max="100" step="1" class="abc-input abc-input-s" value="${abc.umbralNuevo}"
            onchange="abc.umbralNuevo = Math.min(100, Math.max(1, abcNum(this.value)) || ${ABC_UMBRAL_DEFECTO})"> %</label>
        <button class="btn btn-sm" onclick="abcAplicarUmbralTodos()">Aplicar umbral a todos</button>`;

    el.innerHTML = lista.length ? lista.map(x => `<tr class="abc-fila-${x.estado}">
        <td>${abcChipEstado(x)}</td>
        <td><span class="abc-tag abc-tag-${x.centroTipo || ''}">${x.tipo === 'centro' ? 'Centro' : 'Actividad'}</span></td>
        <td><strong>${esc(x.nombre)}</strong><br><small class="abc-muted">${esc(x.codigo)}${x.centroNombre ? ' · ' + esc(x.centroNombre) : ''}</small></td>
        <td class="num"><strong>${abcSoles(x.costo)}</strong></td>
        <td class="num"><input type="number" min="0" step="10" class="abc-input abc-input-w" value="${x.monto || ''}" placeholder="Sin presupuesto"
            onchange="abcCambiarPresupuesto('${x.tipo}','${esc(x.codigo)}','monto', this.value)"></td>
        <td class="num"><input type="number" min="1" max="100" step="1" class="abc-input abc-input-s" value="${x.umbral}"
            onchange="abcCambiarPresupuesto('${x.tipo}','${esc(x.codigo)}','umbral', this.value)"></td>
        <td class="abc-bar-cell">${abcBarraConsumo(x)}</td>
        <td class="num">${x.estado === 'sin' ? '–' : abcSoles(x.monto - x.costo)}</td>
        <td class="num">${abcVariacion(x)}</td>
        <td><button class="btn btn-sm" onclick="abcAbrirGrafica('${x.tipo}','${esc(x.codigo)}')">📈 Gráfica</button></td>
    </tr>`).join('') : `<tr><td colspan="10" class="abc-muted abc-vacio">No hay elementos con este filtro${f.estado === 'alertas' ? ': ningún centro o actividad está cerca o por encima de su presupuesto 🎉' : ''}.</td></tr>`;

    const conMes = abc.recursosMes.length;
    document.getElementById('abcAlertasNota').innerHTML = conMes ? '' : `<div class="abc-banner abc-banner-info">
        <strong>ℹ️ Los gastos (CIF, administración y ventas) tienen el mismo monto todos los meses.</strong>
        Solo la planilla cambia de un mes a otro, por eso las gráficas pueden verse planas. Registre el monto real de cada mes en
        <a href="#recursos" onclick="abcMostrarTab('recursos'); return false;">Recursos</a> (modo "solo este mes") o
        <button class="btn btn-sm" onclick="abcGenerarVariacionEjemplo()">🎲 genere montos mensuales de ejemplo</button>.</div>`;
}

function abcFiltrarAlertas(campo, valor) {
    abc.filtroAlertas[campo] = valor;
    abcRenderAlertas();
}

function abcCambiarPresupuesto(tipo, codigo, campo, valor) {
    abcTrasCambio(async () => {
        let p = abcPresupuesto(tipo, codigo);
        if (!p) { p = { id: abcIdLocal++, tipo, codigo, monto: 0, umbral: abc.umbralNuevo }; abc.presupuestos.push(p); }
        p[campo] = campo === 'umbral' ? Math.min(100, Math.max(1, abcNum(valor) || ABC_UMBRAL_DEFECTO)) : Math.max(0, abcNum(valor));
        await abcGuardar('abc_presupuestos', { tipo, codigo, monto: p.monto, umbral: p.umbral }, 'tipo,codigo');
    });
}

function abcAplicarUmbralTodos() {
    if (!abc.presupuestos.length || !confirm(`¿Usar ${abc.umbralNuevo}% como umbral de alerta en todos los presupuestos?`)) return;
    abcTrasCambio(async () => {
        abc.presupuestos.forEach(p => { p.umbral = abc.umbralNuevo; });
        await abcGuardarVarios('abc_presupuestos', abc.presupuestos.map(p => ({ tipo: p.tipo, codigo: p.codigo, monto: p.monto, umbral: p.umbral })), 'tipo,codigo');
        showAlert('✅ Umbral actualizado', 'success');
    });
}

function abcSugerirPresupuestos(soloFaltantes) {
    if (!soloFaltantes && !confirm('¿Reemplazar TODOS los presupuestos por el promedio mensual + 15%?')) return;
    abcTrasCambio(async () => {
        const filas = abcPresupuestosSugeridos(soloFaltantes);
        if (!filas.length) { showAlert('No hay elementos sin presupuesto con costo registrado', 'info'); return; }
        const g = await abcGuardarVarios('abc_presupuestos', filas, 'tipo,codigo');
        filas.forEach((f, k) => {
            const p = abcPresupuesto(f.tipo, f.codigo);
            if (p) Object.assign(p, f); else abc.presupuestos.push((g && g[k]) || { id: abcIdLocal++, ...f });
        });
        showAlert(`✅ Se asignó presupuesto sugerido a ${filas.length} elementos`, 'success');
    });
}

// ==================== GRÁFICA MES A MES ====================
// Regresión lineal simple: pendiente por mes y proyección del mes siguiente
function abcTendencia(valores) {
    const n = valores.length;
    if (n < 2) return { pendiente: 0, proyeccion: valores[0] || 0, pctMes: 0 };
    const mx = (n - 1) / 2, my = valores.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    valores.forEach((v, i) => { num += (i - mx) * (v - my); den += (i - mx) * (i - mx); });
    const pendiente = den ? num / den : 0;
    return { pendiente, proyeccion: Math.max(0, my + pendiente * (n - mx)), pctMes: my ? pendiente / my * 100 : 0 };
}

function abcSiguientePeriodo(p) {
    const [a, m] = p.split('-').map(Number);
    return m === 12 ? (a + 1) + '-01' : a + '-' + String(m + 1).padStart(2, '0');
}

function abcAbrirGrafica(tipo, codigo) {
    const x = tipo === 'centro' ? abc.centros.find(c => c.codigo === codigo) : abc.actividades.find(a => a.codigo === codigo);
    if (!x) return;
    abc._grafica = { tipo, codigo };
    const serie = abcSerie(tipo, codigo);
    const pres = abcPresupuesto(tipo, codigo);
    const monto = pres ? Number(pres.monto) || 0 : 0;
    const umbral = pres ? Number(pres.umbral) || ABC_UMBRAL_DEFECTO : ABC_UMBRAL_DEFECTO;
    const valores = serie.map(s => s.costo);
    const t = abcTendencia(valores);
    const prom = valores.reduce((s, v) => s + v, 0) / (valores.length || 1);
    const max = Math.max(...valores), min = Math.min(...valores);
    const estados = serie.map(s => abcEstado(s.costo, pres));
    const excedidos = estados.filter(e => e.estado === 'excedido').length, cerca = estados.filter(e => e.estado === 'cerca').length;
    // Racha de meses seguidos al alza al final de la serie
    let racha = 0;
    for (let i = valores.length - 1; i > 0 && valores[i] > valores[i - 1] + 0.005; i--) racha++;
    const patron = Math.abs(t.pctMes) < 1 ? 'estable' : t.pctMes > 0 ? 'creciente' : 'decreciente';
    const sigP = serie.length ? abcSiguientePeriodo(serie[serie.length - 1].periodo) : '';
    const proyEstado = abcEstado(t.proyeccion, pres);

    document.getElementById('grafTitulo').textContent = '📈 ' + x.nombre;
    document.getElementById('grafSub').textContent = (tipo === 'centro' ? 'Centro de actividad' : 'Actividad') + ' · ' + codigo +
        (monto ? ` · presupuesto mensual ${abcSoles(monto, 0)} · alerta al ${abcPct(umbral)}` : ' · sin presupuesto asignado');

    const interpretacion = [];
    interpretacion.push(`Patrón <b>${patron}</b>: ${Math.abs(t.pctMes) < 1 ? 'el costo se mantiene sin cambios importantes' :
        `el costo ${t.pctMes > 0 ? 'sube' : 'baja'} en promedio <b>${abcSoles(Math.abs(t.pendiente), 0)}</b> por mes (${abcPct(Math.abs(t.pctMes))})`}.`);
    if (racha >= 2) interpretacion.push(`<span class="abc-neg">Lleva ${racha} meses seguidos al alza.</span>`);
    if (monto) {
        interpretacion.push(`${excedidos} de ${serie.length} meses superaron el presupuesto y ${cerca} estuvieron cerca del límite.`);
        interpretacion.push(`Proyección para ${abcNombreMes(sigP)}: <b>${abcSoles(t.proyeccion, 0)}</b> (${abcPct(proyEstado.pct)} del presupuesto) → ${abcChipEstado(proyEstado)}`);
    } else {
        interpretacion.push(`Proyección para ${abcNombreMes(sigP)}: <b>${abcSoles(t.proyeccion, 0)}</b>. Asigne un presupuesto para activar las alertas.`);
    }
    if (max - min > 0 && prom > 0 && (max - min) / prom > 0.25) interpretacion.push('Variación alta entre meses (más de 25% del promedio): revise los gastos de los meses pico.');

    document.getElementById('grafKpis').innerHTML = `
        <div><small>${abcNombreMes(abc.periodo)}</small><b>${abcSoles(abcSerie(tipo, codigo).find(s => s.periodo === abc.periodo)?.costo || 0, 0)}</b></div>
        <div><small>Promedio mensual</small><b>${abcSoles(prom, 0)}</b></div>
        <div><small>Máximo / mínimo</small><b>${abcSoles(max, 0)} / ${abcSoles(min, 0)}</b></div>
        <div><small>Tendencia</small><b class="${t.pctMes > 1 ? 'abc-neg' : t.pctMes < -1 ? 'abc-pos' : ''}">${t.pctMes > 1 ? '▲' : t.pctMes < -1 ? '▼' : '▬'} ${abcPct(t.pctMes)} / mes</b></div>`;
    document.getElementById('grafInterpretacion').innerHTML = `<ul>${interpretacion.map(i => `<li>${i}</li>`).join('')}</ul>`;
    document.getElementById('grafTabla').innerHTML = `
        <thead><tr><th>Mes</th><th class="num">Costo S/</th><th class="num">Presupuesto</th><th class="num">% consumido</th><th class="num">Var. vs mes anterior</th><th>Estado</th></tr></thead>
        <tbody>${serie.map((s, i) => {
            const e = estados[i], ant = i > 0 ? valores[i - 1] : null;
            const v = ant > 0 ? (s.costo - ant) / ant * 100 : null;
            return `<tr class="${s.periodo === abc.periodo ? 'abc-fila-actual' : ''}"><td>${abcNombreMes(s.periodo)}</td><td class="num">${abcFmt(s.costo)}</td>
                <td class="num">${monto ? abcFmt(monto) : '–'}</td><td class="num">${monto ? abcPct(e.pct) : '–'}</td>
                <td class="num">${abcVariacion({ variacion: v })}</td><td>${abcChipEstado(e)}</td></tr>`;
        }).join('')}</tbody>`;

    openModal('modalGrafica');
    abcDibujarGrafica(serie, estados, monto, umbral, t, sigP);
}

function abcDibujarGrafica(serie, estados, monto, umbral, t, sigP) {
    const canvas = document.getElementById('grafCanvas');
    if (abc._chart) { abc._chart.destroy(); abc._chart = null; }
    if (typeof Chart === 'undefined') {
        canvas.replaceWith(Object.assign(document.createElement('p'), { id: 'grafCanvas', className: 'abc-muted', textContent: 'No se pudo cargar la librería de gráficos (revise su conexión a internet).' }));
        return;
    }
    const colores = { excedido: '#c81e1e', cerca: '#F58220', ok: '#087565', sin: '#1765bc' };
    const etiquetas = [...serie.map(s => abcNombreMes(s.periodo)), abcNombreMes(sigP) + ' (proy.)'];
    const datos = [...serie.map(s => s.costo), null];
    const n = serie.length;
    const tendencia = etiquetas.map((_, i) => {
        const mx = (n - 1) / 2, my = serie.reduce((s, x) => s + x.costo, 0) / (n || 1);
        return Math.max(0, my + t.pendiente * (i - mx));
    });
    const ds = [{
        type: 'bar', label: 'Costo real', data: datos, order: 3, borderRadius: 4,
        backgroundColor: estados.map((e, i) => serie[i].periodo === abc.periodo ? colores[e.estado] : colores[e.estado] + 'B3').concat(['transparent'])
    }, {
        type: 'line', label: 'Tendencia y proyección', data: tendencia, order: 1, borderColor: '#7c3aed', borderDash: [6, 4],
        pointRadius: etiquetas.map((_, i) => i === n ? 5 : 0), pointBackgroundColor: '#7c3aed', fill: false, tension: 0
    }];
    if (monto) {
        ds.push({ type: 'line', label: 'Presupuesto', data: etiquetas.map(() => monto), order: 0, borderColor: '#c81e1e', borderWidth: 2, pointRadius: 0, fill: false });
        ds.push({ type: 'line', label: `Umbral de alerta (${abcPct(umbral)})`, data: etiquetas.map(() => monto * umbral / 100), order: 0,
                  borderColor: '#F58220', borderWidth: 1.5, borderDash: [3, 3], pointRadius: 0, fill: false });
    }
    abc._chart = new Chart(canvas.getContext('2d'), {
        data: { labels: etiquetas, datasets: ds },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: window.innerWidth < 640 ? 10 : 12 } } },
                tooltip: { callbacks: { label: ctx => ctx.raw === null ? null : `${ctx.dataset.label}: ${abcSoles(ctx.raw)}` } }
            },
            scales: {
                x: { ticks: { maxRotation: 50, font: { size: window.innerWidth < 640 ? 9 : 12 } } },
                y: { beginAtZero: true, ticks: { callback: v => 'S/ ' + abcFmt(v, 0) } }
            }
        }
    });
}

function abcExportarGrafica() {
    const g = abc._grafica;
    if (!g) return;
    const x = g.tipo === 'centro' ? abc.centros.find(c => c.codigo === g.codigo) : abc.actividades.find(a => a.codigo === g.codigo);
    const pres = abcPresupuesto(g.tipo, g.codigo);
    const filas = [['Mes', 'Período', 'Costo S/', 'Presupuesto S/', '% consumido', 'Estado']];
    abcSerie(g.tipo, g.codigo).forEach(s => {
        const e = abcEstado(s.costo, pres);
        filas.push([abcNombreMes(s.periodo), s.periodo, abcRedondear(s.costo), e.monto || '', e.monto ? abcRedondear(e.pct) : '', ABC_ESTADOS[e.estado].nombre]);
    });
    abcDescargarLibro([[ 'Historial', filas ]], 'historial-' + g.codigo + '-' + abcNorm(x ? x.nombre : '').replace(/[^a-z0-9]+/g, '-'));
}

// ==================== MONTOS MENSUALES DE GASTOS ====================
function abcCambiarMontoRecurso(codigo, valor) {
    const r = abc.recursos.find(x => x.codigo === codigo);
    if (!r) return;
    if (abc.modoMonto === 'base') { abcCambiarMonto(codigo, valor); return; }
    abcTrasCambio(async () => {
        const monto = Math.max(0, abcNum(valor));
        let m = abc.recursosMes.find(x => x.recurso_codigo === codigo && x.periodo === abc.periodo);
        if (!m) { m = { id: abcIdLocal++, recurso_codigo: codigo, periodo: abc.periodo, monto }; abc.recursosMes.push(m); }
        m.monto = monto;
        await abcGuardar('abc_recursos_mes', { recurso_codigo: codigo, periodo: abc.periodo, monto }, 'recurso_codigo,periodo');
    });
}

function abcQuitarMontoMes(codigo) {
    abcTrasCambio(async () => {
        await abcBorrarDonde('abc_recursos_mes', { recurso_codigo: codigo, periodo: abc.periodo });
        abc.recursosMes = abc.recursosMes.filter(x => !(x.recurso_codigo === codigo && x.periodo === abc.periodo));
    });
}

// Montos de ejemplo: monto base con tendencia de +1.5% mensual y variación de ±8% (determinística)
function abcGenerarVariacionEjemplo() {
    const manuales = abc.recursos.filter(r => r.origen !== 'planilla' && Number(r.monto) > 0);
    if (!manuales.length) { showAlert('No hay gastos manuales con monto base', 'error'); return; }
    if (!confirm(`¿Generar montos mensuales de ejemplo para ${manuales.length} gastos en ${abc.periodos.length} meses?\nSe reemplazan los montos mensuales ya registrados de esos meses.`)) return;
    const ruido = (txt) => { let h = 0; for (const ch of txt) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ((h % 1000) / 1000 - 0.5) * 0.16; };
    const filas = [];
    manuales.forEach(r => abc.periodos.forEach((p, i) => {
        const factor = 1 + 0.015 * (i - (abc.periodos.length - 1)) + ruido(r.codigo + p);
        filas.push({ recurso_codigo: r.codigo, periodo: p, monto: Math.round(Number(r.monto) * factor * 100) / 100 });
    }));
    abcTrasCambio(async () => {
        const g = await abcGuardarVarios('abc_recursos_mes', filas, 'recurso_codigo,periodo');
        abc.recursosMes = abc.recursosMes.filter(m => !filas.some(f => f.recurso_codigo === m.recurso_codigo && f.periodo === m.periodo))
            .concat(abcConId(g || filas));
        showAlert(`✅ Se generaron ${filas.length} montos mensuales de ejemplo`, 'success');
    });
}

// ==================== EXPORTAR A EXCEL ====================
const abcRedondear = n => Math.round((Number(n) || 0) * 10000) / 10000;

// Texto de una celda tal como se ve (valor de inputs/selects, sin botones)
function abcTextoCelda(cel) {
    const input = cel.querySelector('input:not([type=checkbox]),select');
    if (input) return input.tagName === 'SELECT' ? (input.selectedOptions[0] || {}).textContent || '' : input.value;
    const copia = cel.cloneNode(true);
    copia.querySelectorAll('button,.abc-consumo-umbral').forEach(b => b.remove());
    copia.querySelectorAll('br').forEach(b => b.replaceWith(' · '));
    copia.querySelectorAll('small').forEach(b => b.prepend(' '));
    return copia.textContent.replace(/\s+/g, ' ').replace(/^ · | · $/g, '').trim();
}

// Convierte "S/ 1,234.50", "12.5%", "−1,000.00" en número; otros textos se dejan igual
function abcValorExcel(txt) {
    const t = txt.replace(/^S\/\s*/, '').replace(/^[▲▼]\s*/, '').replace('−', '-').replace(/\s*%$/, '').trim();
    if (/^[+-]?\d{1,3}(,\d{3})*(\.\d+)?$|^[+-]?\d+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''));
    return txt;
}

function abcFilasTabla(idTabla) {
    const el = document.getElementById(idTabla);
    if (!el) return [];
    const tabla = el.tagName === 'TABLE' ? el : el.closest('table') || el;
    return [...tabla.querySelectorAll('tr')].map(r => {
        const fila = [];
        [...r.cells].forEach(cel => {
            fila.push(cel.tagName === 'TH' ? abcTextoCelda(cel) : abcValorExcel(abcTextoCelda(cel)));
            for (let k = 1; k < (cel.colSpan || 1); k++) fila.push('');
        });
        return fila;
    }).filter(f => f.some(v => v !== ''));
}

function abcDescargarLibro(hojas, nombre) {
    const archivo = nombre + '-' + (abc.periodo || '') + '.xlsx';
    if (typeof XLSX === 'undefined') {
        // Sin librería (sin conexión): se descarga la primera hoja como CSV compatible con Excel
        const txt = hojas[0][1].map(f => f.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(';')).join('\r\n');
        abcDescargarBlob(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }), archivo.replace('.xlsx', '.csv'));
        return;
    }
    const libro = XLSX.utils.book_new();
    const usados = new Set();
    hojas.forEach(([titulo, filas]) => {
        if (!filas.length) return;
        let n = String(titulo).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31).trim() || 'Hoja';
        let k = 2;
        while (usados.has(n)) n = n.slice(0, 28) + ' ' + k++;
        usados.add(n);
        const hoja = XLSX.utils.aoa_to_sheet(filas);
        const ancho = [];
        filas.forEach(f => f.forEach((v, i) => { ancho[i] = Math.min(50, Math.max(ancho[i] || 8, String(v).length + 2)); }));
        hoja['!cols'] = ancho.map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(libro, hoja, n);
    });
    XLSX.writeFile(libro, archivo);
}

function abcDescargarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function abcExportarExcel(idTabla, nombre) {
    abcDescargarLibro([[nombre, abcFilasTabla(idTabla)]], nombre);
}

// Libro completo: una hoja por tabla del sistema + historial mensual de centros y actividades
function abcExportarTodoExcel() {
    const hojas = [
        ['Resumen productos', abcFilasTabla('abcResumenProductos')],
        ['Alertas', abcFilasAlertas()],
        ['Recursos', abcFilasTabla('abcRecursosTabla')],
        ['Planilla', abcFilasTabla('abcPlanillaTabla')],
        ['Centros de costos', abcFilasTabla('abcCentrosTabla')],
        ['MOF', abcFilasTabla('abcMof')],
        ['Actividades', abcFilasTabla('abcActividadesTabla')],
        [abcNumEtapa('ind1') + ' Recursos-Centros', abcFilasTabla('abcInd1Tabla')],
        ['Costo por centro', abcFilasTabla('abcInd1Centros')],
        ...abcEtapasModelo().filter(x => x.etapa).map(x => [x.simbolo + ' ' + x.nombre, abcFilasEtapa(x.etapa)]),
        ['Tasas por actividad', abcFilasTabla('abcTasas')],
        ['Consumo inductores', abcFilasTabla('abcConsumo')],
        ['Asignación', abcFilasTabla('abcAsignacion')],
        ['Rubros', abcFilasTabla('abcRubros')],
        ['ABC vs tradicional', abcFilasTabla('abcComparativo')],
        ['Historial mensual', abcFilasHistorial()]
    ];
    abcDescargarLibro(hojas, 'costeo-abc-completo');
    showAlert('📊 Libro de Excel generado con ' + hojas.filter(h => h[1].length).length + ' hojas', 'success');
}

function abcFilasAlertas() {
    const filas = [['Estado', 'Tipo', 'Código', 'Nombre', 'Costo S/', 'Presupuesto S/', 'Umbral %', '% consumido', 'Disponible S/', 'Var. vs mes anterior %']];
    abc.alertas.forEach(x => filas.push([ABC_ESTADOS[x.estado].nombre, x.tipo, x.codigo, x.nombre, abcRedondear(x.costo), x.monto || '', x.umbral,
        x.monto ? abcRedondear(x.pct) : '', x.monto ? abcRedondear(x.monto - x.costo) : '', x.variacion === null ? '' : abcRedondear(x.variacion)]));
    return filas;
}

function abcFilasEtapa(e) {
    const r = abc.calc.etapas[e.codigo];
    const nodos = e.nivel === 'centro' ? abcCentrosOrdenados() : abc.actividades;
    const filas = [['Origen', 'Código', 'Costo al inicio', ...nodos.map(d => d.codigo), 'Σ % enviado', 'Enviado S/', 'Recibido S/', 'Costo al final']];
    nodos.forEach(o => filas.push([o.nombre, o.codigo, abcRedondear(r.antes[o.codigo]),
        ...nodos.map(d => d.codigo === o.codigo ? '' : abcPctEtapa(e.codigo, o.codigo, d.codigo) || ''),
        r.pctEnviado[o.codigo] || 0, abcRedondear(r.enviado[o.codigo] || 0), abcRedondear(r.recibido[o.codigo] || 0), abcRedondear(r.despues[o.codigo])]));
    return filas;
}

function abcFilasHistorial() {
    const filas = [['Tipo', 'Código', 'Nombre', 'Presupuesto S/', ...abc.periodos.map(abcNombreMes)]];
    const h = abcHistorial();
    const agregar = (tipo, x) => {
        const p = abcPresupuesto(tipo, x.codigo);
        filas.push([tipo, x.codigo, x.nombre, p ? Number(p.monto) || '' : '', ...abc.periodos.map(per => abcRedondear(h[per][tipo][x.codigo]))]);
    };
    abcCentrosOrdenados().forEach(x => agregar('centro', x));
    abc.actividades.forEach(x => agregar('actividad', x));
    return filas;
}

// ==================== APLICACIÓN INSTALABLE (PWA) ====================
function abcIniciarPWA() {
    const btn = document.getElementById('abcInstalar');
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service worker no registrado:', e));
    }
    if (!btn || standalone) return;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        abc._instalar = e;
        btn.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
        btn.hidden = true;
        showAlert('✅ Aplicación instalada. Ábrala desde el menú de inicio o el escritorio.', 'success');
    });
    // iPhone / iPad: no existe el evento de instalación, se muestran las instrucciones
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) btn.hidden = false;
}

async function abcInstalarApp() {
    if (abc._instalar) {
        abc._instalar.prompt();
        const r = await abc._instalar.userChoice;
        if (r.outcome === 'accepted') document.getElementById('abcInstalar').hidden = true;
        abc._instalar = null;
        return;
    }
    alert(/iphone|ipad|ipod/i.test(navigator.userAgent)
        ? 'Para instalar en iPhone/iPad: toque el botón Compartir (□↑) de Safari y elija "Agregar a pantalla de inicio".'
        : 'Para instalar: abra el menú del navegador (⋮) y elija "Instalar aplicación" o "Agregar a pantalla de inicio".\nLa página debe abrirse desde una dirección https (no como archivo local).');
}

// ==================== INICIO ====================
async function initCosteoABC() {
    abcConstruirSidebar();
    const main = document.querySelector('.main-content');
    if (main) main.id = 'workspace';

    try {
        await abcCargar();
    } catch (e) {
        console.error(e);
        showAlert('❌ Error cargando el costeo ABC: ' + (e.message || e), 'error');
        return;
    }

    const sel = document.getElementById('abcPeriodo');
    abcRellenarPeriodos();
    sel.addEventListener('change', () => { abc.periodo = sel.value; abcRenderTodo(); });

    abc.tabActual = decodeURIComponent((location.hash || '#resumen').slice(1));
    abcRenderTodo();
    abcMostrarTab((location.hash || '#resumen').slice(1));
    document.getElementById('abcCargando').style.display = 'none';
    abcIniciarPWA();
}

function abcRellenarPeriodos() {
    const sel = document.getElementById('abcPeriodo');
    if (sel) sel.innerHTML = abc.periodos.map(p => `<option value="${p}" ${p === abc.periodo ? 'selected' : ''}>${abcNombreMes(p)}</option>`).join('');
}
