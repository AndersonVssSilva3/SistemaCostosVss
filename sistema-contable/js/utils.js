// ==================== MODALES ====================
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

document.addEventListener('click', function(e) {
    if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ==================== ALERTAS ====================
function showAlert(msg, type) {
    const container = document.getElementById('alertContainer');
    if (!container) { alert(msg); return; }
    const div = document.createElement('div');
    div.className = 'alert alert-' + type;
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

// ==================== FECHA/HORA ====================
function updateDateTime() {
    const el = document.getElementById('currentDateTime');
    if (!el) return;
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    el.textContent = now.toLocaleDateString('es-PE', options);
}

// ==================== ESCAPADO HTML ====================
function textCell(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==================== NAVEGACIÓN CON VOZ ====================
function irAModulo(url, nombreModulo) {
    console.log('🚀 Navegando a:', url);

    try {
        if ('speechSynthesis' in window) {
            const mensaje = new SpeechSynthesisUtterance(`Ha ingresado al módulo de ${nombreModulo}`);
            mensaje.lang = 'es-PE';
            mensaje.rate = 1.0;
            const voces = window.speechSynthesis.getVoices();
            const vozEspanol = voces.find(v => v.lang.toLowerCase().startsWith('es'));
            if (vozEspanol) mensaje.voice = vozEspanol;
            window.speechSynthesis.speak(mensaje);
        }
    } catch (e) {
        console.warn('Voz no disponible:', e);
    }

    window.location.href = url;
}

function anunciarModulo(nombreModulo, callback) {
    try {
        if ('speechSynthesis' in window) {
            const mensaje = new SpeechSynthesisUtterance(`Ha ingresado al módulo de ${nombreModulo}`);
            mensaje.lang = 'es-PE';
            mensaje.rate = 1.0;
            window.speechSynthesis.speak(mensaje);
        }
    } catch (e) {
        console.warn('Voz no disponible:', e);
    }
    if (callback) callback();
}

// ==================== AUTO-VOZ EN BARRA LATERAL ====================
(function() {
    const mapaModulos = {
        'index.html': 'Resumen',
        'operaciones.html': 'Operaciones',
        'kardex.html': 'Kardex',
        'libros.html': 'Libros Contables',
        'eeff.html': 'Estados Financieros',
        'costos.html': 'Costos',
        'cierre.html': 'Ajustes y Cierre',
        'tablas.html': 'Datos Maestros',
        'utilitarios.html': 'Herramientas y Utilitarios'
    };

    function activarVozEnLinks() {
        const todosLosLinks = document.querySelectorAll('a');
        let contador = 0;
        todosLosLinks.forEach(link => {
            if (link.dataset.vozActivada === 'true') return;
            const href = link.getAttribute('href');
            if (href && mapaModulos[href] && !link.hasAttribute('onclick')) {
                link.dataset.vozActivada = 'true';
                const nombre = mapaModulos[href];
                contador++;
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    irAModulo(href, nombre);
                });
            }
        });
        if (contador > 0) console.log('🔊 Auto-voz activada en', contador, 'enlaces');
    }

    document.addEventListener('DOMContentLoaded', activarVozEnLinks);
    window.addEventListener('load', activarVozEnLinks);
})();