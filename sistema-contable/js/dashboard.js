// ==================== DASHBOARD - RESUMEN GENERAL ====================
// Dashboard principal con métricas, gráficos y actividad reciente

async function initDashboard() {
    console.log('📊 Iniciando Dashboard...');
    try {
        await Promise.all([
            cargarMetricasPrincipales(),
            cargarEstadoResultados(),
            cargarVentasComprasMes(),
            cargarDistribucionGastos(),
            cargarTopProductosKardex(),
            cargarActividadReciente(),
            cargarAlertasStock(),
            cargarRatiosClave(),
        ]);
        console.log('✅ Dashboard listo');
    } catch (error) {
        console.error('❌ Error en Dashboard:', error);
        showAlert('Error al cargar el dashboard: ' + error.message, 'error');
    }
}

// ==================== HELPERS ====================
function fmt(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmtCorto(n) {
    const v = Number(n || 0);
    if (Math.abs(v) >= 1000000) return 'S/ ' + (v / 1000000).toFixed(2) + 'M';
    if (Math.abs(v) >= 1000) return 'S/ ' + (v / 1000).toFixed(1) + 'K';
    return 'S/ ' + v.toFixed(2);
}

function hoyISO() {
    return new Date().toISOString().split('T')[0];
}

function anioActual() {
    return new Date().getFullYear();
}

// Suma saldos de cuentas por prefijo (débito - crédito)
function saldoPorPrefijo(asientos, prefijo) {
    let saldo = 0;
    asientos.forEach(a => {
        (a.lineas || []).forEach(l => {
            if (String(l.cuenta).startsWith(prefijo)) {
                saldo += (Number(l.debe) || 0) - (Number(l.haber) || 0);
            }
        });
    });
    return saldo;
}

// Suma movimientos solo del lado debe o haber por prefijo
function totalDebePorPrefijo(asientos, prefijo) {
    let total = 0;
    asientos.forEach(a => {
        (a.lineas || []).forEach(l => {
            if (String(l.cuenta).startsWith(prefijo)) total += Number(l.debe) || 0;
        });
    });
    return total;
}

function totalHaberPorPrefijo(asientos, prefijo) {
    let total = 0;
    asientos.forEach(a => {
        (a.lineas || []).forEach(l => {
            if (String(l.cuenta).startsWith(prefijo)) total += Number(l.haber) || 0;
        });
    });
    return total;
}

// ==================== 1. MÉTRICAS PRINCIPALES ====================
async function cargarMetricasPrincipales() {
    const [asientos, kardex, comprasTabla, ventasTabla] = await Promise.all([
        DB.getAll('asientos'),
        DB.getAll('kardex'),
        DB.getAll('compras'),
        DB.getAll('ventas')
    ]);

    // Total Activo (elemento 1, 2, 3 descontando 19, 29, 39 que son acreedoras)
    let activo = 0;
    asientos.forEach(a => {
        (a.lineas || []).forEach(l => {
            const c = String(l.cuenta);
            // Activos: 10-18, 20-28, 30-38 (excluye 19, 29, 39)
            if (/^(1[0-8]|2[0-8]|3[0-8])/.test(c)) {
                activo += (Number(l.debe) || 0) - (Number(l.haber) || 0);
            }
            // Depreciaciones acumuladas (19, 29, 39) restan
            if (/^(19|29|39)/.test(c)) {
                activo -= (Number(l.haber) || 0) - (Number(l.debe) || 0);
            }
        });
    });

    // Total Ventas — leer de la tabla ventas (base imponible, sin IGV)
    const ventas = ventasTabla.reduce((s, v) => s + (Number(v.base) || 0), 0);

    // Total Compras — leer de la tabla compras (base imponible, sin IGV)
    const compras = comprasTabla.reduce((s, c) => s + (Number(c.base) || 0), 0);

    // Valor Inventario (kardex: entradas - salidas)
    let inventario = 0;
    kardex.forEach(m => {
        const total = Number(m.costo_total) || 0;
        if (m.tipo_movimiento === 'entrada') inventario += total;
        else if (m.tipo_movimiento === 'salida') inventario -= total;
        else if (m.tipo_movimiento === 'ajuste') inventario += total;
    });

    // Pintar
    document.getElementById('dashActivo').textContent = fmtCorto(activo);
    document.getElementById('dashVentas').textContent = fmtCorto(ventas);
    document.getElementById('dashCompras').textContent = fmtCorto(compras);
    document.getElementById('dashInventario').textContent = fmtCorto(inventario);

    document.getElementById('dashActivoFull').textContent = fmt(activo);
    document.getElementById('dashVentasFull').textContent = fmt(ventas);
    document.getElementById('dashComprasFull').textContent = fmt(compras);
    document.getElementById('dashInventarioFull').textContent = fmt(inventario);
}

// ==================== 2. ESTADO DE RESULTADOS ====================
async function cargarEstadoResultados() {
    const asientos = await DB.getAll('asientos');

    const ingresos = totalHaberPorPrefijo(asientos, '70'); // Ventas
    const otrosIngresos = totalHaberPorPrefijo(asientos, '75'); // Otros ingresos
    const costoVentas = totalDebePorPrefijo(asientos, '69'); // Costo de ventas
    const gastosAdmin = totalDebePorPrefijo(asientos, '94'); // Gastos admin (analítico)
    const gastosVenta = totalDebePorPrefijo(asientos, '95'); // Gastos venta (analítico)
    const gastosFinancieros = totalDebePorPrefijo(asientos, '67');
    const gastosPersonal = totalDebePorPrefijo(asientos, '62');
    const gastosServicios = totalDebePorPrefijo(asientos, '63');

    const totalIngresos = ingresos + otrosIngresos;
    const totalGastos = costoVentas + gastosAdmin + gastosVenta + gastosFinancieros + gastosPersonal + gastosServicios;
    const utilidadBruta = ingresos - costoVentas;
    const utilidadNeta = totalIngresos - totalGastos;
    const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0;
    const margenNeto = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;

    const container = document.getElementById('dashEstadoResultados');
    if (!container) return;

    container.innerHTML = `
        <div class="eeff-row">
            <span class="eeff-label">Ingresos por Ventas</span>
            <span class="eeff-value eeff-positive">${fmt(ingresos)}</span>
        </div>
        <div class="eeff-row">
            <span class="eeff-label">Otros Ingresos</span>
            <span class="eeff-value eeff-positive">${fmt(otrosIngresos)}</span>
        </div>
        <div class="eeff-row eeff-subtotal">
            <span class="eeff-label">TOTAL INGRESOS</span>
            <span class="eeff-value">${fmt(totalIngresos)}</span>
        </div>
        <div class="eeff-row">
            <span class="eeff-label">(-) Costo de Ventas</span>
            <span class="eeff-value eeff-negative">${fmt(costoVentas)}</span>
        </div>
        <div class="eeff-row eeff-subtotal">
            <span class="eeff-label">UTILIDAD BRUTA</span>
            <span class="eeff-value ${utilidadBruta >= 0 ? 'eeff-positive' : 'eeff-negative'}">${fmt(utilidadBruta)}</span>
        </div>
        <div class="eeff-row">
            <span class="eeff-label">(-) Gastos de Personal</span>
            <span class="eeff-value eeff-negative">${fmt(gastosPersonal)}</span>
        </div>
        <div class="eeff-row">
            <span class="eeff-label">(-) Servicios de Terceros</span>
            <span class="eeff-value eeff-negative">${fmt(gastosServicios)}</span>
        </div>
        <div class="eeff-row">
            <span class="eeff-label">(-) Gastos Financieros</span>
            <span class="eeff-value eeff-negative">${fmt(gastosFinancieros)}</span>
        </div>
        <div class="eeff-row eeff-total">
            <span class="eeff-label">UTILIDAD NETA</span>
            <span class="eeff-value ${utilidadNeta >= 0 ? 'eeff-positive' : 'eeff-negative'}">${fmt(utilidadNeta)}</span>
        </div>
        <div class="eeff-indicators">
            <div class="indicator">
                <div class="indicator-label">Margen Bruto</div>
                <div class="indicator-value">${margenBruto.toFixed(1)}%</div>
            </div>
            <div class="indicator">
                <div class="indicator-label">Margen Neto</div>
                <div class="indicator-value ${margenNeto >= 0 ? 'positive' : 'negative'}">${margenNeto.toFixed(1)}%</div>
            </div>
        </div>
    `;
}

// ==================== 3. VENTAS VS COMPRAS ÚLTIMOS 6 MESES ====================
async function cargarVentasComprasMes() {
    // Leer directamente de las tablas (más confiable)
    const [compras, ventas] = await Promise.all([
        DB.getAll('compras'),
        DB.getAll('ventas')
    ]);

    const meses = [];

    // Últimos 6 meses
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        meses.push({
            key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
            label: d.toLocaleDateString('es-PE', { month: 'short' }).toUpperCase(),
            ventas: 0,
            compras: 0
        });
    }

    // Sumar compras (base imponible, sin IGV)
    compras.forEach(c => {
        if (!c.fecha) return;
        const key = c.fecha.substring(0, 7);
        const mes = meses.find(m => m.key === key);
        if (mes) mes.compras += Number(c.base) || 0;
    });

    // Sumar ventas (base imponible, sin IGV)
    ventas.forEach(v => {
        if (!v.fecha) return;
        const key = v.fecha.substring(0, 7);
        const mes = meses.find(m => m.key === key);
        if (mes) mes.ventas += Number(v.base) || 0;
    });

    const maxVal = Math.max(...meses.map(m => Math.max(m.ventas, m.compras)), 1);

    const container = document.getElementById('dashVentasComprasChart');
    if (!container) return;

    container.innerHTML = meses.map(m => {
        const hVentas = (m.ventas / maxVal) * 100;
        const hCompras = (m.compras / maxVal) * 100;
        return `
            <div class="chart-month">
                <div class="chart-bars">
                    <div class="chart-bar-v" style="height:${hVentas}%" title="Ventas: ${fmt(m.ventas)}">
                        <span class="chart-tooltip">${fmtCorto(m.ventas)}</span>
                    </div>
                    <div class="chart-bar-c" style="height:${hCompras}%" title="Compras: ${fmt(m.compras)}">
                        <span class="chart-tooltip">${fmtCorto(m.compras)}</span>
                    </div>
                </div>
                <div class="chart-month-label">${m.label}</div>
            </div>
        `;
    }).join('');
}

