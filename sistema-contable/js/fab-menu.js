// ==================== FAB MENU RADIAL 3D ====================
// Sistema de navegación entre sistemas

const SISTEMAS = [
    {
        id: 'contable',
        nombre: 'Sistema Contable',
        icono: '📊',
        color: 'blue',
        url: '/sistema-contable/index.html'
    },
    {
        id: 'ordenes',
        nombre: 'Órdenes de Trabajo',
        icono: '🏭',
        color: 'red',
        url: '/sistema-ordenes/index.html'
    },
    {
        id: 'conjuntos',
        nombre: 'Costos Conjuntos',
        icono: '🧬',
        color: 'green',
        url: '/sistema-costos-conjuntos/index.html'
    },
    {
        id: 'abc',
        nombre: 'Costeo ABC',
        icono: '🎯',
        color: 'orange',
        url: '/sistema-costeo-abc/index.html'
    }
];

function initFabMenu() {
    // Evitar duplicados
    if (document.getElementById('fab-menu')) return;

    // Detectar sistema actual
    const pathActual = location.pathname;
    let sistemaActual = null;
    for (const s of SISTEMAS) {
        if (pathActual.includes(s.id) || 
            (s.id === 'contable' && !pathActual.includes('sistema-'))) {
            sistemaActual = s.id;
            break;
        }
    }

    // Crear HTML del FAB
    const fabContainer = document.createElement('div');
    fabContainer.id = 'fab-menu';
    fabContainer.className = 'fab-container';

    // Botón principal
    const botonPrincipal = document.createElement('button');
    botonPrincipal.id = 'fab-toggle';
    botonPrincipal.className = 'fab-main';
    botonPrincipal.innerHTML = '<span class="fab-icon">⊕</span>';
    botonPrincipal.setAttribute('aria-label', 'Cambiar de sistema');
    fabContainer.appendChild(botonPrincipal);

    // Contenedor de bolitas
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'fab-items';
    fabContainer.appendChild(itemsContainer);

    document.body.appendChild(fabContainer);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'fab-overlay';
    document.body.appendChild(overlay);

    // Crear bolitas
    const totalSistemas = SISTEMAS.length;
    const radio = 130; // Radio en píxeles

    SISTEMAS.forEach((sistema, i) => {
        // Calcular ángulo (empezar desde arriba, distribuir circularmente)
        // Rango: desde 180° (izquierda) hasta 270° (arriba), todo el círculo
        const anguloInicio = 90;
        const anguloFin = 180;
        const paso = (anguloFin - anguloInicio) / (totalSistemas - 1);
        const rad = (anguloInicio + paso * i) * Math.PI / 180;

        // Posición de la bolita
        const x = Math.cos(rad) * radio;
        const y = Math.sin(rad) * radio;

        const item = document.createElement('a');
        item.className = 'fab-item';
        item.href = sistema.url;
        item.setAttribute('data-color', sistema.color);
        item.setAttribute('data-sistema', sistema.id);
        item.style.setProperty('--i', i);
        item.style.setProperty('--x', x + 'px');
        item.style.setProperty('--y', y + 'px');

        // Si es el sistema actual, marcarlo
        if (sistemaActual === sistema.id) {
            item.style.opacity = '0.4';
            item.style.pointerEvents = 'none';
        }

        // Icono + Etiqueta
        item.innerHTML = `
            <span>${sistema.icono}</span>
            <span class="fab-label">${sistema.nombre}${sistemaActual === sistema.id ? ' (actual)' : ''}</span>
        `;

        itemsContainer.appendChild(item);
    });

    // Toggle abrir/cerrar
    let abierto = false;

    function toggleFab() {
        abierto = !abierto;
        fabContainer.classList.toggle('open', abierto);
        botonPrincipal.querySelector('.fab-icon').textContent = abierto ? '✕' : '⊕';
    }

    botonPrincipal.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFab();
    });

    overlay.addEventListener('click', toggleFab);

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && abierto) toggleFab();
    });

    console.log('✅ FAB Menu inicializado con', SISTEMAS.length, 'sistemas');
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFabMenu);
} else {
    initFabMenu();
}