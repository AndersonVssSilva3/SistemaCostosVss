// ==================== SISTEMA DE COSTEO BASADO EN ACTIVIDADES (ABC) ====================
// Recursos ─(inductor tipo 1: %)→ Centros de actividad ─(inductor tipo 2: %)→ Actividades
//          ─(inductor tipo 3: consumo)→ Objetos de costo

const ABC_TABLAS = ['abc_centros', 'abc_recursos', 'abc_inductor1', 'abc_inductores',
                    'abc_actividades', 'abc_objetos_costo', 'abc_consumo', 'abc_materiales', 'abc_organigrama'];

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

const ABC_SECCIONES = [
    ['resumen',  '◉', 'Resumen ABC'],
    ['centros',  '◈', 'Centros de Actividad'],
    ['recursos', '▦', 'Recursos'],
    ['ind1',     '①', 'Inductor tipo 1'],
    ['ind2',     '②', 'Inductor tipo 2'],
    ['ind3',     '③', 'Inductor tipo 3'],
    ['objetos',  '◎', 'Objeto de Costos']
];

const abc = {
    modo: 'db',            // 'db' = tablas abc_* en Supabase · 'local' = en memoria
    periodo: null,
    periodos: [],
    planillas: [],
    productos: [],
    centros: [], recursos: [], inductor1: [], inductores: [],
    actividades: [], objetos: [], consumo: [], materiales: [], organigrama: [],
    editMapa: false, editOrg: false,
    calc: null
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

// Guarda (upsert) una fila; en modo local solo se mantiene en memoria
async function abcGuardar(tabla, fila, conflicto) {
    if (abc.modo !== 'db') return fila;
    const { data, error } = await supabaseClient.from(tabla).upsert([fila], { onConflict: conflicto }).select();
    if (error) {
        console.error('Error guardando en ' + tabla, error);
        showAlert('❌ No se pudo guardar en ' + tabla + ': ' + error.message, 'error');
        throw error;
    }
    return data && data[0];
}

async function abcInsertar(tabla, filas) {
    if (abc.modo !== 'db' || !filas.length) return filas;
    const { data, error } = await supabaseClient.from(tabla).insert(filas).select();
    if (error) {
        showAlert('❌ No se pudo insertar en ' + tabla + ': ' + error.message, 'error');
        throw error;
    }
    return data;
}

async function abcBorrar(tabla, campo, valor) {
    if (abc.modo !== 'db') return;
    const { error } = await supabaseClient.from(tabla).delete().eq(campo, valor);
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
    abc.periodos = [...new Set(pl.map(p => p.periodo).filter(Boolean))].sort();
    if (!abc.periodo || !abc.periodos.includes(abc.periodo)) abc.periodo = abc.periodos[abc.periodos.length - 1] || null;

    await abcAsegurarProductos();

    // ¿Existen las tablas abc_*?
    const prueba = await abcLeer('abc_centros');
    if (abcTablaNoExiste(prueba.error)) {
        abc.modo = 'local';
        Object.assign(abc, abcSemillaEnMemoria());
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
}

function abcSemillaEnMemoria() {
    const s = abcConstruirSemilla(abc.planillas);
    let id = 1;
    const conId = arr => arr.map(r => ({ id: id++, ...r }));
    return {
        centros: conId(s.centros), recursos: conId(s.recursos), inductor1: conId(s.inductor1),
        inductores: conId(s.inductores), actividades: conId(s.actividades), objetos: conId(s.objetos),
        consumo: conId(s.consumo), materiales: conId(s.materiales), organigrama: conId(s.organigrama)
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
function abcMontoRecurso(r, periodo) {
    if (r.origen === 'planilla') {
        return abc.planillas
            .filter(p => p.periodo === periodo && abcNorm(p.empleado_cargo) === abcNorm(r.cargo))
            .reduce((s, p) => s + (Number(p.costo_total_empleador) || 0), 0);
    }
    return Number(r.monto) || 0;
}

function abcPctRecurso(recurso, centro) {
    const f = abc.inductor1.find(x => x.recurso_codigo === recurso && x.centro_codigo === centro);
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

function abcCalcular() {
    const periodo = abc.periodo;
    const prods = abc.objetos.map(o => abcProducto(o.producto_codigo));
    const avisos = [];

    // ---- Etapa 1: Recursos → Centros (inductor tipo 1) ----
    const recursos = abc.recursos.map(r => {
        const monto = abcMontoRecurso(r, periodo);
        const pctTotal = abc.centros.reduce((s, c) => s + abcPctRecurso(r.codigo, c.codigo), 0);
        if (monto > 0 && Math.abs(pctTotal - 100) > 0.01) avisos.push(`Recurso "${r.nombre}": la distribución suma ${abcPct(pctTotal)} (debe ser 100%).`);
        return { ...r, montoCalc: monto, pctTotal };
    });

    const centroCosto = {};
    const centroPorCategoria = {};
    abc.centros.forEach(c => { centroCosto[c.codigo] = 0; centroPorCategoria[c.codigo] = {}; });
    recursos.forEach(r => {
        abc.centros.forEach(c => {
            const v = r.montoCalc * abcPctRecurso(r.codigo, c.codigo) / 100;
            centroCosto[c.codigo] += v;
            centroPorCategoria[c.codigo][r.categoria] = (centroPorCategoria[c.codigo][r.categoria] || 0) + v;
        });
    });

    // ---- Etapa 2: Centros → Actividades (inductor tipo 2) ----
    abc.centros.forEach(c => {
        const suma = abc.actividades.filter(a => a.centro_codigo === c.codigo).reduce((s, a) => s + (Number(a.porcentaje) || 0), 0);
        if (centroCosto[c.codigo] > 0 && Math.abs(suma - 100) > 0.01) avisos.push(`Centro "${c.nombre}": sus actividades suman ${abcPct(suma)} (debe ser 100%).`);
    });

    const totalInductor = {};
    abc.inductores.forEach(i => { totalInductor[i.codigo] = prods.reduce((s, p) => s + abcConsumoDe(i.codigo, p.codigo), 0); });

    // ---- Etapa 3: Actividades → Objetos de costo (inductor tipo 3) ----
    const actividades = abc.actividades.map(a => {
        const costo = (centroCosto[a.centro_codigo] || 0) * (Number(a.porcentaje) || 0) / 100;
        const total = totalInductor[a.inductor_codigo] || 0;
        const tasa = total > 0 ? costo / total : 0;
        if (costo > 0 && !(total > 0)) avisos.push(`Actividad "${a.nombre}": su inductor no tiene consumo; S/ ${abcFmt(costo)} quedan sin asignar.`);
        const asignado = {};
        prods.forEach(p => { asignado[p.codigo] = tasa * abcConsumoDe(a.inductor_codigo, p.codigo); });
        return { ...a, costo, totalInductor: total, tasa, asignado };
    });

    const productos = prods.map(p => {
        const mpUnit = abc.materiales.filter(m => m.producto_codigo === p.codigo)
            .reduce((s, m) => s + (Number(m.cantidad) || 0) * (Number(m.costo_unitario) || 0), 0);
        const mp = mpUnit * p.unidades;
        const porCentroTipo = { estrategico: 0, operativo: 0, apoyo: 0 };
        let indirecto = 0;
        actividades.forEach(a => {
            const v = a.asignado[p.codigo] || 0;
            indirecto += v;
            const c = abc.centros.find(x => x.codigo === a.centro_codigo);
            if (c) porCentroTipo[c.tipo] += v;
        });
        const total = mp + indirecto;
        const ventas = p.unidades * p.precio;
        return {
            ...p, mpUnit, mp, indirecto, porCentroTipo, total,
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

    abc.calc = {
        recursos, centroCosto, centroPorCategoria, actividades, totalInductor, productos, avisos,
        totalRecursos: totalIndirecto, totalAsignado, porCategoria,
        totalMP: productos.reduce((s, p) => s + p.mp, 0)
    };
    return abc.calc;
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
            <nav aria-label="Navegación principal" id="abcNav">
                ${ABC_SECCIONES.map(([id, icon, label]) =>
                    `<a href="#${id}" data-tab="${id}"><span class="nav-symbol" aria-hidden="true">${icon}</span>${label}</a>`).join('')}
            </nav>
            <div class="sidebar-bottom">
                <strong>VSS S.A.C.</strong>
                RUC 20601234567<br>
                Soles peruanos · PEN
                <button onclick="abcCerrarSesion()" class="abc-logout">🚪 Cerrar Sesión</button>
            </div>
        </aside>`;
    document.body.insertAdjacentHTML('afterbegin', html);
    document.querySelectorAll('#abcNav a').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        abcMostrarTab(a.dataset.tab);
    }));
}

async function abcCerrarSesion() {
    if (!confirm('¿Cerrar sesión?')) return;
    try { await supabaseClient.auth.signOut(); } catch (e) { console.warn(e); }
    localStorage.removeItem('vss_session');
    window.location.href = '../index.html';
}

function abcMostrarTab(id) {
    if (!ABC_SECCIONES.some(s => s[0] === id)) id = 'resumen';
    document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + id));
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('#abcNav a').forEach(a => {
        if (a.dataset.tab === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const sec = ABC_SECCIONES.find(s => s[0] === id);
    document.getElementById('abcTitulo').textContent = '🎯 ' + sec[2];
    history.replaceState(null, '', '#' + id);
    window.scrollTo({ top: 0 });
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
        avisos: c.avisos,
        actualizado: new Date().toLocaleString('es-PE')
    };
    try { localStorage.setItem('aurora_abc', JSON.stringify(resumen)); } catch (e) { /* sin almacenamiento */ }
}

function abcRenderTodo() {
    abcCalcular();
    abcGuardarResumenAurora();
    abcRenderAvisos();
    abcRenderResumen();
    abcRenderCentros();
    abcRenderRecursos();
    abcRenderInd1();
    abcRenderInd2();
    abcRenderInd3();
    abcRenderObjetos();
}

function abcRenderAvisos() {
    const el = document.getElementById('abcModo');
    el.innerHTML = abc.modo === 'local' ? `
        <div class="abc-banner abc-banner-warn">
            <strong>⚠️ Las tablas del costeo ABC aún no existen en Supabase.</strong>
            El sistema está calculando con los datos de ejemplo en memoria (los cambios no se guardan).
            Para guardarlos, ejecute una vez el archivo <code>sistema-costeo-abc/sql/abc_schema.sql</code>
            en Supabase → SQL Editor y recargue la página: los datos se generarán automáticamente.
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

    const cat = Object.keys(ABC_CATEGORIAS).filter(k => c.porCategoria[k])
        .map(k => `<li><span>${k === 'GADM' ? 'G. Adm.' : k === 'GVTA' ? 'G. Ventas' : k}</span><b>${abcSoles(c.porCategoria[k], 0)}</b></li>`).join('');

    document.getElementById('abcFlujo').innerHTML = `
        <div class="abc-flow">
            <div class="abc-node abc-node-rec" onclick="abcMostrarTab('recursos')">
                <div class="abc-node-title">Recursos</div>
                <ul class="abc-node-list"><li><span>MP (directa)</span><b>${abcSoles(c.totalMP, 0)}</b></li>${cat}</ul>
                <div class="abc-node-foot">${abc.recursos.length} recursos</div>
            </div>
            <div class="abc-arrow" onclick="abcMostrarTab('ind1')"><span>Inductor tipo 1</span><small>% = tasa</small></div>
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
            <div class="abc-arrow" onclick="abcMostrarTab('ind2')"><span>Inductor tipo 2</span><small>% por actividad</small></div>
            <div class="abc-node abc-node-act" onclick="abcMostrarTab('ind3')">
                <div class="abc-node-title">Actividades</div>
                <ul class="abc-node-list">
                    ${c.actividades.slice().sort((a, b) => b.costo - a.costo).slice(0, 4)
                        .map(a => `<li><span>${esc(a.nombre)}</span><b>${abcSoles(a.costo, 0)}</b></li>`).join('')}
                </ul>
                <div class="abc-node-foot">${abc.actividades.length} actividades</div>
            </div>
            <div class="abc-arrow" onclick="abcMostrarTab('ind3')"><span>Inductor tipo 3</span><small>consumo</small></div>
            <div class="abc-node abc-node-obj" onclick="abcMostrarTab('objetos')">
                <div class="abc-node-title">Objeto de Costos</div>
                <ul class="abc-node-list">
                    ${c.productos.map(p => `<li><span>${esc(p.nombre)}</span><b>${abcSoles(p.unitario, 4)}</b></li>`).join('')}
                </ul>
                <div class="abc-node-foot">costo unitario</div>
            </div>
        </div>`;

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
        showAlert(editando ? '✅ Centro actualizado' : '✅ Centro creado. Agregue sus actividades en Inductor tipo 2 y su distribución en Inductor tipo 1.', 'success');
    });
}

function abcEliminarCentroModal() {
    const codigo = abc._centroEditando;
    if (!codigo) return;
    const nAct = abc.actividades.filter(a => a.centro_codigo === codigo).length;
    if (!confirm(`¿Eliminar el centro ${codigo}?\nTambién se eliminan sus ${nAct} actividades y su distribución del inductor tipo 1. Sus puestos quedan sin asignar.`)) return;
    closeModal('modalCentro');
    abcTrasCambio(async () => {
        await abcBorrar('abc_centros', 'codigo', codigo);
        abc.centros = abc.centros.filter(c => c.codigo !== codigo);
        abc.centros.forEach(c => { if (c.padre_codigo === codigo) c.padre_codigo = null; });
        abc.actividades = abc.actividades.filter(a => a.centro_codigo !== codigo);
        abc.inductor1 = abc.inductor1.filter(f => f.centro_codigo !== codigo);
        abc.organigrama.forEach(o => { if (o.centro_codigo === codigo) o.centro_codigo = null; });
    });
}

// ---------- RECURSOS ----------
function abcRenderRecursos() {
    const c = abc.calc;
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
                    : `<input type="number" step="0.01" min="0" class="abc-input abc-input-w" value="${Number(r.monto) || 0}" onchange="abcCambiarMonto('${esc(r.codigo)}', this.value)">`}</td>
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
        ${cols.map(x => `<td class="num">${abcFmt(c.centroCosto[x.codigo] || 0, 0)}</td>`).join('')}<td></td></tr>`;
    document.getElementById('abcInd1Tabla').innerHTML = `<thead>${head}</thead><tbody>${body}${pie}</tbody>`;

    document.getElementById('abcInd1Centros').innerHTML = cols.map(x => {
        const cat = c.centroPorCategoria[x.codigo] || {};
        return `<tr>
            <td><strong>${esc(x.codigo)}</strong></td><td>${esc(x.nombre)}</td>
            <td><span class="abc-tag abc-tag-${x.tipo}">${ABC_TIPOS[x.tipo].nombre}</span></td>
            ${['MOD', 'MOI', 'CIF', 'GADM', 'GVTA'].map(k => `<td class="num">${cat[k] ? abcFmt(cat[k]) : '–'}</td>`).join('')}
            <td class="num"><strong>${abcSoles(c.centroCosto[x.codigo] || 0)}</strong></td>
        </tr>`;
    }).join('') + `<tr class="abc-total"><td colspan="8">TOTAL</td><td class="num">${abcSoles(Object.values(c.centroCosto).reduce((s, v) => s + v, 0))}</td></tr>`;
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
                        <td class="num">${abcFmt(a.costo)}</td>
                        <td><select class="abc-input-sel" onchange="abcCambiarActividad('${esc(a.codigo)}','inductor_codigo', this.value)">${opcionesInd(a.inductor_codigo)}</select></td>
                        <td><button class="abc-icon-btn" title="Eliminar actividad" onclick="abcEliminarActividad('${esc(a.codigo)}')">🗑️</button></td>
                    </tr>`).join('')}
                    <tr class="abc-total"><td>Σ</td><td class="num ${Math.abs(suma - 100) > 0.01 ? 'abc-neg' : 'abc-pos'}">${abcPct(suma)}</td>
                        <td class="num">${abcFmt(acts.reduce((s, a) => s + a.costo, 0))}</td>
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
function abcRenderObjetos() {
    const c = abc.calc;
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
        await abcBorrar('abc_recursos', 'codigo', codigo);
        abc.recursos = abc.recursos.filter(r => r.codigo !== codigo);
        abc.inductor1 = abc.inductor1.filter(f => f.recurso_codigo !== codigo);
    });
}

function abcEliminarActividad(codigo) {
    if (!confirm('¿Eliminar la actividad ' + codigo + '?')) return;
    abcTrasCambio(async () => {
        await abcBorrar('abc_actividades', 'codigo', codigo);
        abc.actividades = abc.actividades.filter(a => a.codigo !== codigo);
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
        showAlert('✅ Recurso registrado. Ajuste su distribución en Inductor tipo 1.', 'success');
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
            for (const t of ['abc_organigrama', 'abc_consumo', 'abc_materiales', 'abc_objetos_costo', 'abc_actividades',
                             'abc_inductor1', 'abc_inductores', 'abc_recursos', 'abc_centros']) {
                const { error } = await supabaseClient.from(t).delete().neq('id', 0);
                if (error) throw error;
            }
        }
        await abcCargar();
        abcRenderTodo();
    } catch (e) {
        console.error(e);
        showAlert('❌ Error al restablecer: ' + (e.message || e), 'error');
    }
}

function abcExportarCSV(idTabla, nombre) {
    const rows = [...document.querySelectorAll('#' + idTabla + ' tr')];
    const txt = rows.map(r => [...r.cells].map(cel => {
        const input = cel.querySelector('input,select');
        let s = (input ? input.value : cel.textContent).trim().replace(/\s+/g, ' ');
        if (/^[=+@-]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
    }).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre + '-' + (abc.periodo || '') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
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
    sel.innerHTML = abc.periodos.map(p => `<option value="${p}" ${p === abc.periodo ? 'selected' : ''}>${abcNombreMes(p)}</option>`).join('');
    sel.addEventListener('change', () => { abc.periodo = sel.value; abcRenderTodo(); });

    document.querySelectorAll('.sub-nav button').forEach(b => b.addEventListener('click', () => abcMostrarTab(b.dataset.tab)));
    abcRenderTodo();
    abcMostrarTab((location.hash || '#resumen').slice(1));
    document.getElementById('abcCargando').style.display = 'none';
}
