// ==================== EEFF OT - DINÁMICO ====================

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

    const tbody = document.getElementById('eeffTableBody');
    if (!tbody) return;

    // ⭐ FILTRO DE RANGO
    const rango = document.getElementById('eeffRango')?.value || 'todas';
    let ordenesOrdenadas = [...ordenes].sort((a, b) => 
        (a.numero_ot || '').localeCompare(b.numero_ot || '')
    );
    
    if (rango !== 'todas') {
        ordenesOrdenadas = ordenesOrdenadas.slice(-parseInt(rango));
    }

    // ==================== HEADER DINÁMICO ====================
    const thead = document.getElementById('eeffTableHead');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th class="eeff-sticky-left eeff-col-concepto">Concepto</th>
                ${ordenesOrdenadas.map(o => 
                    `<th class="eeff-col-ot" style="text-align:right;">${textCell(o.numero_ot)}</th>`
                ).join('')}
                <th class="eeff-sticky-right eeff-col-total" style="text-align:right;">TOTAL</th>
            </tr>
        `;
    }

    // Mapeo de datos por OT
    const otMap = {};
    ordenesOrdenadas.forEach(o => {
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

    // Filas del estado de resultados
    const filas = [
        { label: 'Ventas', tipo: 'ingreso', obtener: (d) => d.venta },
        { label: '(-) Costo de Ventas', tipo: 'gasto', obtener: (d) => d.costo },
        { label: 'UTILIDAD BRUTA', tipo: 'subtotal', obtener: (d) => d.venta - d.costo },
        { label: '(-) Gastos Administrativos', tipo: 'gasto', obtener: (d) => d.gastosAdmin },
        { label: '(-) Gastos de Ventas', tipo: 'gasto', obtener: (d) => d.gastosVentas },
        { label: '(-) Gastos Financieros', tipo: 'gasto', obtener: (d) => d.gastosFinan },
        { label: 'UTILIDAD NETA', tipo: 'total', obtener: (d) => d.venta - d.costo - d.gastosAdmin - d.gastosVentas - d.gastosFinan }
    ];

    // Construir tabla
    let html = '';
    const totales = { venta: 0, costo: 0, gastosAdmin: 0, gastosVentas: 0, gastosFinan: 0 };

    filas.forEach(fila => {
        const valores = {};
        let totalFila = 0;

        ordenesOrdenadas.forEach(o => {
            const valor = fila.obtener(otMap[o.id]) || 0;
            valores[o.id] = valor;
            totalFila += valor;
        });

        if (fila.label === 'Ventas') totales.venta = totalFila;
        if (fila.label === '(-) Costo de Ventas') totales.costo = totalFila;
        if (fila.label === '(-) Gastos Administrativos') totales.gastosAdmin = totalFila;
        if (fila.label === '(-) Gastos de Ventas') totales.gastosVentas = totalFila;
        if (fila.label === '(-) Gastos Financieros') totales.gastosFinan = totalFila;

        let claseFila = '';
        if (fila.tipo === 'subtotal') claseFila = 'eeff-row-subtotal';
        else if (fila.tipo === 'total') claseFila = 'eeff-row-total';
        else if (fila.tipo === 'gasto') claseFila = 'eeff-row-gasto';

        html += `<tr class="${claseFila}">`;
        html += `<td class="eeff-sticky-left eeff-col-concepto">${textCell(fila.label)}</td>`;
        
        ordenesOrdenadas.forEach(o => {
            const valor = valores[o.id];
            html += `<td class="eeff-col-ot" style="text-align:right;">${fmtNum(valor)}</td>`;
        });

        html += `<td class="eeff-sticky-right eeff-col-total" style="text-align:right;"><strong>${fmtNum(totalFila)}</strong></td>`;
        html += `</tr>`;
    });

    tbody.innerHTML = html;

    // Actualizar métricas
    const totalVentas = totales.venta;
    const totalCosto = totales.costo;
    const utilidadBruta = totalVentas - totalCosto;
    const totalGastos = totales.gastosAdmin + totales.gastosVentas + totales.gastosFinan;
    const utilidadNeta = utilidadBruta - totalGastos;

    document.getElementById('eeffVentas').textContent = fmt(totalVentas);
    document.getElementById('eeffCostoVentas').textContent = fmt(totalCosto);
    document.getElementById('eeffUtilidadBruta').textContent = fmt(utilidadBruta);
    document.getElementById('eeffUtilidadNeta').textContent = fmt(utilidadNeta);

    console.log(`✅ EEFF renderizado: ${ordenesOrdenadas.length} OT`);
}
async function exportarEEFFCSV() {
    const [ordenes, gastos, ventas] = await Promise.all([
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otGastos'),
        DB.getAll('otVentas')
    ]);

    const ordenesOrdenadas = [...ordenes].sort((a, b) => 
        (a.numero_ot || '').localeCompare(b.numero_ot || '')
    );

    // CSV con columnas dinámicas
    let csv = '\uFEFFConcepto;';
    csv += ordenesOrdenadas.map(o => o.numero_ot).join(';');
    csv += ';TOTAL\n';

    const datos = ordenesOrdenadas.map(o => {
        const venta = ventas.find(v => v.ot_id === o.id);
        const gs = gastos.filter(g => g.ot_id === o.id);
        const gAdmin = gs.filter(g => g.tipo === 'ADMIN').reduce((s, g) => s + Number(g.monto || 0), 0);
        const gVentas = gs.filter(g => g.tipo === 'VENTAS').reduce((s, g) => s + Number(g.monto || 0), 0);
        const gFinan = gs.filter(g => g.tipo === 'FINANCIERO').reduce((s, g) => s + Number(g.monto || 0), 0);
        
        return {
            numero: o.numero_ot,
            venta: Number(venta?.monto || 0),
            costo: Number(o.costo_total || 0),
            gAdmin, gVentas, gFinan
        };
    });

    csv += 'Ventas;';
    datos.forEach(d => csv += d.venta + ';');
    csv += datos.reduce((s, d) => s + d.venta, 0) + '\n';

    csv += '(-) Costo de Ventas;';
    datos.forEach(d => csv += d.costo + ';');
    csv += datos.reduce((s, d) => s + d.costo, 0) + '\n';

    csv += 'UTILIDAD BRUTA;';
    datos.forEach(d => csv += (d.venta - d.costo) + ';');
    csv += datos.reduce((s, d) => s + (d.venta - d.costo), 0) + '\n';

    csv += '(-) Gastos Administrativos;';
    datos.forEach(d => csv += d.gAdmin + ';');
    csv += datos.reduce((s, d) => s + d.gAdmin, 0) + '\n';

    csv += '(-) Gastos de Ventas;';
    datos.forEach(d => csv += d.gVentas + ';');
    csv += datos.reduce((s, d) => s + d.gVentas, 0) + '\n';

    csv += '(-) Gastos Financieros;';
    datos.forEach(d => csv += d.gFinan + ';');
    csv += datos.reduce((s, d) => s + d.gFinan, 0) + '\n';

    csv += 'UTILIDAD NETA;';
    datos.forEach(d => {
        const utilidad = d.venta - d.costo - d.gAdmin - d.gVentas - d.gFinan;
        csv += utilidad + ';';
    });
    csv += datos.reduce((s, d) => {
        return s + (d.venta - d.costo - d.gAdmin - d.gVentas - d.gFinan);
    }, 0) + '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eeff-ot-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}