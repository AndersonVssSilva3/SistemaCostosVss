// ==================== AURORA · Asistente de costos (chat + voz) ====================
// Se incluye en todas las páginas con:  <script src="../aurora/aurora.js" defer></script>
// La inteligencia vive en la Edge Function "aurora" de Supabase (supabase/functions/aurora).
(function () {
    'use strict';
    if (window.__auroraCargada) return;
    window.__auroraCargada = true;

    const SCRIPT = document.currentScript;
    const BASE = new URL('../', SCRIPT ? SCRIPT.src : location.href);   // raíz del proyecto
    const SUPA_URL = 'https://cngdylllnpwbcscbeucq.supabase.co';
    const SUPA_KEY = 'sb_publishable_unfToLhNSbk7QUMfMqrtcg_kC78empj';
    const FUNCION = 'aurora';

    // Debe coincidir con DESTINOS en supabase/functions/aurora/index.ts
    const AURORA_DESTINOS = {
        'contable':             { url: 'sistema-contable/index.html',       nombre: 'Sistema Contable',              claves: ['sistema contable', 'contabilidad', 'contable', 'dashboard contable'] },
        'contable-operaciones': { url: 'sistema-contable/operaciones.html', nombre: 'Operaciones',                   claves: ['operaciones', 'registro de compras', 'registro de ventas'] },
        'contable-kardex':      { url: 'sistema-contable/kardex.html',      nombre: 'Kardex',                        claves: ['kardex', 'inventario', 'inventarios'] },
        'contable-libros':      { url: 'sistema-contable/libros.html',      nombre: 'Libros Contables',              claves: ['libros', 'libro diario', 'libro mayor', 'diario'] },
        'contable-eeff':        { url: 'sistema-contable/eeff.html',        nombre: 'Estados Financieros',           claves: ['estados financieros', 'balance general', 'estado de resultados', 'eeff'] },
        'contable-costos':      { url: 'sistema-contable/costos.html',      nombre: 'Costos (contable)',             claves: ['costo de ventas', 'costos contables'] },
        'contable-cierre':      { url: 'sistema-contable/cierre.html',      nombre: 'Ajustes y Cierre',              claves: ['cierre', 'ajustes'] },
        'contable-tablas':      { url: 'sistema-contable/tablas.html',      nombre: 'Datos Maestros',                claves: ['datos maestros', 'tablas', 'maestros'] },
        'contable-utilitarios': { url: 'sistema-contable/utilitarios.html', nombre: 'Utilitarios',                   claves: ['utilitarios', 'herramientas'] },
        'contable-ratios':      { url: 'sistema-contable/ratios.html',      nombre: 'Ratios Financieros',            claves: ['ratios', 'indicadores financieros'] },
        'contable-planilla':    { url: 'sistema-contable/planilla.html',    nombre: 'Planilla',                      claves: ['planilla', 'planillas', 'remuneraciones', 'sueldos'] },
        'ordenes':              { url: 'sistema-ordenes/index.html',        nombre: 'Órdenes de Trabajo',            claves: ['ordenes de trabajo', 'sistema de ordenes', 'dashboard industrial'] },
        'ordenes-lista':        { url: 'sistema-ordenes/ordenes.html',      nombre: 'Lista de Órdenes',              claves: ['lista de ordenes', 'ordenes'] },
        'ordenes-mp':           { url: 'sistema-ordenes/materia-prima.html', nombre: 'Materia Prima',                claves: ['materia prima'] },
        'ordenes-mo':           { url: 'sistema-ordenes/mano-obra.html',    nombre: 'Mano de Obra',                  claves: ['mano de obra'] },
        'ordenes-cif':          { url: 'sistema-ordenes/cif.html',          nombre: 'CIF',                           claves: ['cif', 'costos indirectos'] },
        'ordenes-mayor':        { url: 'sistema-ordenes/mayor-fabrica.html', nombre: 'Mayor de Fábrica',             claves: ['mayor de fabrica', 'mayor fabrica'] },
        'ordenes-hoja':         { url: 'sistema-ordenes/hoja-costos.html',  nombre: 'Hoja de Costos',                claves: ['hoja de costos', 'hoja de costo'] },
        'ordenes-eeff':         { url: 'sistema-ordenes/eeff-ot.html',      nombre: 'Estados Financieros (OT)',      claves: ['estados financieros de ordenes', 'eeff ot'] },
        'ordenes-reportes':     { url: 'sistema-ordenes/reportes.html',     nombre: 'Reportes',                      claves: ['reportes', 'reporte'] },
        'conjuntos':            { url: 'sistema-costos-conjuntos/index.html', nombre: 'Costos Conjuntos',            claves: ['costos conjuntos', 'conjuntos'] },
        'abc-resumen':          { url: 'sistema-costeo-abc/index.html#resumen',  nombre: 'Costeo ABC · Resumen',     claves: ['costeo abc', 'sistema abc', 'abc', 'resumen abc'] },
        'abc-centros':          { url: 'sistema-costeo-abc/index.html#centros',  nombre: 'Centros de Actividad',     claves: ['centros de actividad', 'mapa de procesos', 'organigrama', 'mof', 'manual de funciones'] },
        'abc-recursos':         { url: 'sistema-costeo-abc/index.html#recursos', nombre: 'Recursos ABC',             claves: ['recursos'] },
        'abc-ind1':             { url: 'sistema-costeo-abc/index.html#ind1',     nombre: 'Inductor tipo 1',          claves: ['inductor tipo 1', 'inductor 1', 'inductor uno', 'primer inductor'] },
        'abc-ind2':             { url: 'sistema-costeo-abc/index.html#ind2',     nombre: 'Inductor tipo 2',          claves: ['inductor tipo 2', 'inductor 2', 'inductor dos', 'segundo inductor', 'actividades'] },
        'abc-ind3':             { url: 'sistema-costeo-abc/index.html#ind3',     nombre: 'Inductor tipo 3',          claves: ['inductor tipo 3', 'inductor 3', 'inductor tres', 'tercer inductor', 'tasas'] },
        'abc-objetos':          { url: 'sistema-costeo-abc/index.html#objetos',  nombre: 'Objeto de Costos',         claves: ['objeto de costos', 'objetos de costo', 'hoja de costo abc', 'productos abc'] }
    };

    // Tablas que Aurora lee (las que no existan se omiten)
    const TABLAS = ['planillas', 'productos', 'compras', 'ventas', 'asientos', 'kardex', 'activo_fijo', 'centros_costo',
        'inductores', 'mercaderias', 'repuestos', 'materia_prima', 'ordenes_trabajo', 'ot_materia_prima', 'ot_mano_obra',
        'ot_cif', 'ot_gastos', 'ot_ventas', 'abc_centros', 'abc_recursos', 'abc_inductor1', 'abc_inductores',
        'abc_actividades', 'abc_objetos_costo', 'abc_consumo', 'abc_materiales', 'abc_organigrama'];

    const K_CHAT = 'aurora_chat', K_DATOS = 'aurora_datos', K_PEND = 'aurora_pendiente', K_VOZ = 'aurora_voz', K_ABIERTA = 'aurora_abierta';

    // ==================== UTILIDADES ====================
    const norm = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const leer = (k, def) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
    const guardar = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
    const r2 = n => Math.round((Number(n) || 0) * 100) / 100;

    function mdAHtml(texto) {
        const lineas = esc(texto).split('\n');
        let html = '', enLista = false;
        lineas.forEach(l => {
            const item = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
            if (item) {
                if (!enLista) { html += '<ul>'; enLista = true; }
                html += '<li>' + item[1] + '</li>';
                return;
            }
            if (enLista) { html += '</ul>'; enLista = false; }
            const h = l.match(/^#{1,4}\s+(.*)$/);
            html += h ? '<p><b>' + h[1] + '</b></p>' : (l.trim() ? '<p>' + l + '</p>' : '');
        });
        if (enLista) html += '</ul>';
        return html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^_])_(.+?)_(?!_)/g, '$1<i>$2</i>');
    }

    // ==================== SUPABASE ====================
    let cliente = null;
    async function obtenerCliente() {
        if (cliente) return cliente;
        try { if (typeof supabaseClient !== 'undefined' && supabaseClient) { cliente = supabaseClient; return cliente; } } catch (e) { /* no definido */ }
        if (!window.supabase) {
            await new Promise((ok, mal) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                s.onload = ok; s.onerror = mal;
                document.head.appendChild(s);
            });
        }
        cliente = window.supabase.createClient(SUPA_URL, SUPA_KEY);
        return cliente;
    }

    // ==================== RECOLECCIÓN DE DATOS ====================
    function sinMeta(filas) {
        return filas.map(f => { const o = { ...f }; delete o.created_at; return o; });
    }

    function resumirPlanillas(filas) {
        const porPeriodo = {};
        filas.forEach(p => {
            const r = porPeriodo[p.periodo] = porPeriodo[p.periodo] || { periodo: p.periodo, trabajadores: 0, total_bruto: 0, total_neto: 0, costo_empleador: 0 };
            r.trabajadores++; r.total_bruto += +p.total_bruto || 0; r.total_neto += +p.total_neto || 0; r.costo_empleador += +p.costo_total_empleador || 0;
        });
        const periodos = Object.keys(porPeriodo).sort();
        const ultimo = periodos[periodos.length - 1];
        return {
            por_periodo: periodos.map(k => ({ ...porPeriodo[k], total_bruto: r2(porPeriodo[k].total_bruto), total_neto: r2(porPeriodo[k].total_neto), costo_empleador: r2(porPeriodo[k].costo_empleador) })),
            detalle_ultimo_periodo: filas.filter(p => p.periodo === ultimo).map(p => ({
                nombre: p.empleado_nombre, cargo: p.empleado_cargo, pension: p.sistema_pension, sueldo_basico: p.sueldo_basico,
                total_bruto: p.total_bruto, descuentos: p.total_descuentos, neto: p.total_neto, essalud: p.essalud, cts: p.cts,
                costo_empleador: p.costo_total_empleador, estado: p.estado
            }))
        };
    }

    function resumirAsientos(filas) {
        const saldos = {}, porTipo = {};
        filas.forEach(a => {
            porTipo[a.tipo || 'sin tipo'] = (porTipo[a.tipo || 'sin tipo'] || 0) + 1;
            (Array.isArray(a.lineas) ? a.lineas : []).forEach(l => {
                const s = saldos[l.cuenta] = saldos[l.cuenta] || { cuenta: l.cuenta, nombre: l.nombre, debe: 0, haber: 0 };
                s.debe += +l.debe || 0; s.haber += +l.haber || 0;
            });
        });
        return {
            total_asientos: filas.length, por_tipo: porTipo,
            saldos_por_cuenta: Object.values(saldos).sort((a, b) => String(a.cuenta).localeCompare(String(b.cuenta)))
                .map(s => ({ ...s, debe: r2(s.debe), haber: r2(s.haber), saldo: r2(s.debe - s.haber) })),
            ultimos: filas.slice(-10).map(a => ({ numero: a.numero, fecha: a.fecha, tipo: a.tipo, glosa: a.glosa }))
        };
    }

    function resumirKardex(filas) {
        const prod = {};
        filas.forEach(k => {
            const p = prod[k.producto_codigo] = prod[k.producto_codigo] || { codigo: k.producto_codigo, nombre: k.producto_nombre, entradas: 0, salidas: 0, movimientos: 0 };
            p.movimientos++;
            if (k.tipo_movimiento === 'entrada') p.entradas += +k.cantidad || 0; else p.salidas += +k.cantidad || 0;
            p.saldo_cantidad = k.saldo_cantidad; p.saldo_costo_unitario = k.saldo_costo_unitario; p.saldo_total = k.saldo_total; p.ultima_fecha = k.fecha;
        });
        return { total_movimientos: filas.length, por_producto: Object.values(prod) };
    }

    function resumirMovimientos(filas) {
        const porMes = {};
        filas.forEach(f => {
            const m = String(f.fecha || '').slice(0, 7);
            const r = porMes[m] = porMes[m] || { mes: m, documentos: 0, base: 0, igv: 0, total: 0 };
            r.documentos++; r.base += +f.base || 0; r.igv += +f.igv || 0; r.total += +f.total || 0;
        });
        return {
            por_mes: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)).map(r => ({ ...r, base: r2(r.base), igv: r2(r.igv), total: r2(r.total) })),
            documentos: sinMeta(filas).map(f => { delete f.id; return f; })
        };
    }

    async function recolectarDatos() {
        const sb = await obtenerCliente();
        const resultados = await Promise.all(TABLAS.map(t => sb.from(t).select('*').order('id', { ascending: true }).limit(1000)
            .then(r => [t, r], e => [t, { error: e }])));
        const datos = { generado: new Date().toLocaleString('es-PE'), tablas: {}, tablas_no_disponibles: [] };
        resultados.forEach(([t, r]) => {
            if (r.error || !r.data) { datos.tablas_no_disponibles.push(t); return; }
            const filas = r.data;
            if (t === 'planillas') datos.tablas[t] = resumirPlanillas(filas);
            else if (t === 'asientos') datos.tablas[t] = resumirAsientos(filas);
            else if (t === 'kardex') datos.tablas[t] = resumirKardex(filas);
            else if (t === 'compras' || t === 'ventas') datos.tablas[t] = resumirMovimientos(filas);
            else datos.tablas[t] = { filas: filas.length, datos: sinMeta(filas).slice(0, 300) };
        });
        // Resultado calculado del costeo ABC (lo guarda la página del Costeo ABC)
        try {
            const abc = localStorage.getItem('aurora_abc');
            if (abc) datos.costeo_abc_calculado = JSON.parse(abc);
            else datos.costeo_abc_calculado = 'No disponible: abra una vez la burbuja Costeo ABC para calcularlo.';
        } catch (e) { /* sin datos */ }
        return JSON.stringify(datos);
    }

    function contextoPantalla() {
        const activa = document.querySelector('.tab-content.active');
        const zona = activa || document.querySelector('.main-content') || document.body;
        const titulo = (document.querySelector('.header h1') || {}).innerText || document.title;
        let texto = '';
        try { texto = zona.innerText.replace(/\n{2,}/g, '\n').slice(0, 6000); } catch (e) { /* vacío */ }
        return `Página: ${location.pathname.split('/').slice(-2).join('/')}${location.hash} · ${titulo}\nContenido visible:\n${texto}`;
    }

    // ==================== NAVEGACIÓN ====================
    function urlDestino(id) {
        const d = AURORA_DESTINOS[id];
        return d ? new URL(d.url, BASE) : null;
    }

    function navegar(id, pendiente) {
        const url = urlDestino(id);
        if (!url) return false;
        const mismaPagina = url.pathname === location.pathname;
        if (mismaPagina) {
            if (url.hash && typeof window.abcMostrarTab === 'function') window.abcMostrarTab(url.hash.slice(1));
            else if (url.hash) location.hash = url.hash;
            return true;
        }
        if (pendiente) guardar(K_PEND, pendiente);
        guardar(K_ABIERTA, true);
        setTimeout(() => { location.href = url.href; }, 900);
        return true;
    }

    // Detecta órdenes simples como "abre el inductor tipo 1" sin consultar a la IA
    function intencionNavegar(texto) {
        const t = norm(texto);
        if (!/\b(abre|abrir|abreme|entra|entrar|ir a|ir al|ve a|vamos a|llevame|muestrame|mostrar|muestra|navega|cambia a|pasa a)\b/.test(t)) return null;
        let mejor = null, largo = 0;
        Object.entries(AURORA_DESTINOS).forEach(([id, d]) => {
            d.claves.forEach(c => { if (t.includes(c) && c.length > largo) { mejor = id; largo = c.length; } });
        });
        if (!mejor) return null;
        // Si además pregunta algo (cuánto, por qué, recomienda…), lo responde la IA
        const pregunta = /\b(cuanto|cual|cuales|por que|como|recomienda|analiza|dime|explica|que falta|compara)\b/.test(t);
        return { id: mejor, soloNavegar: !pregunta };
    }

    // ==================== VOZ ====================
    let vozActiva = (() => { try { return localStorage.getItem(K_VOZ) !== 'off'; } catch (e) { return true; } })();
    let vozEs = null;
    function elegirVoz() {
        if (!('speechSynthesis' in window)) return;
        const voces = speechSynthesis.getVoices();
        vozEs = voces.find(v => /es[-_](PE|419|MX|US)/i.test(v.lang) && /female|mujer|helena|sabina|paulina|dalia|camila|elena/i.test(v.name))
            || voces.find(v => /es[-_](PE|419|MX|US)/i.test(v.lang))
            || voces.find(v => /^es/i.test(v.lang)) || null;
    }
    if ('speechSynthesis' in window) { elegirVoz(); speechSynthesis.onvoiceschanged = elegirVoz; }

    function hablar(texto) {
        if (!vozActiva || !texto || !('speechSynthesis' in window)) return;
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(texto.replace(/[*_#•]/g, ''));
            u.lang = vozEs ? vozEs.lang : 'es-PE';
            if (vozEs) u.voice = vozEs;
            u.rate = 1.02; u.pitch = 1.05;
            speechSynthesis.speak(u);
        } catch (e) { console.warn('Voz no disponible', e); }
    }

    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    let escuchando = null;
    function escuchar() {
        if (!Reconocimiento) { agregarMensaje('aurora', 'Tu navegador no permite dictado por voz. Usa Google Chrome o Microsoft Edge.'); return; }
        if (escuchando) { escuchando.stop(); return; }
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        const rec = new Reconocimiento();
        rec.lang = 'es-PE';
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        const input = document.getElementById('auroraInput');
        rec.onresult = ev => {
            const txt = Array.from(ev.results).map(r => r[0].transcript).join('');
            input.value = txt;
            if (ev.results[ev.results.length - 1].isFinal) { rec.stop(); enviar(txt); }
        };
        rec.onend = () => { escuchando = null; document.getElementById('auroraMic').classList.remove('aurora-rec'); };
        rec.onerror = ev => { if (ev.error === 'not-allowed') agregarMensaje('aurora', 'Necesito permiso para usar el micrófono.'); };
        escuchando = rec;
        document.getElementById('auroraMic').classList.add('aurora-rec');
        rec.start();
    }

    // ==================== ESTADO DEL CHAT ====================
    let chat = leer(K_CHAT, []);      // [{ role: 'user'|'assistant', texto, html? }]
    let ocupada = false;

    function agregarMensaje(quien, texto, opciones = {}) {
        const lista = document.getElementById('auroraMensajes');
        if (!lista) return;
        const div = document.createElement('div');
        div.className = 'aurora-msg aurora-msg-' + quien;
        div.innerHTML = quien === 'usuario' ? '<p>' + esc(texto) + '</p>' : mdAHtml(texto);
        if (opciones.voz && quien === 'aurora' && 'speechSynthesis' in window) {
            const b = document.createElement('button');
            b.className = 'aurora-replay';
            b.title = 'Escuchar';
            b.textContent = '🔊';
            b.onclick = () => { const v = vozActiva; vozActiva = true; hablar(opciones.voz); vozActiva = v; };
            div.appendChild(b);
        }
        lista.appendChild(div);
        lista.scrollTop = lista.scrollHeight;
    }

    function pintarHistorial() {
        const lista = document.getElementById('auroraMensajes');
        lista.innerHTML = '';
        if (!chat.length) {
            agregarMensaje('aurora', '¡Hola! Soy **Aurora**, tu asistente de costos. Puedo leer la planilla, ventas, órdenes de trabajo, inductores y el costeo ABC, darte recomendaciones y llevarte a cualquier ventana.\n- *"¿Cuánto cuesta producir una Coca-Cola de 600 ml?"*\n- *"¿Qué nos falta en el sistema?"*\n- *"Abre el inductor tipo 2"*'.replace(/\*"(.+?)"\*/g, '"$1"'));
            return;
        }
        chat.forEach(m => agregarMensaje(m.role === 'user' ? 'usuario' : 'aurora', m.mostrar || m.texto, { voz: m.voz }));
    }

    function pensando(si) {
        ocupada = si;
        const el = document.getElementById('auroraPensando');
        if (el) el.style.display = si ? '' : 'none';
        document.getElementById('auroraEnviar').disabled = si;
        if (si) { const l = document.getElementById('auroraMensajes'); l.scrollTop = l.scrollHeight; }
    }

    async function consultarIA() {
        let datos = leer(K_DATOS, null);
        if (!datos) {
            datos = await recolectarDatos();
            guardar(K_DATOS, datos);
        }
        const sb = await obtenerCliente();
        const { data, error } = await sb.functions.invoke(FUNCION, {
            body: {
                datos,
                pantalla: contextoPantalla(),
                historial: chat.map(m => ({ role: m.role, texto: m.texto }))
            }
        });
        if (error) {
            let detalle = '';
            try { detalle = (await error.context.json()).error; } catch (e) { /* sin cuerpo */ }
            const err = new Error(detalle || error.message);
            err.status = error.context && error.context.status;
            err.sinFuncion = /FunctionsFetchError|Failed to send|404|not found/i.test(error.name + ' ' + error.message) || err.status === 404;
            throw err;
        }
        return data;
    }

    async function enviar(texto) {
        texto = String(texto || '').trim();
        if (!texto || ocupada) return;
        const input = document.getElementById('auroraInput');
        input.value = '';
        agregarMensaje('usuario', texto);

        const nav = intencionNavegar(texto);
        if (nav && nav.soloNavegar) {
            const d = AURORA_DESTINOS[nav.id];
            const msg = `Te llevo a **${d.nombre}**.`;
            agregarMensaje('aurora', msg);
            hablar('Te llevo a ' + d.nombre);
            chat.push({ role: 'user', texto }, { role: 'assistant', texto: JSON.stringify({ respuesta: msg, voz: '', acciones: [{ tipo: 'navegar', destino: nav.id }] }), mostrar: msg });
            guardar(K_CHAT, chat);
            navegar(nav.id);
            return;
        }

        chat.push({ role: 'user', texto });
        guardar(K_CHAT, chat);
        pensando(true);
        try {
            const r = await consultarIA();
            const respuesta = r.respuesta || 'No obtuve respuesta.';
            chat.push({ role: 'assistant', texto: r.raw || JSON.stringify(r), mostrar: respuesta, voz: r.voz });
            guardar(K_CHAT, chat);
            pensando(false);
            agregarMensaje('aurora', respuesta, { voz: r.voz });
            const destino = (r.acciones || []).find(a => a.tipo === 'navegar' && AURORA_DESTINOS[a.destino]);
            if (destino) {
                const fuera = urlDestino(destino.destino).pathname !== location.pathname;
                if (fuera) {
                    // La voz se reproduce al llegar a la nueva página
                    navegar(destino.destino, { voz: r.voz });
                } else { hablar(r.voz); navegar(destino.destino); }
            } else hablar(r.voz);
        } catch (e) {
            pensando(false);
            chat.pop();
            guardar(K_CHAT, chat);
            console.error('Aurora:', e);
            const local = respuestaLocal(texto);
            if (e.status === 401) agregarMensaje('aurora', '🔒 ' + (e.message || 'Inicie sesión para usar a Aurora.'));
            else if (e.sinFuncion) agregarMensaje('aurora', '⚙️ Mi análisis con IA aún no está activado (falta publicar la función **aurora** en Supabase).' + (local ? '\n\nMientras tanto, esto es lo que encuentro:\n' + local : ''));
            else agregarMensaje('aurora', '⚠️ ' + (e.message || 'No pude responder.') + (local ? '\n\n' + local : ''));
            if (local) hablar(local.replace(/\*\*/g, '').split('\n')[0]);
        }
    }

    // Respuestas básicas sin IA (costos ABC calculados en este navegador)
    function respuestaLocal(texto) {
        let abc = null;
        try { abc = JSON.parse(localStorage.getItem('aurora_abc') || 'null'); } catch (e) { /* sin datos */ }
        if (!abc || !abc.productos) return '';
        const t = norm(texto).replace(/(\d)[.,](\d)/g, '$1$2');
        const encontrado = abc.productos.find(p => {
            const n = norm(p.nombre).replace(/(\d)[.,](\d)/g, '$1$2').replace(/-/g, ' ');
            const partes = n.split(' ').filter(w => w.length > 1 && !['ml', 'de'].includes(w));
            return partes.every(w => t.replace(/-/g, ' ').includes(w));
        });
        if (encontrado) {
            const p = encontrado;
            return `**${p.nombre}** (${abc.periodo}): costo unitario ABC **S/ ${p.unitario.toFixed(4)}** (MP S/ ${p.mpUnit.toFixed(4)} + actividades S/ ${(p.indirecto / (p.unidades || 1)).toFixed(4)}), precio S/ ${p.precio.toFixed(2)}, margen ${p.margen.toFixed(1)}%.`;
        }
        if (/recomienda|falta|problema|revisa|alerta/.test(t) && abc.avisos) {
            return abc.avisos.length ? abc.avisos.map(a => '- ' + a).join('\n') : '- La distribución del costeo ABC está completa (todos los recursos llegan a los productos).';
        }
        return '';
    }

    // ==================== INTERFAZ ====================
    function construir() {
        if (document.getElementById('aurora-boton')) return;
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = new URL('aurora/aurora.css', BASE).href;
        document.head.appendChild(css);

        const boton = document.createElement('button');
        boton.id = 'aurora-boton';
        boton.className = 'aurora-boton';
        boton.setAttribute('aria-label', 'Abrir a Aurora, asistente de costos');
        boton.innerHTML = '<span class="aurora-orbe">✦</span><span class="aurora-boton-txt">Aurora</span>';
        document.body.appendChild(boton);

        const panel = document.createElement('section');
        panel.id = 'aurora-panel';
        panel.className = 'aurora-panel';
        panel.setAttribute('aria-label', 'Aurora, asistente de costos');
        panel.innerHTML = `
            <header class="aurora-head">
                <div class="aurora-avatar">✦</div>
                <div class="aurora-titulo"><strong>Aurora</strong><small>Asistente de costos · VSS</small></div>
                <button class="aurora-ic" id="auroraVoz" title="Activar o silenciar la voz"></button>
                <button class="aurora-ic" id="auroraRefrescar" title="Volver a leer la base de datos">⟳</button>
                <button class="aurora-ic" id="auroraNueva" title="Nueva conversación">🗑</button>
                <button class="aurora-ic" id="auroraCerrar" title="Cerrar">✕</button>
            </header>
            <div class="aurora-mensajes" id="auroraMensajes" aria-live="polite"></div>
            <div class="aurora-pensando" id="auroraPensando" style="display:none"><span></span><span></span><span></span> Aurora está analizando los datos…</div>
            <div class="aurora-sugerencias" id="auroraSugerencias">
                <button>¿Qué recomiendas mejorar?</button>
                <button>¿Qué nos falta en el sistema?</button>
                <button>¿Cuál es el producto más rentable?</button>
                <button>Abre el inductor tipo 1</button>
            </div>
            <form class="aurora-form" id="auroraForm">
                <button type="button" class="aurora-ic aurora-mic" id="auroraMic" title="Hablar con Aurora">🎙</button>
                <input id="auroraInput" autocomplete="off" placeholder="Pregúntale a Aurora…">
                <button type="submit" class="aurora-enviar" id="auroraEnviar" title="Enviar">➤</button>
            </form>`;
        document.body.appendChild(panel);

        const abrir = (si) => {
            panel.classList.toggle('abierta', si);
            boton.classList.toggle('oculto', si);
            guardar(K_ABIERTA, si);
            if (si) setTimeout(() => document.getElementById('auroraInput').focus(), 50);
            else if ('speechSynthesis' in window) speechSynthesis.cancel();
        };
        const pintarVoz = () => { document.getElementById('auroraVoz').textContent = vozActiva ? '🔊' : '🔇'; };
        pintarVoz();

        boton.onclick = () => abrir(true);
        document.getElementById('auroraCerrar').onclick = () => abrir(false);
        document.getElementById('auroraVoz').onclick = () => {
            vozActiva = !vozActiva;
            try { localStorage.setItem(K_VOZ, vozActiva ? 'on' : 'off'); } catch (e) { /* sin almacenamiento */ }
            if (!vozActiva && 'speechSynthesis' in window) speechSynthesis.cancel();
            pintarVoz();
        };
        document.getElementById('auroraNueva').onclick = () => {
            chat = []; guardar(K_CHAT, chat); sessionStorage.removeItem(K_DATOS); pintarHistorial();
        };
        document.getElementById('auroraRefrescar').onclick = async () => {
            sessionStorage.removeItem(K_DATOS);
            agregarMensaje('aurora', 'Leyendo de nuevo la base de datos…');
            try { guardar(K_DATOS, await recolectarDatos()); agregarMensaje('aurora', '✅ Datos actualizados.'); }
            catch (e) { agregarMensaje('aurora', '⚠️ No pude leer la base de datos.'); }
        };
        document.getElementById('auroraMic').onclick = escuchar;
        document.getElementById('auroraForm').onsubmit = ev => { ev.preventDefault(); enviar(document.getElementById('auroraInput').value); };
        document.querySelectorAll('#auroraSugerencias button').forEach(b => { b.onclick = () => enviar(b.textContent); });
        document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && panel.classList.contains('abierta')) abrir(false); });

        pintarHistorial();

        // Viene de una navegación pedida a Aurora: abrir el panel y decir la respuesta
        if (leer(K_ABIERTA, false)) abrir(true);
        const pendiente = leer(K_PEND, null);
        if (pendiente) {
            sessionStorage.removeItem(K_PEND);
            abrir(true);
            setTimeout(() => hablar(pendiente.voz), 600);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', construir);
    else construir();

    window.Aurora = { enviar, navegar, recolectarDatos };
})();
