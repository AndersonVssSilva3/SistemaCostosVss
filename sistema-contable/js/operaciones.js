// ==================== OPERACIONES - ASIENTOS CONTABLES ====================
// Incluye: cascada Cuenta → Subcuenta + Centro de Costo + Dictado por voz

let asientoLineCount = 0;
let planCache = null;
let centrosCache = null;

// ==================== CENTROS DE COSTO ====================
const CENTROS_COSTO = [
    { codigo: '',          nombre: '-- Sin asignar --' },
    { codigo: 'PLANTA',    nombre: '🏭 Planta / Producción' },
    { codigo: 'ADMIN',     nombre: '🏢 Administración' },
    { codigo: 'VENTAS',    nombre: '🛒 Ventas' },
    { codigo: 'LOGISTICA', nombre: '📦 Logística / Almacén' }
];

function opcionesCentroCosto(selected = '') {
    return CENTROS_COSTO.map(c =>
        `<option value="${c.codigo}" ${c.codigo === selected ? 'selected' : ''}>${c.nombre}</option>`
    ).join('');
}

// ==================== INICIALIZACIÓN ====================
async function initOperaciones() {
    planCache = await DB.getAll('planJerarquico');
    if (!planCache || planCache.length === 0) {
        showAlert('⚠️ No hay plan de cuentas cargado. Vaya a Datos Maestros.', 'error');
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
    let maxNum = 0;
    asientos.forEach(a => {
        const m = String(a.numero || '').match(/(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    document.getElementById('asientoNumero').value = 'AS-' + String(maxNum + 1).padStart(3, '0');
}

// ==================== LÍNEAS DE ASIENTO ====================
async function addAsientoLine(cuentaPadre = '', subcuenta = '', debe = '', haber = '', centroCosto = '') {
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
        <select class="line-centro-costo">
            ${opcionesCentroCosto(centroCosto)}
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

// ==================== GUARDAR / LIMPIAR ====================
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
        const centroCosto = line.querySelector('.line-centro-costo').value;
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
        lineas.push({
            cuenta: subcuenta,
            nombre: nombreSub,
            centroCosto: centroCosto || '',   // ← NUEVO
            debe,
            haber
        });
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
    asientos.sort((a, b) => {
        const na = parseInt(String(a.numero || '').replace(/\D/g, '')) || 0;
        const nb = parseInt(String(b.numero || '').replace(/\D/g, '')) || 0;
        return nb - na;
    });

    const tbody = document.getElementById('asientosTable');
    if (!tbody) return;

    if (asientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Aún no hay asientos registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = asientos.map(a => {
        let lineas = a.lineas;
        if (typeof lineas === 'string') {
            try { lineas = JSON.parse(lineas); } catch { lineas = []; }
        }
        if (!Array.isArray(lineas)) lineas = [];

        return lineas.map((l, i) => `
            <tr data-asiento="${textCell(a.numero)}">
                ${i === 0 ? `<td rowspan="${lineas.length}">${textCell(a.numero)}</td>
                <td rowspan="${lineas.length}">${textCell(a.fecha)}</td>
                <td rowspan="${lineas.length}"><span class="status-badge status-valid">${textCell(a.tipo)}</span></td>` : ''}
                <td>${textCell(l.cuenta)} - ${textCell(l.nombre || '')}</td>
                <td>${badgeCentro(l.centroCosto)}</td>
                <td style="text-align:right;">${l.debe > 0 ? Number(l.debe).toFixed(2) : ''}</td>
                <td style="text-align:right;">${l.haber > 0 ? Number(l.haber).toFixed(2) : ''}</td>
                ${i === 0 ? `<td rowspan="${lineas.length}">${textCell((a.glosa || '').substring(0, 50))}${(a.glosa || '').length > 50 ? '…' : ''}</td>
                <td rowspan="${lineas.length}"><span class="status-badge status-valid">${textCell(a.estado || 'validado')}</span></td>
                <td rowspan="${lineas.length}">
                    <div class="action-btns">
                        <button type="button" class="view-btn" onclick="verAsiento(${a.id})">👁️</button>
                        <button type="button" class="delete-btn" onclick="eliminarAsiento(${a.id})">🗑️</button>
                    </div>
                </td>` : ''}
            </tr>
        `).join('');
    }).join('');

    if (document.getElementById('searchAsiento').value || document.getElementById('filterTipo').value) {
        filterAsientos();
    }
}

function badgeCentro(centro) {
    if (!centro) return '<span class="badge badge-sin">—</span>';
    const map = {
        'PLANTA': 'badge-planta',
        'ADMIN': 'badge-admin',
        'VENTAS': 'badge-ventas',
        'LOGISTICA': 'badge-logistica'
    };
    const cls = map[centro] || 'badge-sin';
    return `<span class="badge ${cls}">${centro}</span>`;
}

// ==================== VER / ELIMINAR ====================
async function verAsiento(id) {
    const a = await DB.get('asientos', id);
    if (!a) return;

    let lineas = a.lineas;
    if (typeof lineas === 'string') {
        try { lineas = JSON.parse(lineas); } catch { lineas = []; }
    }

    let html = `<h3>Asiento ${textCell(a.numero)}</h3>
        <p><strong>Fecha:</strong> ${textCell(a.fecha)}</p>
        <p><strong>Tipo:</strong> ${textCell(a.tipo)}</p>
        <p><strong>Glosa:</strong> ${a.glosa}</p>
        <table>
            <tr><th>Cuenta</th><th>Descripción</th><th>Centro Costo</th><th>Debe</th><th>Haber</th></tr>`;
    (lineas || []).forEach(l => {
        html += `<tr>
            <td>${textCell(l.cuenta)}</td>
            <td>${textCell(l.nombre)}</td>
            <td>${badgeCentro(l.centroCosto)}</td>
            <td style="text-align:right;">${Number(l.debe).toFixed(2)}</td>
            <td style="text-align:right;">${Number(l.haber).toFixed(2)}</td>
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
        status.textContent = '🎙️ Escuchando... habla ahora.';
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
    catch (e) { showAlert('No se pudo iniciar el dictado', 'error'); }
}

function detenerDictado() {
    escuchando = false;
    if (recognition) { try { recognition.stop(); } catch (e) {} }
    const btn = document.getElementById('btnMicrofono');
    const status = document.getElementById('dictadoStatus');
    if (btn) { btn.classList.remove('escuchando'); btn.textContent = '🎤'; }
    if (status) status.style.display = 'none';
}

// ==================== SCRIPT DE MIGRACIÓN ====================
// Clasifica automáticamente los 205 asientos existentes por centro de costo
async function migrarAsientosACentroCosto() {
    if (!confirm('Esto clasificará automáticamente TODOS los asientos existentes según reglas predefinidas. ¿Continuar?')) return;

    const asientos = await DB.getAll('asientos');
    let actualizados = 0;

    // Reglas de clasificación automática según glosa/cuenta
    const reglas = [
        { match: /planilla|sueldo|salario|remuneraci/i, cuenta: /^62/, centro: 'PLANTA' },
        { match: /venta|cliente|factura.*venta/i,        cuenta: /^70/, centro: 'VENTAS' },
        { match: /compra|materia|inventario/i,           cuenta: /^(60|61|24)/, centro: 'PLANTA' },
        { match: /deprecia|alquiler|servicio/i,          cuenta: /^(63|65|68)/, centro: 'PLANTA' }
    ];

    for (const a of asientos) {
        let lineas = a.lineas;
        if (typeof lineas === 'string') {
            try { lineas = JSON.parse(lineas); } catch { continue; }
        }
        if (!Array.isArray(lineas)) continue;

        let modificado = false;
        const glosa = (a.glosa || '').toLowerCase();

        lineas.forEach(l => {
            if (l.centroCosto) return; // ya tiene uno

            // Buscar regla aplicable
            for (const r of reglas) {
                if (r.match.test(glosa) && r.cuenta.test(String(l.cuenta || ''))) {
                    l.centroCosto = r.centro;
                    modificado = true;
                    break;
                }
            }

            // Fallback: clasificar por cuenta
            if (!l.centroCosto) {
                const c = String(l.cuenta || '');
                if (c.startsWith('62') || c.startsWith('24') || c.startsWith('60') || c.startsWith('61')) {
                    l.centroCosto = 'PLANTA';
                } else if (c.startsWith('63') || c.startsWith('65') || c.startsWith('68')) {
                    l.centroCosto = 'PLANTA';
                } else if (c.startsWith('70')) {
                    l.centroCosto = 'VENTAS';
                } else if (c.startsWith('94')) {
                    l.centroCosto = 'ADMIN';
                } else if (c.startsWith('95')) {
                    l.centroCosto = 'VENTAS';
                } else {
                    l.centroCosto = 'ADMIN';
                }
                modificado = true;
            }
        });

        if (modificado) {
            await DB.update('asientos', a.id, { lineas });
            actualizados++;
        }
    }

    alert(`✅ Migración completa. Asientos actualizados: ${actualizados} de ${asientos.length}`);
    await renderAsientos();
}

// Exponer en el objeto global
window.migrarAsientosACentroCosto = migrarAsientosACentroCosto;