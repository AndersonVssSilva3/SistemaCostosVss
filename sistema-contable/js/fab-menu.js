// ==================== FAB MENU RADIAL 3D ====================

const SISTEMAS = [
    {
        id: 'contable',
        nombre: 'Sistema Contable',
        icono: '📊',
        color: 'blue',
        url: '../sistema-contable/index.html'
    },
    {
        id: 'ordenes',
        nombre: 'Órdenes de Trabajo',
        icono: '🏭',
        color: 'red',
        url: '../sistema-ordenes/index.html'
    },
    {
        id: 'conjuntos',
        nombre: 'Costos Conjuntos',
        icono: '🧬',
        color: 'green',
        url: '../sistema-costos-conjuntos/index.html'
    },
    {
        id: 'abc',
        nombre: 'Costeo ABC',
        icono: '🎯',
        color: 'orange',
        url: '../sistema-costeo-abc/index.html'
    }
];

// 🔒 Posiciones FIJAS por sistema (nunca cambian)
const POSICIONES = {
    contable: 180,   // ← izquierda pura
    ordenes: 150,    // ← izquierda-arriba
    conjuntos: 120,  // ← arriba-izquierda
    abc: 90          // ← arriba pura
};

function initFabMenu() {
    if (document.getElementById('fab-menu')) return;

    const pathActual = location.pathname;
    let sistemaActual = 'contable';

    if (pathActual.includes('/sistema-ordenes/')) {
        sistemaActual = 'ordenes';
    } else if (pathActual.includes('/sistema-costos-conjuntos/')) {
        sistemaActual = 'conjuntos';
    } else if (pathActual.includes('/sistema-costeo-abc/')) {
        sistemaActual = 'abc';
    } else if (pathActual.includes('/sistema-contable/')) {
        sistemaActual = 'contable';
    }

    console.log('🔍 Sistema detectado:', sistemaActual);

    const fabContainer = document.createElement('div');
    fabContainer.id = 'fab-menu';
    fabContainer.className = 'fab-container';

    const botonPrincipal = document.createElement('button');
    botonPrincipal.id = 'fab-toggle';
    botonPrincipal.className = 'fab-main';
    botonPrincipal.innerHTML = '<span class="fab-icon">⊕</span>';
    botonPrincipal.setAttribute('aria-label', 'Cambiar de sistema');
    fabContainer.appendChild(botonPrincipal);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'fab-items';
    fabContainer.appendChild(itemsContainer);

    document.body.appendChild(fabContainer);

    const overlay = document.createElement('div');
    overlay.className = 'fab-overlay';
    document.body.appendChild(overlay);

    const radio = 170;

    SISTEMAS.forEach((sistema, i) => {
        // 🔒 Ángulo FIJO por sistema
        const angulo = POSICIONES[sistema.id] ?? 90;
        const rad = (angulo * Math.PI) / 180;

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

        // Si es el sistema actual, solo marcarlo visualmente
        const esActual = (sistemaActual === sistema.id);
        if (esActual) {
            item.classList.add('fab-item-actual');
        }

        item.innerHTML = `
            <span>${sistema.icono}</span>
            <span class="fab-label">${sistema.nombre}${esActual ? ' (actual)' : ''}</span>
        `;

        itemsContainer.appendChild(item);
    });

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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && abierto) toggleFab();
    });

    console.log('✅ FAB Menu inicializado con', SISTEMAS.length, 'sistemas');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFabMenu);
} else {
    initFabMenu();
}