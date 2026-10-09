// ==================== MAYOR DE FÁBRICA (v2 - con agrupación) ====================

function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function fmtNum(n) {
    return Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

async function initMayorFabrica() {
    console.log('📊 Iniciando Mayor de Fábrica...');
    try {
        await renderMayorFabrica();
        console.log('✅ Mayor de Fábrica listo');
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderMayorFabrica() {
    const [ordenes, mp, mo, cif, ventas, catalogoMP, kardex] = await Promise.all([
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otMateriaPrima'),
        DB.getAll('otManoObra'),
        DB.getAll('otCif'),
        DB.getAll('otVentas'),
        DB.getAll('materiaPrima'),
        DB.getAll('kardex')
    ]);

    const container = document.getElementById('mayorGrid');
    if (!container) return;

    const otMap = {};
    ordenes.forEach(o => otMap[o.id] = o);

    // ==================== AGRUPAR CIF POR CONCEPTO ====================
    const cifAgrupado = {};
    cif.forEach(c => {
        const key = c.concepto;
        if (!cifAgrupado[key]) {
            cifAgrupado[key] = {
                concepto: c.concepto,
                total: 0,
                detalle: []  // { ot, monto }
            };
        }
        const ot = otMap[c.ot_id];
        cifAgrupado[key].total += Number(c.monto || 0);
        cifAgrupado[key].detalle.push({
            ot: ot ? ot.numero_ot : '—',
            monto: Number(c.monto || 0)
        });
    });

    // ==================== AGRUPAR MOD POR OT ====================
    const modAgrupado = {};
    mo.forEach(m => {
        const ot = otMap[m.ot_id];
        const key = ot ? ot.numero_ot : '—';
        if (!modAgrupado[key]) {
            modAgrupado[key] = { ot: key, total: 0, detalle: [] };
        }
        modAgrupado[key].total += Number(m.monto || 0);
        modAgrupado[key].detalle.push({
            tipo: m.tipo,
            monto: Number(m.monto || 0)
        });
    });

    // ==================== CONSTRUIR CUENTAS T ====================
    const cuentasT = [];

    // ───── CUENTA 24: UNA CUENTA T POR CADA MATERIA PRIMA ─────
    // Debe: saldo inicial + compras (entradas del kardex) · Haber: consumos en cada OT
    [...catalogoMP]
        .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''))
        .forEach(m => {
            const { inicial, entradas, salidas } = movimientosKardexMP(m, kardex, mp, ordenes);
            const debe = [];
            if (inicial.total !== 0) debe.push({ tipo: 'simple', detalle: 'Saldo inicial', monto: inicial.total });
            entradas.forEach(e => debe.push({
                tipo: 'simple',
                detalle: `Compra ${e.documento || e.fecha} · ${fmtNum(e.cantidad)} ${m.unidad || 'und'}`,
                monto: e.total
            }));
            const haber = salidas.map(s => ({
                tipo: 'simple',
                detalle: `${s.documento} · ${fmtNum(s.cantidad)} ${m.unidad || 'und'}`,
                monto: s.total
            }));
            if (debe.length === 0 && haber.length === 0) return;
            cuentasT.push({
                codigo: '24',
                nombre: `Materia Prima ${m.codigo} · ${m.descripcion || ''}`,
                debe,
                haber
            });
        });

    // ───── CUENTA 62: GASTOS DE PERSONAL ─────
    const moDebe = Object.values(modAgrupado).map(g => ({
        tipo: 'agrupado',
        detalle: g.ot,
        monto: g.total,
        hijos: g.detalle.map(d => ({
            detalle: d.tipo,
            monto: d.monto
        }))
    }));

    cuentasT.push({
        codigo: '62',
        nombre: 'Gastos de Personal',
        debe: moDebe,
        haber: []
    });

    // ───── CUENTA 63: SERVICIOS DE TERCEROS ─────
    const cifDebe = Object.values(cifAgrupado)
        .sort((a, b) => b.total - a.total)
        .map(g => ({
            tipo: 'agrupado',
            detalle: g.concepto,
            monto: g.total,
            hijos: g.detalle.map(d => ({
                detalle: d.ot,
                monto: d.monto
            }))
        }));

    cuentasT.push({
        codigo: '63',
        nombre: 'Servicios de Terceros (CIF como gasto)',
        debe: cifDebe,
        haber: []
    });

    // ───── CUENTA 923: CIF EN EL MAYOR DE FÁBRICA ─────
    // Debe: el gasto de cada concepto (con su inductor) · Haber: el total aplicado a cada OT → cuenta 23
    const cifPorOT = {};
    cif.forEach(c => {
        const ot = otMap[c.ot_id];
        const key = ot ? ot.numero_ot : '—';
        if (!cifPorOT[key]) cifPorOT[key] = { total: 0, hijos: [] };
        cifPorOT[key].total += Number(c.monto || 0);
        cifPorOT[key].hijos.push({ detalle: `${c.concepto} (${c.inductor || 's/inductor'})`, monto: Number(c.monto || 0) });
    });

    cuentasT.push({
        codigo: '923',
        nombre: 'Costos Indirectos de Fabricación',
        debe: Object.values(cifAgrupado)
            .sort((a, b) => b.total - a.total)
            .map(g => ({
                tipo: 'simple',
                detalle: `${g.concepto} · ${(cif.find(c => c.concepto === g.concepto) || {}).inductor || 's/inductor'}`,
                monto: g.total
            })),
        haber: Object.keys(cifPorOT).sort().map(k => ({
            tipo: 'agrupado',
            detalle: `→ 23 ${k}`,
            monto: cifPorOT[k].total,
            hijos: cifPorOT[k].hijos
        }))
    });

    // ───── CUENTA 23: PRODUCTOS EN PROCESO ─────
    const ppDebe = [];
    ordenes.forEach(ot => {
        const totalOT = Number(ot.costo_total) || 0;
        if (totalOT === 0) return;

        const hijos = [];
        mp.filter(m => m.ot_id === ot.id).forEach(m => {
            hijos.push({ detalle: `MP ${m.materia_prima_codigo}`, monto: Number(m.costo_total) });
        });
        mo.filter(m => m.ot_id === ot.id).forEach(m => {
            hijos.push({ detalle: m.tipo, monto: Number(m.monto) });
        });
        cif.filter(c => c.ot_id === ot.id).forEach(c => {
            hijos.push({ detalle: c.concepto, monto: Number(c.monto) });
        });

        ppDebe.push({
            tipo: 'agrupado',
            detalle: ot.numero_ot,
            monto: totalOT,
            hijos: hijos
        });
    });

    const ppHaber = ordenes
        .filter(o => o.estado === 'terminada' && Number(o.costo_total) > 0)
        .map(o => ({
            tipo: 'simple',
            detalle: `PT ${o.numero_ot}`,
            monto: Number(o.costo_total)
        }));

    cuentasT.push({
        codigo: '23',
        nombre: 'Productos en Proceso',
        debe: ppDebe,
        haber: ppHaber
    });

    // ───── CUENTA 21: PRODUCTOS TERMINADOS ─────
    const ptDebe = ordenes
        .filter(o => o.estado === 'terminada' && Number(o.costo_total) > 0)
        .map(o => ({
            tipo: 'simple',
            detalle: `PT ${o.numero_ot}`,
            monto: Number(o.costo_total)
        }));

    const ptHaber = ventas
        .map(v => {
            const ot = otMap[v.ot_id];
            return {
                tipo: 'simple',
                detalle: `CV ${ot ? ot.numero_ot : '—'}`,
                monto: ot ? Number(ot.costo_total) : 0
            };
        })
        .filter(h => h.monto > 0);

    cuentasT.push({
        codigo: '21',
        nombre: 'Productos Terminados',
        debe: ptDebe,
        haber: ptHaber
    });

    // ───── CUENTA 69: COSTO DE VENTAS ─────
    const cvDebe = ventas
        .map(v => {
            const ot = otMap[v.ot_id];
            return {
                tipo: 'simple',
                detalle: `CV ${ot ? ot.numero_ot : '—'}`,
                monto: ot ? Number(ot.costo_total) : 0
            };
        })
        .filter(d => d.monto > 0);

    cuentasT.push({
        codigo: '69',
        nombre: 'Costo de Ventas',
        debe: cvDebe,
        haber: []
    });

    // ───── CUENTA 70: VENTAS ─────
    const ventasHaber = ventas.map(v => {
        const ot = otMap[v.ot_id];
        return {
            tipo: 'simple',
            detalle: `Venta ${ot ? ot.numero_ot : '—'}`,
            monto: Number(v.monto || 0)
        };
    });

    cuentasT.push({
        codigo: '70',
        nombre: 'Ventas',
        debe: [],
        haber: ventasHaber
    });

    // ==================== RENDERIZAR ====================
    let rowIdCounter = 0;

    container.innerHTML = cuentasT.map((cta, ctaIndex) => {
        const totalDebe = cta.debe.reduce((s, d) => s + d.monto, 0);
        const totalHaber = cta.haber.reduce((s, h) => s + h.monto, 0);
        const saldo = totalDebe - totalHaber;
        const esDeudor = saldo >= 0;

        const renderFila = (fila, lado) => {
            const id = `fila-${ctaIndex}-${lado}-${rowIdCounter++}`;

            if (fila.tipo === 'agrupado') {
                return `
                    <div class="cuenta-t-row cuenta-t-row-agrupado" onclick="toggleFila('${id}')">
                        <span class="cuenta-t-row-arrow" id="${id}-arrow">▶</span>
                        <span class="cuenta-t-row-detalle">${textCell(fila.detalle)}</span>
                        <span class="cuenta-t-row-monto">${fmtNum(fila.monto)}</span>
                    </div>
                    <div class="cuenta-t-hijos" id="${id}-hijos" style="display:none;">
                        ${fila.hijos.map(h => `
                            <div class="cuenta-t-row cuenta-t-row-hijo">
                                <span class="cuenta-t-row-detalle">${textCell(h.detalle)}</span>
                                <span class="cuenta-t-row-monto">${fmtNum(h.monto)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                return `
                    <div class="cuenta-t-row">
                        <span class="cuenta-t-row-detalle">${textCell(fila.detalle)}</span>
                        <span class="cuenta-t-row-monto">${fmtNum(fila.monto)}</span>
                    </div>
                `;
            }
        };

        return `
            <div class="cuenta-t">
                <div class="cuenta-t-header">
                    <span class="cuenta-t-codigo">${cta.codigo}</span>
                    <span class="cuenta-t-nombre">${textCell(cta.nombre)}</span>
                </div>
                <div class="cuenta-t-body">
                    <div class="cuenta-t-col">
                        <div class="cuenta-t-titulo">DEBE</div>
                        ${cta.debe.length > 0 
                            ? cta.debe.map(d => renderFila(d, 'debe')).join('')
                            : '<div class="cuenta-t-empty">—</div>'}
                        <div class="cuenta-t-row cuenta-t-total">
                            <span>TOTAL</span>
                            <span>${fmtNum(totalDebe)}</span>
                        </div>
                    </div>
                    <div class="cuenta-t-col">
                        <div class="cuenta-t-titulo">HABER</div>
                        ${cta.haber.length > 0 
                            ? cta.haber.map(h => renderFila(h, 'haber')).join('')
                            : '<div class="cuenta-t-empty">—</div>'}
                        <div class="cuenta-t-row cuenta-t-total">
                            <span>TOTAL</span>
                            <span>${fmtNum(totalHaber)}</span>
                        </div>
                    </div>
                </div>
                <div class="cuenta-t-saldo ${esDeudor ? 'saldo-deudor' : 'saldo-acreedor'}">
                    <span>Saldo ${esDeudor ? 'Deudor' : 'Acreedor'}:</span>
                    <strong>${fmtNum(Math.abs(saldo))}</strong>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== TOGGLE DE FILAS COLAPSABLES ====================
function toggleFila(id) {
    const hijos = document.getElementById(id + '-hijos');
    const arrow = document.getElementById(id + '-arrow');
    
    if (!hijos) return;
    
    const abierto = hijos.style.display !== 'none';
    hijos.style.display = abierto ? 'none' : 'block';
    
    if (arrow) {
        arrow.textContent = abierto ? '▶' : '▼';
        arrow.classList.toggle('arrow-abierto', !abierto);
    }
}

// ==================== EXPORTAR ====================
async function exportarMayorCSV() {
    const [mp, mo, cif, ventas] = await Promise.all([
        DB.getAll('otMateriaPrima'),
        DB.getAll('otManoObra'),
        DB.getAll('otCif'),
        DB.getAll('otVentas')
    ]);

    let csv = '\uFEFFCUENTA;CONCEPTO;MONTO\n';

    // MP
    const mpAgrup = {};
    mp.forEach(m => {
        mpAgrup[m.materia_prima_codigo] = (mpAgrup[m.materia_prima_codigo] || 0) + Number(m.costo_total || 0);
    });
    Object.entries(mpAgrup).forEach(([k, v]) => {
        csv += `24 Materia Prima;"${k}";${v}\n`;
    });

    // MOD
    const modAgrup = {};
    mo.forEach(m => {
        modAgrup[m.tipo] = (modAgrup[m.tipo] || 0) + Number(m.monto || 0);
    });
    Object.entries(modAgrup).forEach(([k, v]) => {
        csv += `62 Gastos Personal;"${k}";${v}\n`;
    });

    // CIF
    const cifAgrup = {};
    cif.forEach(c => {
        cifAgrup[c.concepto] = (cifAgrup[c.concepto] || 0) + Number(c.monto || 0);
    });
    Object.entries(cifAgrup).forEach(([k, v]) => {
        csv += `63 Servicios;"${k}";${v}\n`;
    });

    // Ventas
    const totalVentas = ventas.reduce((s, v) => s + Number(v.monto || 0), 0);
    csv += `70 Ventas;Total;${totalVentas}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mayor-fabrica.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}