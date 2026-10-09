'use strict';

// ==================== HELPERS GLOBALES ====================
// NO definimos el() para evitar conflictos con otros módulos.
// Usamos document.getElementById() directo en todo el archivo.

if (typeof window.textCell !== 'function') {
    window.textCell = function(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
}

function _esc(value) { return window.textCell(value); }
function _money(v) { return Number(v || 0).toFixed(2); }
function _empty(columns, text = 'Sin registros para mostrar.') {
    return `<tr><td class="empty-state" colspan="${columns}">${_esc(text)}</td></tr>`;
}

// ==================== MENÚ DE MÓDULOS ====================
const modules = [
    ['index.html', '◉', 'Resumen'],
    ['operaciones.html', '◈', 'Operaciones'],
    ['kardex.html', '▦', 'Kardex'],
    ['libros.html', '▤', 'Libros contables'],
    ['eeff.html', '▥', 'Estados financieros'],
    ['ratios.html', '◎', 'Ratios Financieros'],
    ['costos.html', '◧', 'Costos'],
    ['cierre.html', '▣', 'Ajustes y cierre'],
    ['tablas.html', '☷', 'Datos maestros'],
    ['utilitarios.html', '⚙', 'Herramientas']
];

// ==================== NAVEGACIÓN ====================
// Fallback por si irAModulo() no existe en otro archivo
if (typeof window.irAModulo !== 'function') {
    window.irAModulo = function(href, label) {
        window.location.href = href;
    };
}

// ==================== CONSTRUCCIÓN DEL SIDEBAR ====================
function construirSidebar() {
    if (document.querySelector('.app-sidebar')) return;

    const current = location.pathname.split('/').pop() || 'index.html';

    const sidebarHTML = `
        <a class="skip-link" href="#workspace">Ir al contenido</a>
        <aside class="app-sidebar">
            <a class="app-brand" href="index.html">
                🏭 VSS Fábrica
                <small>SISTEMA CONTABLE</small>
            </a>
            <div class="nav-caption">Espacio de trabajo</div>
            <nav aria-label="Navegación principal">
                ${modules.map(([href, icon, label]) =>
                    `<a href="${href}" ${current === href ? 'aria-current="page"' : ''}>
                        <span class="nav-symbol" aria-hidden="true">${icon}</span>${label}
                    </a>`
                ).join('')}
            </nav>
            <div class="sidebar-bottom">
                <strong>VSS FÁBRICA</strong>
                VSS S.A.C.<br>
                RUC 20601234567<br>
                Soles peruanos · PEN
                <button onclick="cerrarSesion()" style="margin-top:10px; width:100%; padding:8px; background:rgba(255,255,255,0.1); color:white; border:1px solid rgba(255,255,255,0.2); border-radius:6px; cursor:pointer; font-size:12px; font-weight:600; transition:all .2s;">
                    🚪 Cerrar Sesión
                </button>
            </div>
        </aside>
    `;

    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    console.log('✅ Sidebar construido (VSS Fábrica)');
}


// ==================== INICIALIZACIÓN UI ====================
// ==================== INICIALIZACIÓN UI ====================
function initProfessionalUI() {
    const current = location.pathname.split('/').pop() || 'index.html';

    // -------- Barra lateral (PRIMERO, siempre) --------
    construirSidebar();

    if (typeof initFabMenu === 'function') {
        initFabMenu();
    }
    const main = document.querySelector('.main-content');
    if (main) main.id = 'workspace';

    // -------- Título --------
    const title = document.querySelector('.header h1');
    if (title) {
        const found = modules.find(m => m[0] === current);
        if (found) title.textContent = `${found[1]} ${found[2]}`;
    }

    // -------- Contenedor de alertas --------
    let alerts = document.getElementById('alertContainer');
    if (!alerts && main) {
        alerts = document.createElement('div');
        alerts.id = 'alertContainer';
        main.prepend(alerts);
    }
    if (alerts) {
        alerts.setAttribute('role', 'status');
        alerts.setAttribute('aria-live', 'polite');
    }

    // -------- Banner de modo --------
    if (main && !main.querySelector('.mode-banner')) {
        main.insertAdjacentHTML('afterbegin', `
            <div class="mode-banner">
                Entorno conectado a Supabase · Los datos se guardan en la nube.
                Exporte un respaldo desde Herramientas para conservar su trabajo.
            </div>
        `);
    }

    // -------- Accesibilidad de formularios --------
    document.querySelectorAll('.form-group').forEach(g => {
        const label = g.querySelector('label');
        const input = g.querySelector('input,select,textarea');
        if (label && input && input.id) label.htmlFor = input.id;
    });
    document.querySelectorAll('input[type=number]').forEach(i => i.min = '0');
    document.querySelectorAll('input[type=date]').forEach(i => {
        if (!i.value) i.value = new Date().toISOString().split('T')[0];
    });

    // -------- Tablas con región accesible --------
    document.querySelectorAll('.table-container').forEach(c => {
        c.tabIndex = 0;
        c.setAttribute('role', 'region');
        const cardTitle = c.closest('.card')?.querySelector('h2')?.textContent || 'Tabla de datos';
        c.setAttribute('aria-label', cardTitle);
    });

    // -------- Botones de exportar CSV / imprimir --------
    document.querySelectorAll('.tab-content .card').forEach(card => {
        if (card.querySelector('table') && !card.querySelector('.btn-group.no-print')) {
            const bar = document.createElement('div');
            bar.className = 'btn-group no-print';
            bar.innerHTML = `
                <button class="btn btn-warning" type="button">Exportar CSV</button>
                <button class="btn btn-warning" type="button">Imprimir / PDF</button>
            `;
            bar.children[0].onclick = () => exportTable(card);
            bar.children[1].onclick = () => window.print();
            card.append(bar);
        }
    });

    // -------- Escape cierra modales --------
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });

    console.log('✅ professional.js: UI lista');
}

// Ejecuta cuando el DOM esté listo (o inmediatamente si ya lo está)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfessionalUI);
} else {
    initProfessionalUI();
}
// ==================== EXPORTAR CSV ====================
function downloadFile(name, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportTable(card) {
    const rows = [...card.querySelectorAll('table tr')].filter(r => r.style.display !== 'none');
    const text = rows.map(r => [...r.cells].map(c => {
        let s = c.textContent.trim();
        if (/^[=+@-]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
    }).join(';')).join('\r\n');
    downloadFile('omega-reporte.csv', '\uFEFF' + text, 'text/csv;charset=utf-8');
}
// ==================== DEMO SEED ====================
async function cargarDatosDemo() {
    if (typeof window.cargarDatosDemo === 'function') return;  // ya definida
}
async function cerrarSesion() {
    if (!confirm('¿Cerrar sesión?')) return;
    
    try {
        // Cerrar sesión en Supabase
        if (typeof supabaseClient !== 'undefined') {
            await supabaseClient.auth.signOut();
        }
    } catch (e) {
        console.warn('Error cerrando sesión en Supabase:', e);
    }
    
    // Limpiar localStorage
    localStorage.removeItem('vss_session');
    
    // Redirigir al login
    window.location.href = '../index.html';
}