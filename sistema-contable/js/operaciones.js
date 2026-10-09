// ==================== OPERACIONES - ASIENTOS CONTABLES ====================
// Incluye: cascada Cuenta → Subcuenta (PCGE Perú) + dictado por voz

let asientoLineCount = 0;
let planCache = null;

// ==================== INICIALIZACIÓN ====================
async function initOperaciones() {
    // Validar que exista plan jerárquico
    planCache = await DB.getAll('planJerarquico');
    if (!planCache || planCache.length === 0) {
        showAlert('⚠️ No hay plan de cuentas cargado. Vaya a Datos Maestros para cargarlo.', 'error');
        return;
    }

    renderAsientos();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('asientoFecha').value = today;

    addAsientoLine();
    addAsientoLine();
    await actualizarNumeroAsiento();
}

async function actualizarNumeroAsiento() {
    const asientos = await DB.getAll('asientos');
    // Usar el máximo número existente + 1 (no el length)
    let maxNum = 0;
    asientos.forEach(a => {
        const m = String(a.numero || '').match(/(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    document.getElementById('asientoNumero').value = 'AS-' + String(maxNum + 1).padStart(3, '0');
}

// ==================== LÍNEAS DE ASIENTO ====================
async function addAsientoLine(cuentaPadre = '', subcuenta = '', debe = '', haber = '') {
    asientoLineCount++;
    if (!planCache) planCache = await DB.getAll('planJerarquico');
    const plan = planCache;

    const lineId = 'line-' + asientoLineCount;

    const opcionesPadre = plan.map(c =>
        `<option value="${textCell(c.codigo)}" ${c.codigo === cuentaPadre ? 'selected' : ''}>${textCell(c.codigo)} - ${textCell(c.nombre)}</option>`
    ).join('');

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
        <input type="number" class="line-debe" placeholder="Debe" step="0.01" min="0"
               value="${debe}" oninput="onImporteInput(this, 'debe')">
        <input type="number" class="line-haber" placeholder="Haber" step="0.01" min="0"
               value="${haber}" oninput="onImporteInput(this, 'haber')">
        <span class="line-name" style="font-size:0.75em; color:#666;"></span>
        <button type="button" class="remove-btn" onclick="removeAsientoLine('${lineId}')">✕</button>
    `;
    document.getElementById('asientoLines').appendChild(div);
    calcTotals();
}

// Evita que se ponga importe en Debe y Haber a la vez
function onImporteInput(input, tipo) {
    const line = input.parentElement;
    if (tipo === 'debe' && parseFloat(input.value) > 0) {
        line.querySelector('.line-haber').value = '';
    }
    if (tipo === 'haber' && parseFloat(input.value) > 0) {
        line.querySelector('.line-debe').value = '';
    }
    calcTotals();
}

async function onCuentaPadreChange(selectPadre) {
    const codigoPadre = selectPadre.value;
    if (!planCache) planCache = await DB.getAll('planJerarquico');
    const plan = planCache;
    const ctaPadre = plan.find(c => c.codigo === codigoPadre);
    const selectSub = selectPadre.parentElement.querySelector('.line-subcuenta');

    if (!ctaPadre) {
        selectSub.innerHTML = '<option value="">-- Subcuenta --</option>';
        await updateLineName(selectSub);
        return;
    }

    selectSub.innerHTML = '<option value="">-- Subcuenta --</option>' +
        ctaPadre.subcuentas.map(s =>
            `<option value="${textCell(s.codigo)}">${textCell(s.codigo)} - ${textCell(s.nombre)}</option>`
        ).join('');

    if (ctaPadre.subcuentas.length === 1) {
        selectSub.value = ctaPadre.subcuentas[0].codigo;
        await updateLineName(selectSub);
    }
}

async function updateLineName(selectSub) {
    const codigoSub = selectSub.value;
    if (!planCache) planCache = await DB.getAll('planJerarquico');
    const plan = planCache;
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
async function guardarAsiento() {
    if (typeof detenerDictado === 'function') detenerDictado();

    const lines = document.querySelectorAll('.asiento-entry');
    if (lines.length === 0) {
        showAlert('Agregue al menos una línea al asiento', 'error');
        return;
    }

    let totalDebe = 0, totalHaber = 0;
    const lineas = [];
    let valido = true;
    const plan = planCache || await DB.getAll('planJerarquico');

    for (const line of lines) {
        const cuentaPadre = line.querySelector('.line-cuenta-padre').value;
        const subcuenta = line.querySelector('.line-subcuenta').value;
        const debe = parseFloat(line.querySelector('.line-debe').value) || 0;
        const haber = parseFloat(line.querySelector('.line-haber').value) || 0;

        if (!subcuenta) { valido = false; continue; }
        if (debe > 0 && haber > 0) {
            showAlert('Una línea no puede tener importe en Debe y Haber a la vez', 'error');
            return;
        }
        if (debe === 0 && haber === 0) {
            showAlert('Cada línea debe tener un importe en Debe o Haber', 'error');
            return;
        }

        let nombreSub = '';
        const cta = plan.find(c => c.codigo === cuentaPadre);
        if (cta) {
            const sub = cta.subcuentas.find(s => s.codigo === subcuenta);
            if (sub) nombreSub = sub.nombre;
        }

        totalDebe += debe;
        totalHaber += haber;
        lineas.push({ cuenta: subcuenta, nombre: nombreSub, debe, haber });
    }

    if (!valido) {
        showAlert('Seleccione una subcuenta en todas las líneas', 'error');
        return;
    }
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
        showAlert('El asiento no está cuadrado', 'error');
        return;
    }
    if (totalDebe === 0) {
        showAlert('El asiento no puede estar en cero', 'error');
        return;
    }

    try {
        const num = document.getElementById('asientoNumero').value;
        await DB.insert('asientos', {
            numero: num,
            fecha: document.getElementById('asientoFecha').value,
            tipo: document.getElementById('asientoTipo').value,
            glosa: document.getElementById('asientoGlosa').value || '(sin glosa)',
            lineas: lineas,
            estado: 'validado'
        });

        showAlert('Asiento ' + num + ' guardado exitosamente', 'success');
        await limpiarAsiento();
        await renderAsientos();
    } catch (error) {
        showAlert('Error al guardar: ' + error.message, 'error');
    }
}

async function limpiarAsiento() {
    if (typeof detenerDictado === 'function') detenerDictado();
    document.getElementById('asientoLines').innerHTML = '';
    document.getElementById('asientoGlosa').value = '';
    asientoLineCount = 0;
    await actualizarNumeroAsiento();
    await addAsientoLine();
    await addAsientoLine();
    calcTotals();
}

// ==================== RENDERIZAR TABLA ====================
async function renderAsientos() {
    let asientos = await DB.getAll('asientos');
    // Ordenar por número descendente
    asientos.sort((a, b) => {
        const na = parseInt(String(a.numero || '').replace(/\D/g, '')) || 0;
        const nb = parseInt(String(b.numero || '').replace(/\D/g, '')) || 0;
        return nb - na;
    });

    const tbody = document.getElementById('asientosTable');
    if (!tbody) return;

    if (asientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Aún no hay asientos registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = asientos.map(a => {
        const totalAsiento = a.lineas.reduce((s, l) => s + Number(l.debe || 0), 0);
        const rows = a.lineas.map((l, i) => `
            <tr data-asiento="${textCell(a.numero)}">
                ${i === 0 ? `<td rowspan="${a.lineas.length}">${textCell(a.numero)}</td>
                <td rowspan="${a.lineas.length}">${textCell(a.fecha)}</td>
                <td rowspan="${a.lineas.length}"><span class="status-badge status-valid">${textCell(a.tipo)}</span></td>` : ''}
                <td>${textCell(l.cuenta)} - ${textCell(l.nombre || '')}</td>
                <td style="text-align:right;">${l.debe > 0 ? l.debe.toFixed(2) : ''}</td>
                <td style="text-align:right;">${l.haber > 0 ? l.haber.toFixed(2) : ''}</td>
                ${i === 0 ? `<td rowspan="${a.lineas.length}">${textCell((a.glosa || '').substring(0, 60))}${(a.glosa || '').length > 60 ? '…' : ''}</td>
                <td rowspan="${a.lineas.length}"><span class="status-badge status-valid">${textCell(a.estado)}</span></td>
                <td rowspan="${a.lineas.length}">
                    <div class="action-btns">
                        <button type="button" class="view-btn" onclick="verAsiento(${a.id})">👁️</button>
                        <button type="button" class="delete-btn" onclick="eliminarAsiento(${a.id})">🗑️</button>
                    </div>
                </td>` : ''}
            </tr>
        `).join('');
        return rows;
    }).join('');

    // Reaplicar filtros si están activos
    if (document.getElementById('searchAsiento').value || document.getElementById('filterTipo').value) {
        filterAsientos();
    }
}

// ==================== VER / ELIMINAR ====================
async function verAsiento(id) {
    const a = await DB.get('asientos', id);
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

async function eliminarAsiento(id) {
    if (!confirm('¿Está seguro de eliminar este asiento?')) return;
    try {
        await DB.delete('asientos', id);
        await renderAsientos();
        await actualizarNumeroAsiento();
        showAlert('Asiento eliminado', 'success');
    } catch (error) {
        showAlert('Error al eliminar: ' + error.message, 'error');
    }
}

// ==================== FILTROS ====================
function filterAsientos() {
    const search = (document.getElementById('searchAsiento').value || '').toLowerCase().trim();
    const tipo = document.getElementById('filterTipo').value;

    // Agrupar filas por asiento
    const rows = [...document.querySelectorAll('#asientosTable tr[data-asiento]')];
    const asientos = {};
    rows.forEach(r => {
        const num = r.dataset.asiento;
        if (!asientos[num]) asientos[num] = [];
        asientos[num].push(r);
    });

    Object.keys(asientos).forEach(num => {
        const grupo = asientos[num];
        const coincideTexto = !search || grupo.some(r => r.textContent.toLowerCase().includes(search));
        const coincideTipo = !tipo || grupo[0].textContent.includes(tipo);
        const mostrar = coincideTexto && coincideTipo;
        grupo.forEach(r => r.style.display = mostrar ? '' : 'none');
    });
}

// ==================== DICTADO POR VOZ ====================
let recognition = null;
let escuchando = false;
let textoBaseGlosa = '';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function toggleDictado() {
    if (!SpeechRecognition) {
        showAlert('Tu navegador no soporta dictado por voz. Usa Chrome, Edge u Opera.', 'error');
        return;
    }
    const btn = document.getElementById('btnMicrofono');
    const status = document.getElementById('dictadoStatus');

    if (escuchando) { detenerDictado(); return; }

    recognition = new SpeechRecognition();
    recognition.lang = 'es-PE';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

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
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) textoFinal += t + ' ';
            else textoInterino += t;
        }
        const textarea = document.getElementById('asientoGlosa');
        if (textoFinal) textoBaseGlosa += textoFinal;
        textarea.value = textoBaseGlosa + textoInterino;
        textarea.scrollTop = textarea.scrollHeight;
    };

    recognition.onerror = function (event) {
        console.error('Error de reconocimiento:', event.error);
        let mensaje = 'Error al dictar: ';
        switch (event.error) {
            case 'not-allowed':
            case 'service-not-allowed': mensaje += 'permiso de micrófono denegado.'; break;
            case 'no-speech': mensaje += 'no se detectó voz.'; break;
            case 'audio-capture': mensaje += 'no se encontró micrófono.'; break;
            case 'network': mensaje += 'problema de red.'; break;
            default: mensaje += event.error;
        }
        showAlert(mensaje, 'error');
        detenerDictado();
    };

    recognition.onend = function () {
        if (escuchando) {
            try { recognition.start(); } catch (e) { detenerDictado(); }
        } else {
            btn.classList.remove('escuchando');
            btn.textContent = '🎤';
            status.style.display = 'none';
        }
    };

    try { recognition.start(); }
    catch (e) { console.error(e); showAlert('No se pudo iniciar el dictado', 'error'); }
}

function detenerDictado() {
    escuchando = false;
    if (recognition) { try { recognition.stop(); } catch (e) {} }
    const btn = document.getElementById('btnMicrofono');
    const status = document.getElementById('dictadoStatus');
    if (btn) { btn.classList.remove('escuchando'); btn.textContent = '🎤'; }
    if (status) status.style.display = 'none';
}

// Auto-init si se carga directamente (sin esperar al DOMContentLoaded del HTML)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initOperaciones === 'function' && document.getElementById('asientoLines')) {
        // Si el HTML llama a initOperaciones explícitamente, no duplicar.
        // Solo se ejecuta si NO hay otro listener ya cargado.
    }
});