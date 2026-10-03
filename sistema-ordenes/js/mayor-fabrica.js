// ==================== MAYOR DE FÁBRICA ====================

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
    const [ordenes, mp, mo, cif, gastos, ventas] = await Promise.all([
        DB.getAll('ordenesTrabajo'),
        DB.getAll('otMateriaPrima'),
        DB.getAll('otManoObra'),
        DB.getAll('otCif'),
        DB.getAll('otGastos'),
        DB.getAll('otVentas')
    ]);

    const container = document.getElementById('mayorGrid');
    if (!container) return;

    // Totales
    const totalMP = mp.reduce((s, m) => s + Number(m.costo_total || 0), 0);
    const totalMOD = mo.filter(m => m.tipo === 'MOD').reduce((s, m) => s + Number(m.monto || 0), 0);
    const totalMOI = mo.filter(m => m.tipo === 'MOI').reduce((s, m) => s + Number(m.monto || 0), 0);
    const totalCIF = cif.reduce((s, c) => s + Number(c.monto || 0), 0);
    const totalGastosAdmin = gastos.filter(g => g.tipo === 'ADMIN').reduce((s, g) => s + Number(g.monto || 0), 0);
    const totalGastosVentas = gastos.filter(g => g.tipo === 'VENTAS').reduce((s, g) => s + Number(g.monto || 0), 0);
    const totalGastosFinan = gastos.filter(g => g.tipo === 'FINANCIERO').reduce((s, g) => s + Number(g.monto || 0), 0);
    const totalVentas = ventas.reduce((s, v) => s + Number(v.monto || 0), 0);
    const totalCostoProduccion = totalMP + totalMOD + totalMOI + totalCIF;

    // Definir las cuentas T
    const cuentasT = [
        {
            codigo: '60',
            nombre: 'Compras MP',
            debe: [
                { detalle: 'Compra MP X', monto: 100000 },
                { detalle: 'Compra MP Y', monto: 120000 },
                { detalle: 'Compra MP Z', monto: 100000 }
            ],
            haber: []
        },
        {
            codigo: '24',
            nombre: 'Materia Prima',
            debe: [
                { detalle: 'Compra MP X', monto: 100000 },
                { detalle: 'Compra MP Y', monto: 120000 },
                { detalle: 'Compra MP Z', monto: 100000 }
            ],
            haber: [
                { detalle: 'Asignación a OT-101', monto: 50000 },
                { detalle: 'Asignación a OT-102', monto: 15000 },
                { detalle: 'Asignación a OT-103', monto: 20000 }
            ]
        },
        {
            codigo: '62',
            nombre: 'Gastos de Personal',
            debe: [
                { detalle: 'MOD OT-101', monto: 20000 },
                { detalle: 'MOD OT-102', monto: 15000 },
                { detalle: 'MOD OT-103', monto: 30000 },
                { detalle: 'MOI OT-103', monto: 20000 }
            ],
            haber: []
        },
        {
            codigo: '63',
            nombre: 'Servicios de Terceros',
            debe: [
                { detalle: 'Energía eléctrica', monto: 15000 },
                { detalle: 'Agua', monto: 10000 },
                { detalle: 'Seguros de fábrica', monto: 20000 },
                { detalle: 'Alquiler de fábrica', monto: 10000 },
                { detalle: 'Transporte personal', monto: 20000 },
                { detalle: 'Mantenimiento', monto: 30000 },
                { detalle: 'Calidad', monto: 20000 }
            ],
            haber: []
        },
        {
            codigo: '23',
            nombre: 'Productos en Proceso',
            debe: [
                { detalle: 'MP OT-101', monto: 50000 },
                { detalle: 'MOD OT-101', monto: 20000 },
                { detalle: 'CIF OT-101', monto: 47000 },
                { detalle: 'MP OT-102', monto: 15000 },
                { detalle: 'MOD OT-102', monto: 15000 },
                { detalle: 'CIF OT-102', monto: 42000 },
                { detalle: 'MP OT-103', monto: 20000 },
                { detalle: 'MOD OT-103', monto: 30000 },
                { detalle: 'MOI OT-103', monto: 20000 },
                { detalle: 'CIF OT-103', monto: 51000 }
            ],
            haber: [
                { detalle: 'PT OT-101', monto: 117000 },
                { detalle: 'PT OT-102', monto: 72000 },
                { detalle: 'PT OT-103', monto: 121000 }
            ]
        },
        {
            codigo: '21',
            nombre: 'Productos Terminados',
            debe: [
                { detalle: 'PT OT-101', monto: 117000 },
                { detalle: 'PT OT-102', monto: 72000 },
                { detalle: 'PT OT-103', monto: 121000 }
            ],
            haber: [
                { detalle: 'CV OT-101', monto: 117000 },
                { detalle: 'CV OT-102', monto: 72000 },
                { detalle: 'CV OT-103', monto: 121000 }
            ]
        },
        {
            codigo: '69',
            nombre: 'Costo de Ventas',
            debe: [
                { detalle: 'CV OT-101', monto: 117000 },
                { detalle: 'CV OT-102', monto: 72000 },
                { detalle: 'CV OT-103', monto: 121000 }
            ],
            haber: []
        },
        {
            codigo: '70',
            nombre: 'Ventas',
            debe: [],
            haber: [
                { detalle: 'Venta OT-101', monto: 150000 },
                { detalle: 'Venta OT-102', monto: 200000 },
                { detalle: 'Venta OT-103', monto: 180000 }
            ]
        }
    ];

    container.innerHTML = cuentasT.map(cta => {
        const totalDebe = cta.debe.reduce((s, d) => s + d.monto, 0);
        const totalHaber = cta.haber.reduce((s, h) => s + h.monto, 0);
        const saldo = totalDebe - totalHaber;
        const esDeudor = saldo >= 0;

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
                            ? cta.debe.map(d => `
                                <div class="cuenta-t-row">
                                    <span>${textCell(d.detalle)}</span>
                                    <span>${fmtNum(d.monto)}</span>
                                </div>
                            `).join('')
                            : '<div class="cuenta-t-empty">—</div>'}
                        <div class="cuenta-t-row cuenta-t-total">
                            <span>TOTAL</span>
                            <span>${fmtNum(totalDebe)}</span>
                        </div>
                    </div>
                    <div class="cuenta-t-col">
                        <div class="cuenta-t-titulo">HABER</div>
                        ${cta.haber.length > 0 
                            ? cta.haber.map(h => `
                                <div class="cuenta-t-row">
                                    <span>${textCell(h.detalle)}</span>
                                    <span>${fmtNum(h.monto)}</span>
                                </div>
                            `).join('')
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

async function exportarMayorCSV() {
    const [mp, mo, cif, gastos, ventas] = await Promise.all([
        DB.getAll('otMateriaPrima'),
        DB.getAll('otManoObra'),
        DB.getAll('otCif'),
        DB.getAll('otGastos'),
        DB.getAll('otVentas')
    ]);

    let csv = '\uFEFFCONCEPTO;MONTO\n';
    csv += 'MATERIA PRIMA;' + mp.reduce((s, m) => s + Number(m.costo_total || 0), 0) + '\n';
    csv += 'MOD;' + mo.filter(m => m.tipo === 'MOD').reduce((s, m) => s + Number(m.monto || 0), 0) + '\n';
    csv += 'MOI;' + mo.filter(m => m.tipo === 'MOI').reduce((s, m) => s + Number(m.monto || 0), 0) + '\n';
    csv += 'CIF;' + cif.reduce((s, c) => s + Number(c.monto || 0), 0) + '\n';
    csv += 'GASTOS ADMIN;' + gastos.filter(g => g.tipo === 'ADMIN').reduce((s, g) => s + Number(g.monto || 0), 0) + '\n';
    csv += 'GASTOS VENTAS;' + gastos.filter(g => g.tipo === 'VENTAS').reduce((s, g) => s + Number(g.monto || 0), 0) + '\n';
    csv += 'GASTOS FINANCIEROS;' + gastos.filter(g => g.tipo === 'FINANCIERO').reduce((s, g) => s + Number(g.monto || 0), 0) + '\n';
    csv += 'VENTAS;' + ventas.reduce((s, v) => s + Number(v.monto || 0), 0) + '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mayor-fabrica.csv';
    a.click();
    URL.revokeObjectURL(url);
    showAlert('✅ Exportado', 'success');
}