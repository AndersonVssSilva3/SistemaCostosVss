// ==================== OPERACIONES - ASIENTOS CONTABLES ====================
// Incluye: cascada Cuenta → Subcuenta (PCGE Perú) + dictado por voz

let asientoLineCount = 0;

// ==================== INICIALIZACIÓN ====================
function initOperaciones() {
    renderAsientos();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('asientoFecha').value = today;
    addAsientoLine();
    addAsientoLine();
    const asientos = DB.getAll('asientos');
    document.getElementById('asientoNumero').value = 'AS-' + String(asientos.length + 1).padStart(3, '0');
}

// ==================== LÍNEAS DE ASIENTO (CUENTA + SUBCUENTA) ====================
function addAsientoLine(cuentaPadre = '', subcuenta = '', debe = '', haber = '') {
    asientoLineCount++;
    const plan = DB.getAll('planJerarquico');
    const lineId = 'line-' + asientoLineCount;

    // Opciones del select de cuentas padre
    const opcionesPadre = plan.map(c =>
        `<option value="${textCell(c.codigo)}" ${c.codigo === cuentaPadre ? 'selected' : ''}>${textCell(c.codigo)} - ${textCell(c.nombre)}</option>`
    ).join('');

    // Subcuentas iniciales (si ya viene con cuenta padre seleccionada)
    let opcionesSub = '<option value="">-- Subcuenta --</option>';
    if (cuentaPadre) {
        const ctaPadre = plan.find(c => c.codigo === cuentaPadre);
        if (ctaPadre) {
            opcionesSub += ctaPadre.subcuentas.map(s =>
                `<option value="${textCell(s.codigo)}" ${s.codigo === subcuenta ? 'selected' : ''}>${textCell(s.codigo)} - ${textCell(s.nombre)}</option>`
            ).join('');
        }
    }

    const div = document.createElement('div');
    div.className = 'asiento-entry';
    div.id = lineId;
    div.innerHTML = `
        <select class="line-cuenta-padre" onchange="onCuentaPadreChange(this)">
            <option value="">-- Cuenta --</option>
            ${opcionesPadre}
        </select>
        <select class="line-subcuenta" onchange="updateLineName(this)">
            ${opcionesSub}
        </select>
        <input type="number" class="line-debe" placeholder="Debe" step="0.01" value="${debe}" oninput="calcTotals()">
        <input type="number" class="line-haber" placeholder="Haber" step="0.01" value="${haber}" oninput="calcTotals()">
        <span class="line-name" style="font-size:0.75em; color:#666;"></span>
        <button class="remove-btn" onclick="removeAsientoLine('${lineId}')">✕</button>
    `;
    document.getElementById('asientoLines').appendChild(div);
    calcTotals();
}

// Cuando cambia la cuenta padre, se llena la lista de subcuentas
function onCuentaPadreChange(selectPadre) {
    const codigoPadre = selectPadre.value;
    const plan = DB.getAll('planJerarquico');
    const ctaPadre = plan.find(c => c.codigo === codigoPadre);
    const selectSub = selectPadre.parentElement.querySelector('.line-subcuenta');

    if (!ctaPadre) {
        selectSub.innerHTML = '<option value="">-- Subcuenta --</option>';
        updateLineName(selectSub);
        return;
    }

    selectSub.innerHTML = '<option value="">-- Subcuenta --</option>' +
        ctaPadre.subcuentas.map(s => `<option value="${textCell(s.codigo)}">${textCell(s.codigo)} - ${textCell(s.nombre)}</option>`).join('');

    // Si solo hay una subcuenta, seleccionarla automáticamente
    if (ctaPadre.subcuentas.length === 1) {
        selectSub.value = ctaPadre.subcuentas[0].codigo;
        updateLineName(selectSub);
    }
}

// Actualiza la etiqueta con el nombre de la subcuenta seleccionada
function updateLineName(selectSub) {
    const codigoSub = selectSub.value;
    const plan = DB.getAll('planJerarquico');
    const nameSpan = selectSub.parentElement.querySelector('.line-name');
    let nombreCompleto = '';

    for (const cta of plan) {
        const sub = cta.subcuentas.find(s => s.codigo === codigoSub);
        if (sub) {
            nombreCompleto = `${textCell(cta.nombre)} / ${textCell(sub.nombre)}`;
            break;
        }
    }
    if (nameSpan) nameSpan.textContent = nombreCompleto;
}

function removeAsientoLine(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    calcTotals();
}

