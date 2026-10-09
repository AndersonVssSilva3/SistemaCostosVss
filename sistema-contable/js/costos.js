// ==================== COSTOS - MAYOR FÁBRICA, HOJA DE COSTOS, ETC. ====================

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

async function generarCostos() {
    try {
        const asientos = await DB.getAll('asientos');
        console.log('📊 Total asientos:', asientos.length);

        if (!asientos || asientos.length === 0) {
            document.getElementById('mayorFabTable').innerHTML =
                `<tr><td colspan="3" class="empty-state">No hay asientos registrados.</td></tr>`;
            return;
        }

        // Detectar último mes con movimientos
        const meses = asientos.map(a => (a.fecha || '').substring(0, 7)).filter(Boolean).sort();
        const ultimoMes = meses[meses.length - 1];
        const asientosMes = asientos.filter(a => (a.fecha || '').startsWith(ultimoMes));
        console.log('📅 Mes:', ultimoMes, '| Asientos:', asientosMes.length);

        // Sumar por centro de costo + prefijo de cuenta
        const sumaPorCentro = (centro, ...prefijos) => {
            let total = 0;
            asientosMes.forEach(a => {
                let lineas = a.lineas;
                if (typeof lineas === 'string') {
                    try { lineas = JSON.parse(lineas); } catch { lineas = []; }
                }
                (lineas || []).forEach(l => {
                    if (l.centroCosto !== centro) return;
                    const c = String(l.cuenta || '');
                    if (!prefijos.some(p => c.startsWith(p))) return;
                    total += (Number(l.debe) || 0) - (Number(l.haber) || 0);
                });
            });
            return Math.abs(total);
        };

        // Cálculos filtrados por centro de costo PLANTA
        const mp  = sumaPorCentro('PLANTA', '60', '61', '24');
        const mod = sumaPorCentro('PLANTA', '62');
        const cif = sumaPorCentro('PLANTA', '63', '65', '68');
        const totalProd = mp + mod + cif;

        console.log('🔢 MP:', mp, '| MOD:', mod, '| CIF:', cif, '| TOTAL:', totalProd);

        document.getElementById('mayorFabTable').innerHTML = `
            <tr><td>MP</td><td>Materia Prima Directa (cuentas 60, 61, 24 · PLANTA)</td>
                <td style="text-align:right;">S/ ${mp.toFixed(2)}</td></tr>
            <tr><td>MOD</td><td>Mano de Obra Directa (cuenta 62 · PLANTA)</td>
                <td style="text-align:right;">S/ ${mod.toFixed(2)}</td></tr>
            <tr><td>CIF</td><td>Costos Indirectos (cuentas 63, 65, 68 · PLANTA)</td>
                <td style="text-align:right;">S/ ${cif.toFixed(2)}</td></tr>
            <tr style="font-weight:700; background:#edf3f9;">
                <td></td><td>TOTAL COSTO PRODUCCIÓN — ${ultimoMes}</td>
                <td style="text-align:right;">S/ ${totalProd.toFixed(2)}</td></tr>
        `;

        // Admin, ventas, logística (para Fijos y Variables)
        const admin  = sumaPorCentro('ADMIN',  '62', '63', '65', '68', '94');
        const ventas = sumaPorCentro('VENTAS', '62', '63', '65', '68', '95');
        const logist = sumaPorCentro('LOGISTICA', '62', '63', '65', '68');
        const sinAsig = (() => {
            let t = 0;
            asientosMes.forEach(a => {
                let lineas = a.lineas;
                if (typeof lineas === 'string') { try { lineas = JSON.parse(lineas); } catch { lineas = []; } }
                (lineas || []).forEach(l => {
                    if (!l.centroCosto) {
                        const c = String(l.cuenta || '');
                        if (/^(6|7)/.test(c)) t += (Number(l.debe) || 0) - (Number(l.haber) || 0);
                    }
                });
            });
            return Math.abs(t);
        })();

        // Fijos y Variables
        document.getElementById('costosFijosVarTable').innerHTML = `
            <tr><td>Costos Administrativos · ADMIN</td>
                <td><span class="status-badge status-valid">Fijo</span></td>
                <td style="text-align:right;">${admin.toFixed(2)}</td></tr>
            <tr><td>Gastos de Venta · VENTAS</td>
                <td><span class="status-badge status-pending">Variable</span></td>
                <td style="text-align:right;">${ventas.toFixed(2)}</td></tr>
            <tr><td>Logística · LOGISTICA</td>
                <td><span class="status-badge status-pending">Variable</span></td>
                <td style="text-align:right;">${logist.toFixed(2)}</td></tr>
            <tr><td>Sin asignar (clasificar con el botón en Operaciones)</td>
                <td><span class="status-badge status-pending">Pendiente</span></td>
                <td style="text-align:right;">${sinAsig.toFixed(2)}</td></tr>
        `;

        // Hoja de costos y Costo de ventas igual que antes...
        const productos = await DB.getAll('productos') || [];
        const totalUnidades = productos.reduce((s, p) => s + (Number(p.stock) || 0), 0) || 1;
        const costoUnitMP = mp / totalUnidades;
        const costoUnitMOD = mod / totalUnidades;
        const costoUnitCIF = cif / totalUnidades;

        const hojaTbody = document.getElementById('hojaCostosTable');
        if (hojaTbody) {
            hojaTbody.innerHTML = `
                <tr><td>Materia Prima</td><td style="text-align:right;">${costoUnitMP.toFixed(2)}</td>
                    <td style="text-align:right;">${totalUnidades}</td><td style="text-align:right;">${mp.toFixed(2)}</td></tr>
                <tr><td>Mano de Obra</td><td style="text-align:right;">${costoUnitMOD.toFixed(2)}</td>
                    <td style="text-align:right;">${totalUnidades}</td><td style="text-align:right;">${mod.toFixed(2)}</td></tr>
                <tr><td>Costos Indirectos</td><td style="text-align:right;">${costoUnitCIF.toFixed(2)}</td>
                    <td style="text-align:right;">${totalUnidades}</td><td style="text-align:right;">${cif.toFixed(2)}</td></tr>
                <tr style="font-weight:700; background:#edf3f9;">
                    <td>TOTAL</td><td style="text-align:right;">${(costoUnitMP + costoUnitMOD + costoUnitCIF).toFixed(2)}</td>
                    <td style="text-align:right;">${totalUnidades}</td><td style="text-align:right;">${totalProd.toFixed(2)}</td></tr>
            `;
        }

        let htmlVentas = '';
        let totalCosto = 0, totalUtilidad = 0;
        productos.forEach(p => {
            const stock = Number(p.stock) || 0;
            const precio = Number(p.precio) || 0;
            const costoUnit = stock > 0 ? (totalProd / totalUnidades) : 0;
            const costoTotal = stock * costoUnit;
            const ventaTotal = stock * precio;
            const utilidad = ventaTotal - costoTotal;
            totalCosto += costoTotal;
            totalUtilidad += utilidad;
            htmlVentas += `<tr>
                <td>${textCell(p.nombre)}</td><td>${stock}</td>
                <td style="text-align:right;">${costoUnit.toFixed(2)}</td>
                <td style="text-align:right;">${costoTotal.toFixed(2)}</td>
                <td style="text-align:right;">${precio.toFixed(2)}</td>
                <td style="text-align:right; color:${utilidad >= 0 ? 'green' : 'red'};">${utilidad.toFixed(2)}</td>
            </tr>`;
        });
        htmlVentas += `<tr style="font-weight:700; background:#edf3f9;">
            <td>TOTAL</td><td></td><td></td>
            <td style="text-align:right;">${totalCosto.toFixed(2)}</td><td></td>
            <td style="text-align:right; color:${totalUtilidad >= 0 ? 'green' : 'red'};">${totalUtilidad.toFixed(2)}</td>
        </tr>`;

        const ventasTbody = document.getElementById('costoVentasTable');
        if (ventasTbody) ventasTbody.innerHTML = htmlVentas;

    } catch (error) {
        console.error('❌ Error generando costos:', error);
        showAlert('Error al generar costos: ' + error.message, 'error');
    }
}