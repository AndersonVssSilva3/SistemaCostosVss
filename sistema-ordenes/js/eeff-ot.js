// ==================== EEFF OT ====================

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

async function initEEFFOT() {
    console.log('📈 Iniciando EEFF OT...');
    try {
        await renderEEFFOT();
        console.log('✅ EEFF OT listo');
    } catch (error) {
        console.error('❌ Error:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

async function renderEEFFOT() {
    const [ordenes, gastos, ventas] = await Promise.all([
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otGastos'),
        DB.getAll('otVentas')
    ]);

    const tbody = document.getElementById('eeffTable');
    if (!tbody) return;

    // Mapeo de datos por OT
    const otMap = {};
    ordenes.forEach(o => {
        otMap[o.id] = {
            numero: o.numero_ot,
            costo: Number(o.costo_total || 0),
            venta: 0,
            gastosAdmin: 0,
            gastosVentas: 0,
            gastosFinan: 0
        };
    });

    // Agregar ventas
    ventas.forEach(v => {
        if (otMap[v.ot_id]) {
            otMap[v.ot_id].venta = Number(v.monto || 0);
        }
    });

    // Agregar gastos
    gastos.forEach(g => {
        if (!otMap[g.ot_id]) return;
        const monto = Number(g.monto || 0);
        if (g.tipo === 'ADMIN') otMap[g.ot_id].gastosAdmin += monto;
        if (g.tipo === 'VENTAS') otMap[g.ot_id].gastosVentas += monto;
        if (g.tipo === 'FINANCIERO') otMap[g.ot_id].gastosFinan += monto;
    });

    // Filas
    const rows = [
        { label: 'Ventas', campo: 'venta', tipo: 'ingreso' },
        { label: '(-) Costo de Ventas', campo: 'costo', tipo: 'gasto' },
        { label: 'UTILIDAD BRUTA', campo: 'utilidadBruta', tipo: 'subtotal' },
        { label: '(-) Gastos Administrativos', campo: 'gastosAdmin', tipo: 'gasto' },
        { label: '(-) Gastos de Ventas', campo: 'gastosVentas', tipo: 'gasto' },
        { label: '(-) Gastos Financieros', campo: 'gastosFinan', tipo: 'gasto' },
        { label: 'UTILIDAD NETA', campo: 'utilidadNeta', tipo: 'total' }
    ];

    let html = '';
    let totales = { venta: 0, costo: 0, gastosAdmin: 0, gastosVentas: 0, gastosFinan: 0 };

    rows.forEach(row => {
        let valores = { ot101: 0, ot102: 0, ot103: 0, total: 0 };
        
        ordenes.forEach(o => {
            const data = otMap[o.id];
            const key = o.numero_ot === 'OT-101' ? 'ot101' : o.numero_ot === 'OT-102' ? 'ot102' : 'ot103';
            
            if (row.tipo === 'subtotal') {
                valores[key] = data.venta - data.costo;
            } else if (row.tipo === 'total') {
                valores[key] = data.venta - data.costo - data.gastosAdmin - data.gastosVentas - data.gastosFinan;
            } else {
                valores[key] = data[row.campo];
            }
            valores.total += valores[key];
        });

        if (row.tipo === 'ingreso' || row.tipo === 'gasto') {
            totales.venta += row.campo === 'venta' ? valores.total : 0;
            totales.costo += row.campo === 'costo' ? valores.total : 0;
            totales.gastosAdmin += row.campo === 'gastosAdmin' ? valores.total : 0;
            totales.gastosVentas += row.campo === 'gastosVentas' ? valores.total : 0;
            totales.gastosFinan += row.campo === 'gastosFinan' ? valores.total : 0;
        }

        const clase = row.tipo === 'subtotal' ? 'style="background:#eaf1f8; font-weight:700;"' 
                    : row.tipo === 'total' ? 'style="background:#102b46; color:white; font-weight:700;"' 
                    : '';
        const color = row.tipo === 'gasto' ? 'color:#b42335;' : '';

        html += `<tr ${clase}>
            <td>${textCell(row.label)}</td>
            <td style="text-align:right; ${color}">${fmtNum(valores.ot101)}</td>
            <td style="text-align:right; ${color}">${fmtNum(valores.ot102)}</td>
            <td style="text-align:right; ${color}">${fmtNum(valores.ot103)}</td>
            <td style="text-align:right; ${color}"><strong>${fmtNum(valores.total)}</strong></td>
        </tr>`;
    });

    tbody.innerHTML = html;

    // Métricas
    const totalVentas = totales.venta;
    const totalCosto = totales.costo;
    const utilidadBruta = totalVentas - totalCosto;
    const totalGastos = totales.gastosAdmin + totales.gastosVentas + totales.gastosFinan;
    const utilidadNeta = utilidadBruta - totalGastos;

    document.getElementById('eeffVentas').textContent = fmt(totalVentas);
    document.getElementById('eeffCostoVentas').textContent = fmt(totalCosto);
    document.getElementById('eeffUtilidadBruta').textContent = fmt(utilidadBruta);
    document.getElementById('eeffUtilidadNeta').textContent = fmt(utilidadNeta);
}

async function exportarEEFFCSV() {
    const ordenes = await DB.getAll('ordenesTrabajo');
    const gastos = await DB.getAll('otGastos');
    const ventas = await DB.getAll('otVentas');

    let csv = '\uFEFFOT;Venta;Costo;Gastos Admin;Gastos Ventas;Gastos Financieros;Utilidad Neta\n';
    
    ordenes.forEach(o => {
        const venta = ventas.find(v => v.ot_id === o.id);
        const gastosOT = gastos.filter(g => g.ot_id === o.id);
        const gAdmin = gastosOT.filter(g => g.tipo === 'ADMIN').reduce((s, g) => s + Number(g.monto || 0), 0);
        const gVentas = gastosOT.filter(g => g.tipo === 'VENTAS').reduce((s, g) => s + Number(g.monto || 0), 0);
        const gFinan = gastosOT.filter(g => g.tipo === 'FINANCIERO').reduce((s, g) => s + Number(g.monto || 0), 0);
        const utilidad = (venta?.monto || 0) - o.costo_total - gAdmin - gVentas - gFinan;
        
        csv += `"${o.numero_ot}";${venta?.monto || 0};${o.costo_total};${gAdmin};${gVentas};${gFinan};${utilidad}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eeff-ot.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}