// ==================== 4. DISTRIBUCIÓN DE GASTOS ====================
async function cargarDistribucionGastos() {
    const asientos = await DB.getAll('asientos');

    const categorias = [
        { prefijo: '62', label: 'Personal', color: '#1765bc', icon: '👥' },
        { prefijo: '63', label: 'Servicios', color: '#087565', icon: '🛠️' },
        { prefijo: '64', label: 'Tributos', color: '#b42335', icon: '📋' },
        { prefijo: '65', label: 'Otros Gastos', color: '#835600', icon: '📦' },
        { prefijo: '67', label: 'Financieros', color: '#7c3aed', icon: '💰' },
        { prefijo: '69', label: 'Costo Ventas', color: '#ea580c', icon: '🏭' }
    ];

    const datos = categorias.map(cat => ({
        ...cat,
        total: totalDebePorPrefijo(asientos, cat.prefijo)
    })).filter(c => c.total > 0);

    const total = datos.reduce((s, d) => s + d.total, 0) || 1;

    const container = document.getElementById('dashDistribucionGastos');
    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = '<div class="empty-chart">Sin gastos registrados</div>';
        return;
    }

    container.innerHTML = datos.map(d => {
        const pct = (d.total / total) * 100;
        return `
            <div class="gasto-item">
                <div class="gasto-header">
                    <span class="gasto-icon">${d.icon}</span>
                    <span class="gasto-label">${d.label}</span>
                    <span class="gasto-pct">${pct.toFixed(1)}%</span>
                </div>
                <div class="gasto-bar">
                    <div class="gasto-bar-fill" style="width:${pct}%; background:${d.color};"></div>
                </div>
                <div class="gasto-monto">${fmt(d.total)}</div>
            </div>
        `;
    }).join('');
}

