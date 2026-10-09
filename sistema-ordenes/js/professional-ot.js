'use strict';

// ==================== HELPERS GLOBALES ====================

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

// ==================== MENÚ DE MÓDULOS (SISTEMA ÓRDENES) ====================
const modules = [
    ['index.html', '◉', 'Dashboard Industrial'],
    ['ordenes.html', '◈', 'Órdenes de Trabajo'],
    ['materia-prima.html', '▦', 'Materia Prima'],
    ['mano-obra.html', '▤', 'Mano de Obra'],
    ['cif.html', '▥', 'CIF Indirectos'],
    ['mayor-fabrica.html', '◧', 'Mayor de Fábrica'],
    ['hoja-costos.html', '▧', 'Hoja de Costos'],
    ['eeff-ot.html', '▣', 'Estados Financieros'],
    ['reportes.html', '☷', 'Reportes']
];

// ==================== CONSTRUCCIÓN DEL SIDEBAR ====================
function construirSidebar() {
    if (document.querySelector('.app-sidebar')) return;

    const current = location.pathname.split('/').pop() || 'index.html';

    const sidebarHTML = `
        <a class="skip-link" href="#workspace">Ir al contenido</a>
        <aside class="app-sidebar">
            <a class="app-brand" href="index.html">
                🏭 VSS Fábrica
                <small>SISTEMA DE ÓRDENES</small>
            </a>
            <div class="nav-caption">Espacio de trabajo</div>
            <nav aria-label="Navegación principal">
                ${modules.map(([href, icon, label]) =>
                    `<a href="javascript:void(0)" onclick="irAModulo('${href}','${label}')" ${current === href ? 'aria-current="page"' : ''}>
                        <span class="nav-symbol" aria-hidden="true">${icon}</span>${label}
                    </a>`
                ).join('')}
            </nav>
            <div class="sidebar-bottom">
                <strong>VSS S.A.C.</strong>
                RUC 20601234567<br>
                Soles peruanos · PEN
                <button onclick="cerrarSesion()" style="margin-top:10px; width:100%; padding:8px; background:rgba(255,255,255,0.1); color:white; border:1px solid rgba(255,255,255,0.2); border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">
                    🚪 Cerrar Sesión
                </button>
            </div>
        </aside>
    `;

    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    console.log('✅ Sidebar OT construido');
}

// ==================== INICIALIZACIÓN UI ====================
document.addEventListener('DOMContentLoaded', async () => {
    const current = location.pathname.split('/').pop() || 'index.html';

    construirSidebar();

    // Inicializar FAB Menu
    if (typeof initFabMenu === 'function') {
        initFabMenu();
    }

    const main = document.querySelector('.main-content');
    if (main) main.id = 'workspace';

    // Título dinámico
    const title = document.querySelector('.header h1');
    if (title) {
        const found = modules.find(m => m[0] === current);
        if (found) title.textContent = found[2];
    }

    // Contenedor de alertas
    let alerts = document.getElementById('alertContainer');
    if (!alerts && main) {
        alerts = document.createElement('div');
        alerts.id = 'alertContainer';
        main.prepend(alerts);
    }

    // Accesibilidad de formularios
    document.querySelectorAll('.form-group').forEach(g => {
        const label = g.querySelector('label');
        const input = g.querySelector('input,select,textarea');
        if (label && input && input.id) label.htmlFor = input.id;
    });

    // Escape cierra modales
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });
});

// ==================== EXPORTAR CSV ====================
function exportTable(card) {
    const rows = [...card.querySelectorAll('table tr')].filter(r => r.style.display !== 'none');
    const text = rows.map(r => [...r.cells].map(c => {
        let s = c.textContent.trim();
        if (/^[=+@-]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
    }).join(';')).join('\r\n');
    
    const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte-ot.csv';
    a.click();
    URL.revokeObjectURL(url);
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