function calcTotals() {
    let totalDebe = 0, totalHaber = 0;
    document.querySelectorAll('.asiento-entry').forEach(line => {
        totalDebe += parseFloat(line.querySelector('.line-debe').value) || 0;
        totalHaber += parseFloat(line.querySelector('.line-haber').value) || 0;
    });
    document.getElementById('totalDebe').textContent = totalDebe.toFixed(2);
    document.getElementById('totalHaber').textContent = totalHaber.toFixed(2);
    const diff = Math.abs(totalDebe - totalHaber);
    document.getElementById('diferencia').textContent = diff.toFixed(2);

    const check = document.getElementById('balanceCheck');
    if (diff < 0.01 && totalDebe > 0) {
        check.className = 'balance-check balance-ok';
        check.textContent = '✅ El asiento está cuadrado';
    } else {
        check.className = 'balance-check balance-error';
        check.textContent = '❌ El asiento NO está cuadrado. Diferencia: S/ ' + diff.toFixed(2);
    }
}

// ==================== GUARDAR / LIMPIAR ASIENTO ====================
function guardarAsiento() {
    if (typeof detenerDictado === 'function') detenerDictado();

    const lines = document.querySelectorAll('.asiento-entry');
    if (lines.length === 0) {
        showAlert('Agregue al menos una línea al asiento', 'error');
        return;
    }

    let totalDebe = 0, totalHaber = 0;
    const lineas = [];
    let valido = true;
    const plan = DB.getAll('planJerarquico');

    lines.forEach(line => {
        const cuentaPadre = line.querySelector('.line-cuenta-padre').value;
        const subcuenta = line.querySelector('.line-subcuenta').value;
        const debe = parseFloat(line.querySelector('.line-debe').value) || 0;
        const haber = parseFloat(line.querySelector('.line-haber').value) || 0;

        if (!subcuenta) { valido = false; return; }

        // Buscar el nombre de la subcuenta
        let nombreSub = '';
        const cta = plan.find(c => c.codigo === cuentaPadre);
        if (cta) {
            const sub = cta.subcuentas.find(s => s.codigo === subcuenta);
            if (sub) nombreSub = sub.nombre;
        }

        totalDebe += debe;
        totalHaber += haber;
        lineas.push({ cuenta: subcuenta, nombre: nombreSub, debe, haber });
    });

    if (!valido) {
        showAlert('Seleccione una subcuenta en todas las líneas', 'error');
        return;
    }
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
        showAlert('El asiento no está cuadrado. Debe = Haber', 'error');
        return;
    }

    const asientos = DB.getAll('asientos');
    const num = 'AS-' + String(asientos.length + 1).padStart(3, '0');
    asientos.push({
        id: Date.now(),
        numero: num,
        fecha: document.getElementById('asientoFecha').value,
        tipo: document.getElementById('asientoTipo').value,
        glosa: document.getElementById('asientoGlosa').value,
        lineas,
        estado: 'validado'
    });
    DB.set('asientos', asientos);

    showAlert('Asiento ' + num + ' guardado exitosamente', 'success');
    limpiarAsiento();
    renderAsientos();
}

function limpiarAsiento() {
    if (typeof detenerDictado === 'function') detenerDictado();
    document.getElementById('asientoLines').innerHTML = '';
    document.getElementById('asientoGlosa').value = '';
    asientoLineCount = 0;
    const asientos = DB.getAll('asientos');
    document.getElementById('asientoNumero').value = 'AS-' + String(asientos.length + 1).padStart(3, '0');
    addAsientoLine();
    addAsientoLine();
    calcTotals();
}

// ==================== RENDERIZAR TABLA DE ASIENTOS ====================
function renderAsientos() {
    const asientos = DB.getAll('asientos');
    const tbody = document.getElementById('asientosTable');
    if (!tbody) return;

    tbody.innerHTML = asientos.map(a =>
        a.lineas.map((l, i) => `
            <tr>
                ${i === 0 ? `<td rowspan="${a.lineas.length}">${textCell(a.numero)}</td>
                <td rowspan="${a.lineas.length}">${textCell(a.fecha)}</td>
                <td rowspan="${a.lineas.length}"><span class="status-badge status-${a.tipo === 'normal' ? 'valid' : 'pending'}">${textCell(a.tipo)}</span></td>` : ''}
                <td>${textCell(l.cuenta)} - ${textCell(l.nombre)}</td>
                <td style="text-align:right;">${l.debe > 0 ? l.debe.toFixed(2) : ''}</td>
                <td style="text-align:right;">${l.haber > 0 ? l.haber.toFixed(2) : ''}</td>
                ${i === 0 ? `<td rowspan="${a.lineas.length}">${(a.glosa || '').substring(0, 60)}...</td>
                <td rowspan="${a.lineas.length}"><span class="status-badge status-valid">${textCell(a.estado)}</span></td>
                <td rowspan="${a.lineas.length}">
                    <div class="action-btns">
                        <button class="view-btn" onclick="verAsiento(${a.id})">👁️</button>
                        <button class="delete-btn" onclick="eliminarAsiento(${a.id})">🗑️</button>
                    </div>
                </td>` : ''}
            </tr>
        `).join('')
    ).join('');
}