// ==================== 5. TOP 5 PRODUCTOS KARDEX ====================
async function cargarTopProductosKardex() {
    const kardex = await DB.getAll('kardex');

    const productos = {};
    kardex.forEach(m => {
        const cod = m.producto_codigo || 'SIN-COD';
        if (!productos[cod]) {
            productos[cod] = {
                codigo: cod,
                nombre: m.producto_nombre || cod,
                entradas: 0,
                salidas: 0,
                valor: 0
            };
        }
        const cant = Number(m.cantidad) || 0;
        const total = Number(m.costo_total) || 0;
        if (m.tipo_movimiento === 'entrada') {
            productos[cod].entradas += cant;
            productos[cod].valor += total;
        } else if (m.tipo_movimiento === 'salida') {
            productos[cod].salidas += cant;
        }
    });

    const top = Object.values(productos)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

    const container = document.getElementById('dashTopProductos');
    if (!container) return;

    if (top.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="empty-state">Sin movimientos de Kardex</td></tr>';
        return;
    }

    const maxValor = Math.max(...top.map(p => p.valor), 1);

    container.innerHTML = top.map((p, i) => {
        const pct = (p.valor / maxValor) * 100;
        const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
        return `
            <tr>
                <td style="width:40px; text-align:center; font-size:1.2em;">${medalla}</td>
                <td>
                    <div style="font-weight:600;">${textCell(p.nombre)}</div>
                    <div style="font-size:0.8em; color:#56677b;">${textCell(p.codigo)}</div>
                    <div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%"></div></div>
                </td>
                <td style="text-align:right; font-variant-numeric:tabular-nums;">${p.entradas.toFixed(2)}</td>
                <td style="text-align:right; font-weight:600; font-variant-numeric:tabular-nums;">${fmt(p.valor)}</td>
            </tr>
        `;
    }).join('');
}

