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
    ['costos.html', '◧', 'Costos'],
    ['cierre.html', '▣', 'Ajustes y cierre'],
    ['tablas.html', '☷', 'Datos maestros'],
    ['utilitarios.html', '⚙', 'Herramientas']
];

// ==================== CONSTRUCCIÓN DEL SIDEBAR ====================
function construirSidebar() {
    // Evitar duplicados si ya existe
    if (document.querySelector('.app-sidebar')) return;

    const current = location.pathname.split('/').pop() || 'index.html';

    const sidebarHTML = `
        <a class="skip-link" href="#workspace">Ir al contenido</a>
        <aside class="app-sidebar">
            <a class="app-brand" href="index.html">OMEGA<small>CONTABILIDAD</small></a>
            <div class="nav-caption">Espacio de trabajo</div>
            <nav aria-label="Navegación principal">
                ${modules.map(([href, icon, label]) =>
                    `<a href="javascript:void(0)" onclick="irAModulo('${href}','${label}')" ${current === href ? 'aria-current="page"' : ''}>
                        <span class="nav-symbol" aria-hidden="true">${icon}</span>${label}
                    </a>`
                ).join('')}
            </nav>
            <div class="sidebar-bottom">
                <strong>OMEGA SAC</strong>
                Soles peruanos · PEN<br>
                Datos en Supabase
            </div>
        </aside>
    `;

    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    console.log('✅ Sidebar construido');
}

// ==================== INICIALIZACIÓN UI ====================
document.addEventListener('DOMContentLoaded', async () => {
    const current = location.pathname.split('/').pop() || 'index.html';

    // -------- Barra lateral (PRIMERO, siempre) --------
    construirSidebar();

    const main = document.querySelector('.main-content');
    if (main) main.id = 'workspace';

    // -------- Título --------
    const title = document.querySelector('.header h1');
    if (title) {
        const found = modules.find(m => m[0] === current);
        if (found) title.textContent = found[2];
    }

    // -------- Contenedor de alertas (usando getElementById directo) --------
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
    document.querySelectorAll('.delete-btn').forEach(b => {
        b.title = 'Eliminar registro';
        b.setAttribute('aria-label', 'Eliminar registro');
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
});

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