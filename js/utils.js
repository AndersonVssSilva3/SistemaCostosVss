// ==================== MODALES ====================
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

// Cerrar modales al hacer clic fuera
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

// ==================== LECTOR DE VOZ (ACCESIBILIDAD) ====================
// ==================== LECTOR DE VOZ (ACCESIBILIDAD) ====================
function anunciarModulo(nombreModulo, callback) {
    console.log('🔊 Intentando anunciar:', nombreModulo);

    if (!('speechSynthesis' in window)) {
        console.warn('❌ Tu navegador no soporta síntesis de voz.');
        if (callback) callback();
        return;
    }

    const texto = `Ha ingresado al módulo de ${nombreModulo}`;

    // Función que realmente habla
    const hablar = () => {
        const mensaje = new SpeechSynthesisUtterance(texto);
        mensaje.lang = 'es-PE';
        mensaje.rate = 1.0;
        mensaje.pitch = 1.0;
        mensaje.volume = 1.0;

        const voces = window.speechSynthesis.getVoices();
        console.log('🎙️ Voces al hablar:', voces.length);

        const vozEspanol = voces.find(v => v.lang.toLowerCase().startsWith('es'));
        if (vozEspanol) {
            mensaje.voice = vozEspanol;
            console.log('✅ Voz seleccionada:', vozEspanol.name);
        }

        mensaje.onend = function() {
            console.log('✅ Voz terminada');
            if (callback) callback();
        };
        mensaje.onerror = function(e) {
            console.error('❌ Error de voz:', e.error);
            if (callback) callback();
        };

        window.speechSynthesis.speak(mensaje);
        console.log('▶️ speak() ejecutado');
    };

    // Si ya hay voces cargadas, hablar de inmediato
    const vocesActuales = window.speechSynthesis.getVoices();
    if (vocesActuales.length > 0) {
        hablar();
    } else {
        // Si no, esperar al evento voiceschanged
        console.log('⏳ Esperando a que carguen las voces...');
        let yaHablo = false;
        const alCargarVoces = () => {
            if (yaHablo) return;
            yaHablo = true;
            console.log('✅ Voces cargadas:', window.speechSynthesis.getVoices().length);
            hablar();
        };
        window.speechSynthesis.onvoiceschanged = alCargarVoces;

        // Timeout de seguridad: si en 2s no cargan, intentar hablar igual
        setTimeout(alCargarVoces, 2000);
    }
}
// ==================== NAVEGACIÓN CON VOZ ====================
function irAModulo(url, nombreModulo) {
    console.log('🚀 irAModulo llamado:', url, nombreModulo);

    let yaNavego = false;
    const navegar = () => {
        if (yaNavego) return;
        yaNavego = true;
        console.log('➡️ Navegando a:', url);
        window.location.href = url;
    };

    anunciarModulo(nombreModulo, navegar);
    setTimeout(navegar, 2500); // Seguridad
}

// ==================== AUTO-VOZ EN BARRA LATERAL (con MutationObserver) ====================
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
            // Evitar procesar el mismo enlace dos veces
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

        if (contador > 0) {
            console.log('🔊 Auto-voz activada en', contador, 'enlaces');
        }
    }

    // Ejecutar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', activarVozEnLinks);

    // Observar cambios en el DOM (por si professional.js inserta la barra después)
    const observer = new MutationObserver(function() {
        activarVozEnLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // También intentar al cargar la ventana completa
    window.addEventListener('load', activarVozEnLinks);
})();