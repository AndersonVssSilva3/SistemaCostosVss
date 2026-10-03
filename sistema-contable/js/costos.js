// ==================== COSTOS - MAYOR FÁBRICA, HOJA DE COSTOS, ETC. ====================

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

async function generarCostos() {
    try {
        // -------- Calcular desde asientos reales --------
        const asientos = await DB.getAll('asientos');
        
        // Saldos por cuenta
        const saldos = {};
        asientos.forEach(a => {
            a.lineas.forEach(l => {
                if (!saldos[l.cuenta]) saldos[l.cuenta] = 0;
                saldos[l.cuenta] += (l.debe || 0) - (l.haber || 0);
            });
        });
        
        // Costos por naturaleza (Elemento 9)
        const mp = Math.abs(saldos['901'] || 0);   // Materias Primas
        const mod = Math.abs(saldos['902'] || 0);  // Mano de Obra Directa
        const cif = Math.abs(saldos['903'] || 0);  // Costos Indirectos
        const gastosAdmin = Math.abs(saldos['904'] || 0);
        const gastosVenta = Math.abs(saldos['905'] || 0);
        const totalProd = mp + mod + cif;
        
        // -------- Mayor de Fábrica --------
        document.getElementById('mayorFabTable').innerHTML = `
            <tr><td>MP</td><td>Materia Prima Directa</td><td style="text-align:right;">${mp.toFixed(2)}</td></tr>
            <tr><td>MOD</td><td>Mano de Obra Directa</td><td style="text-align:right;">${mod.toFixed(2)}</td></tr>
            <tr><td>CIF</td><td>Costos Indirectos de Fabricación</td><td style="text-align:right;">${cif.toFixed(2)}</td></tr>
            <tr style="font-weight:700;">
                <td></td><td>TOTAL COSTO PRODUCCIÓN</td>
                <td style="text-align:right;">${totalProd.toFixed(2)}</td>
            </tr>
        `;
        
        // -------- Hoja de Costos (por producto) --------
        const productos = await DB.getAll('productos');
        const totalUnidades = productos.reduce((s, p) => s + (Number(p.stock) || 0), 0) || 1;
        const costoUnitMP = mp / totalUnidades;
        const costoUnitMOD = mod / totalUnidades;
        const costoUnitCIF = cif / totalUnidades;
        
        document.getElementById('hojaCostosTable').innerHTML = `
            <tr><td>Materia Prima</td>
                <td style="text-align:right;">${costoUnitMP.toFixed(2)}</td>
                <td style="text-align:right;">${totalUnidades}</td>
                <td style="text-align:right;">${mp.toFixed(2)}</td></tr>
            <tr><td>Mano de Obra</td>
                <td style="text-align:right;">${costoUnitMOD.toFixed(2)}</td>
                <td style="text-align:right;">${totalUnidades}</td>
                <td style="text-align:right;">${mod.toFixed(2)}</td></tr>
            <tr><td>Costos Indirectos</td>
                <td style="text-align:right;">${costoUnitCIF.toFixed(2)}</td>
                <td style="text-align:right;">${totalUnidades}</td>
                <td style="text-align:right;">${cif.toFixed(2)}</td></tr>
            <tr style="font-weight:700;">
                <td>TOTAL</td>
                <td style="text-align:right;">${(costoUnitMP + costoUnitMOD + costoUnitCIF).toFixed(2)}</td>
                <td style="text-align:right;">${totalUnidades}</td>
                <td style="text-align:right;">${totalProd.toFixed(2)}</td></tr>
        `;
        
        // -------- Fijos y Variables (desde centro de costos) --------
        const centros = await DB.getAll('centrosCosto');
        const fijosTotal = centros.reduce((s, c) => s + (Number(c.gastado) || 0), 0);
        
        document.getElementById('costosFijosVarTable').innerHTML = `
            <tr><td>Costos Administrativos (Centros de Costo)</td>
                <td><span class="status-badge status-valid">Fijo</span></td>
                <td style="text-align:right;">${fijosTotal.toFixed(2)}</td></tr>
            <tr><td>Gastos de Administración (904)</td>
                <td><span class="status-badge status-valid">Fijo</span></td>
                <td style="text-align:right;">${gastosAdmin.toFixed(2)}</td></tr>
            <tr><td>Materia Prima (901)</td>
                <td><span class="status-badge status-pending">Variable</span></td>
                <td style="text-align:right;">${mp.toFixed(2)}</td></tr>
            <tr><td>Gastos de Venta (905)</td>
                <td><span class="status-badge status-pending">Variable</span></td>
                <td style="text-align:right;">${gastosVenta.toFixed(2)}</td></tr>
        `;
        
        // -------- Costo de Ventas (por producto) --------
        let htmlVentas = '';
        let totalCosto = 0;
        let totalUtilidad = 0;
        
        productos.forEach(p => {
            const stock = Number(p.stock) || 0;
            const precio = Number(p.precio) || 0;
            const costoUnit = stock > 0 ? (totalProd / totalUnidades) : 0;
            const costoTotal = stock * costoUnit;
            const ventaTotal = stock * precio;
            const utilidad = ventaTotal - costoTotal;
            
            totalCosto += costoTotal;
            totalUtilidad += utilidad;
            
            htmlVentas += `
                <tr>
                    <td>${textCell(p.nombre)}</td>
                    <td>${stock}</td>
                    <td style="text-align:right;">${costoUnit.toFixed(2)}</td>
                    <td style="text-align:right;">${costoTotal.toFixed(2)}</td>
                    <td style="text-align:right;">${precio.toFixed(2)}</td>
                    <td style="text-align:right; color:${utilidad >= 0 ? 'green' : 'red'};">${utilidad.toFixed(2)}</td>
                </tr>
            `;
        });
        
        htmlVentas += `
            <tr style="font-weight:700;">
                <td>TOTAL</td><td></td><td></td>
                <td style="text-align:right;">${totalCosto.toFixed(2)}</td>
                <td></td>
                <td style="text-align:right; color:${totalUtilidad >= 0 ? 'green' : 'red'};">${totalUtilidad.toFixed(2)}</td>
            </tr>
        `;
        
        document.getElementById('costoVentasTable').innerHTML = htmlVentas;
        
    } catch (error) {
        console.error('Error generando costos:', error);
        showAlert('Error al generar costos: ' + error.message, 'error');
    }
}