// ==================== VER / ELIMINAR ASIENTO ====================
function verAsiento(id) {
    const asientos = DB.getAll('asientos');
    const a = asientos.find(x => x.id === id);
    if (!a) return;

    let html = `<h3>Asiento ${textCell(a.numero)}</h3>
        <p><strong>Fecha:</strong> ${textCell(a.fecha)}</p>
        <p><strong>Tipo:</strong> ${textCell(a.tipo)}</p>
        <p><strong>Glosa:</strong> ${a.glosa}</p>
        <table>
            <tr><th>Cuenta</th><th>Descripción</th><th>Debe</th><th>Haber</th></tr>`;
    a.lineas.forEach(l => {
        html += `<tr>
            <td>${textCell(l.cuenta)}</td>
            <td>${textCell(l.nombre)}</td>
            <td style="text-align:right;">${l.debe.toFixed(2)}</td>
            <td style="text-align:right;">${l.haber.toFixed(2)}</td>
        </tr>`;
    });
    html += '</table>';

    const container = document.getElementById('alertContainer');
    container.innerHTML = `<div class="alert alert-info">${html}</div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminarAsiento(id) {
    if (!confirm('¿Está seguro de eliminar este asiento?')) return;
    let asientos = DB.getAll('asientos');
    asientos = asientos.filter(a => a.id !== id);
    DB.set('asientos', asientos);
    renderAsientos();
    showAlert('Asiento eliminado', 'success');
}

// ==================== FILTROS ====================
function filterAsientos() {
    const search = document.getElementById('searchAsiento').value.toLowerCase();
    const rows = document.querySelectorAll('#asientosTable tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
}

// ==================== DICTADO POR VOZ (Web Speech API) ====================
let recognition = null;
let escuchando = false;
let textoBaseGlosa = '';

// Verificar soporte del navegador
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function toggleDictado() {
    if (!SpeechRecognition) {
        showAlert('Tu navegador no soporta dictado por voz. Usa Chrome, Edge u Opera.', 'error');
        return;
    }

    const btn = document.getElementById('btnMicrofono');
    const status = document.getElementById('dictadoStatus');

    if (escuchando) {
        detenerDictado();
        return;
    }

    // Inicializar reconocimiento
    recognition = new SpeechRecognition();
    recognition.lang = 'es-PE';           // Español (Perú)
    recognition.continuous = true;         // No se detiene al hacer pausas
    recognition.interimResults = true;     // Muestra resultados parciales
    recognition.maxAlternatives = 1;

    // Guardar el texto que ya existía en el textarea
    textoBaseGlosa = document.getElementById('asientoGlosa').value;

    recognition.onstart = function () {
        escuchando = true;
        btn.classList.add('escuchando');
        btn.textContent = '⏹️';
        status.style.display = 'block';
        status.textContent = '🎙️ Escuchando... habla ahora. Haz clic de nuevo para detener.';
    };

    recognition.onresult = function (event) {
        let textoFinal = '';
        let textoInterino = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcripcion = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                textoFinal += transcripcion + ' ';
            } else {
                textoInterino += transcripcion;
            }
        }

        // Concatenar texto base + lo que ya se dictó + lo que se está dictando
        const textarea = document.getElementById('asientoGlosa');
        if (textoFinal) {
            textoBaseGlosa += textoFinal;
        }
        textarea.value = textoBaseGlosa + textoInterino;
        textarea.scrollTop = textarea.scrollHeight;
    };

    recognition.onerror = function (event) {
        console.error('Error de reconocimiento:', event.error);
        let mensaje = 'Error al dictar: ';
        switch (event.error) {
            case 'not-allowed':
            case 'service-not-allowed':
                mensaje += 'permiso de micrófono denegado.';
                break;
            case 'no-speech':
                mensaje += 'no se detectó voz.';
                break;
            case 'audio-capture':
                mensaje += 'no se encontró micrófono.';
                break;
            case 'network':
                mensaje += 'problema de red.';
                break;
            default:
                mensaje += event.error;
        }
        showAlert(mensaje, 'error');
        detenerDictado();
    };

    recognition.onend = function () {
        // Si seguimos en modo "escuchando", reiniciamos (para que sea continuo)
        if (escuchando) {
            try { recognition.start(); } catch (e) { detenerDictado(); }
        } else {
            btn.classList.remove('escuchando');
            btn.textContent = '🎤';
            status.style.display = 'none';
        }
    };

    try {
        recognition.start();
    } catch (e) {
        console.error(e);
        showAlert('No se pudo iniciar el dictado', 'error');
    }
}

function detenerDictado() {
    escuchando = false;
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }
    const btn = document.getElementById('btnMicrofono');
    const status = document.getElementById('dictadoStatus');
    if (btn) {
        btn.classList.remove('escuchando');
        btn.textContent = '🎤';
    }
    if (status) status.style.display = 'none';
}