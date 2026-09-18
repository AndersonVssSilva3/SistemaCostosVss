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
// ⚠️ CRÍTICO: textCell debe existir para que funcionen operaciones, libros, tablas, etc.
function textCell(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ⚠️ NO declarar const esc aquí — professional.js ya lo declara
// window.esc = textCell;  // ← NO, eliminar

// ==================== LECTOR DE VOZ ====================
function anunciarModulo(nombreModulo, callback) {
    if (!('speechSynthesis' in window)) {
        if (callback) callback();
        return;
    }
    const texto = `Ha ingresado al módulo de ${nombreModulo}`;
    const hablar = () => {
        const mensaje = new SpeechSynthesisUtterance(texto);
        mensaje.lang = 'es-PE';
        mensaje.rate = 1.0;
        const voces = window.speechSynthesis.getVoices();
        const vozEspanol = voces.find(v => v.lang.toLowerCase().startsWith('es'));
        if (vozEspanol) mensaje.voice = vozEspanol;
        mensaje.onend = function() { if (callback) callback(); };
        mensaje.onerror = function() { if (callback) callback(); };
        window.speechSynthesis.speak(mensaje);
    };
    const vocesActuales = window.speechSynthesis.getVoices();
    if (vocesActuales.length > 0) {
        hablar();
    } else {
        let yaHablo = false;
        const alCargarVoces = () => {
            if (yaHablo) return;
            yaHablo = true;
            hablar();
        };
        window.speechSynthesis.onvoiceschanged = alCargarVoces;
        setTimeout(alCargarVoces, 2000);
    }
}

// ==================== NAVEGACIÓN CON VOZ ====================
function irAModulo(url, nombreModulo) {
    let yaNavego = false;
    const navegar = () => {
        if (yaNavego) return;
        yaNavego = true;
        window.location.href = url;
    };
    anunciarModulo(nombreModulo, navegar);
    setTimeout(navegar, 2500);
}

// ==================== AUTO-VOZ EN BARRA LATERAL ====================
(function() {
    const mapaModulos = {
        'index.html': 'Resumen',
        'operaciones.html': 'Operaciones',
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
            if (href && mapaModulos[href]) {
                link.dataset.vozActivada = 'true';
                const nombre = mapaModulos[href];
                contador++;
                link.addEventListener('click', function(e) {
                    if (link.hasAttribute('onclick')) return;
                    e.preventDefault();
                    irAModulo(href, nombre);
                });
            }
        });
        if (contador > 0) console.log('🔊 Auto-voz activada en', contador, 'enlaces');
    }

    document.addEventListener('DOMContentLoaded', activarVozEnLinks);
    const observer = new MutationObserver(activarVozEnLinks);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', activarVozEnLinks);
})();