// ==================== 6. ACTIVIDAD RECIENTE ====================
async function cargarActividadReciente() {
    const [asientos, kardex] = await Promise.all([
        DB.getAll('asientos'),
        DB.getAll('kardex')
    ]);

    // Últimos 5 asientos
    const ultimosAsientos = asientos
        .sort((a, b) => {
            const fa = (b.fecha || '').localeCompare(a.fecha || '');
            return fa !== 0 ? fa : (b.id - a.id);
        })
        .slice(0, 5);

    const containerA = document.getElementById('dashUltimosAsientos');
    if (containerA) {
        if (ultimosAsientos.length === 0) {
            containerA.innerHTML = '<div class="empty-activity">Sin asientos registrados</div>';
        } else {
            containerA.innerHTML = ultimosAsientos.map(a => {
                const totalDebe = (a.lineas || []).reduce((s, l) => s + (Number(l.debe) || 0), 0);
                return `
                    <div class="activity-item">
                        <div class="activity-icon">📋</div>
                        <div class="activity-content">
                            <div class="activity-title">${textCell(a.numero)} · ${textCell((a.glosa || '').substring(0, 50))}</div>
                            <div class="activity-meta">${textCell(a.fecha)} · ${(a.lineas || []).length} líneas</div>
                        </div>
                        <div class="activity-amount">${fmt(totalDebe)}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // Últimos 5 movimientos kardex
    const ultimosKardex = kardex
        .sort((a, b) => {
            const fa = (b.fecha || '').localeCompare(a.fecha || '');
            return fa !== 0 ? fa : (b.id - a.id);
        })
        .slice(0, 5);

    const containerK = document.getElementById('dashUltimosKardex');
    if (containerK) {
        if (ultimosKardex.length === 0) {
            containerK.innerHTML = '<div class="empty-activity">Sin movimientos de Kardex</div>';
        } else {
            containerK.innerHTML = ultimosKardex.map(m => {
                const esEntrada = m.tipo_movimiento === 'entrada';
                const esSalida = m.tipo_movimiento === 'salida';
                const icono = esEntrada ? '📥' : esSalida ? '📤' : '⚖️';
                const clase = esEntrada ? 'in' : esSalida ? 'out' : 'adj';
                return `
                    <div class="activity-item">
                        <div class="activity-icon activity-icon-${clase}">${icono}</div>
                        <div class="activity-content">
                            <div class="activity-title">${textCell(m.producto_nombre || m.producto_codigo)}</div>
                            <div class="activity-meta">${textCell(m.fecha)} · ${textCell(m.tipo_movimiento)}</div>
                        </div>
                        <div class="activity-amount">${Number(m.cantidad || 0).toFixed(2)}</div>
                    </div>
                `;
            }).join('');
        }
    }
}

// ==================== 7. ALERTAS DE STOCK ====================
async function cargarAlertasStock() {
    const [productos, mercaderias] = await Promise.all([
        DB.getAll('productos'),
        DB.getAll('mercaderias')
    ]);

    const bajoStock = [];

    productos.forEach(p => {
        const stock = Number(p.stock) || 0;
        if (stock < 10) {
            bajoStock.push({
                codigo: p.codigo,
                nombre: p.nombre,
                stock: stock,
                tipo: 'Producto'
            });
        }
    });

    mercaderias.forEach(m => {
        const stock = Number(m.stock) || 0;
        if (stock < 10) {
            bajoStock.push({
                codigo: m.codigo,
                nombre: m.descripcion,
                stock: stock,
                tipo: 'Mercadería'
            });
        }
    });

    bajoStock.sort((a, b) => a.stock - b.stock);

    const container = document.getElementById('dashAlertasStock');
    if (!container) return;

    if (bajoStock.length === 0) {
        container.innerHTML = `
            <div class="empty-activity" style="color:#087565;">
                ✅ Todo el inventario está en niveles óptimos
            </div>
        `;
        return;
    }

    container.innerHTML = bajoStock.slice(0, 6).map(p => {
        const criticidad = p.stock === 0 ? 'critico' : p.stock < 5 ? 'alerta' : 'aviso';
        const icono = p.stock === 0 ? '⛔' : p.stock < 5 ? '⚠️' : '📢';
        return `
            <div class="alert-stock alert-stock-${criticidad}">
                <span class="alert-stock-icon">${icono}</span>
                <div class="alert-stock-content">
                    <div class="alert-stock-title">${textCell(p.nombre)}</div>
                    <div class="alert-stock-meta">${textCell(p.tipo)} · ${textCell(p.codigo)}</div>
                </div>
                <div class="alert-stock-qty">${p.stock}</div>
            </div>
        `;
    }).join('');
}

// ==================== RATIOS CLAVE EN EL DASHBOARD ====================
async function cargarRatiosClave() {
    if (typeof Ratios === 'undefined') {
        console.warn('[Dashboard] Módulo Ratios no cargado');
        return;
    }
    
    try {
        const resultado = await Ratios.calcularTodos();
        const r = resultado.ratios;
        
        actualizarTarjetaRatio('kpiLiquidez', r.liquidezCorriente, 'x');
        actualizarTarjetaRatio('kpiMargenBruto', r.margenBruto, '%');
        actualizarTarjetaRatio('kpiEndeudamiento', r.endeudamientoTotal, 'pct');
        actualizarTarjetaRatio('kpiRoe', r.roe, '%');
        
        console.log('✅ Ratios clave cargados');
    } catch (error) {
        console.error('Error cargando ratios:', error);
    }
}

function actualizarTarjetaRatio(elementId, ratio, tipo) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const sem = Ratios.semaforo(ratio.valor, ratio.min, ratio.max, ratio.tipo);
    
    let valorFormateado;
    if (tipo === 'pct') {
        valorFormateado = (ratio.valor * 100).toFixed(2) + '%';
    } else if (tipo === '%') {
        valorFormateado = ratio.valor.toFixed(2) + '%';
    } else if (tipo === 'x') {
        valorFormateado = ratio.valor.toFixed(2) + 'x';
    } else {
        valorFormateado = ratio.valor.toFixed(2);
    }
    
    el.querySelector('.kpi-value').textContent = valorFormateado;
    el.querySelector('.kpi-semaforo').textContent = sem.icon;
    el.querySelector('.kpi-benchmark').textContent = ratio.benchmark;
    
    el.classList.remove('kpi-ok', 'kpi-warn', 'kpi-bad');
    el.classList.add('kpi-' + sem.clase);
}