// ==================== RATIOS FINANCIEROS ====================
// Cálculo e interpretación de ratios para análisis financiero
// Basado en el Plan Contable General Empresarial (PCGE) peruano

const Ratios = {
    // ==================== HELPERS ====================
    
    // Suma el saldo (debe - haber) de cuentas que empiezan con prefijo
    saldoPorPrefijo(asientos, prefijo) {
        let saldo = 0;
        asientos.forEach(a => {
            (a.lineas || []).forEach(l => {
                const cuenta = String(l.cuenta || '');
                if (cuenta.startsWith(prefijo)) {
                    saldo += (Number(l.debe) || 0) - (Number(l.haber) || 0);
                }
            });
        });
        return saldo;
    },
    
    // Suma solo debe o solo haber por prefijo
    totalDebe(asientos, prefijo) {
        let total = 0;
        asientos.forEach(a => {
            (a.lineas || []).forEach(l => {
                if (String(l.cuenta || '').startsWith(prefijo)) {
                    total += Number(l.debe) || 0;
                }
            });
        });
        return total;
    },
    
    totalHaber(asientos, prefijo) {
        let total = 0;
        asientos.forEach(a => {
            (a.lineas || []).forEach(l => {
                if (String(l.cuenta || '').startsWith(prefijo)) {
                    total += Number(l.haber) || 0;
                }
            });
        });
        return total;
    },
    
    // Formato de número
    fmt(n) {
        return Number(n || 0).toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    fmtPct(n) {
        return (Number(n) || 0).toFixed(2) + '%';
    },
    
    fmtRatio(n) {
        return (Number(n) || 0).toFixed(2);
    },
    
    // Semáforo según valor y benchmark
    semaforo(valor, min, max, tipo = 'normal') {
        // tipo: 'normal' (ideal entre min-max), 'mayor' (ideal >min), 'menor' (ideal <max)
        if (tipo === 'mayor') {
            if (valor >= max) return { icon: '🟢', clase: 'ok', texto: 'Óptimo' };
            if (valor >= min) return { icon: '🟡', clase: 'warn', texto: 'Aceptable' };
            return { icon: '🔴', clase: 'bad', texto: 'Crítico' };
        }
        if (tipo === 'menor') {
            if (valor <= min) return { icon: '🟢', clase: 'ok', texto: 'Óptimo' };
            if (valor <= max) return { icon: '🟡', clase: 'warn', texto: 'Aceptable' };
            return { icon: '🔴', clase: 'bad', texto: 'Crítico' };
        }
        // normal: ideal entre min y max
        if (valor >= min && valor <= max) return { icon: '🟢', clase: 'ok', texto: 'Óptimo' };
        if ((valor >= min * 0.8 && valor < min) || (valor > max && valor <= max * 1.2)) {
            return { icon: '🟡', clase: 'warn', texto: 'Aceptable' };
        }
        return { icon: '🔴', clase: 'bad', texto: 'Crítico' };
    },
    
    // ==================== CÁLCULO GLOBAL ====================
    async calcularTodos() {
        const asientos = await DB.getAll('asientos');
        
        // ============ ACTIVO ============
        // Activo corriente (elementos 1, 2 sin depreciaciones)
        const activoCorriente =
            this.saldoPorPrefijo(asientos, '10') +  // Efectivo
            this.saldoPorPrefijo(asientos, '11') +  // Inversiones financieras
            this.saldoPorPrefijo(asientos, '12') +  // CxC Comerciales
            this.saldoPorPrefijo(asientos, '13') +  // CxC Relacionadas
            this.saldoPorPrefijo(asientos, '14') +  // CxC Personal
            this.saldoPorPrefijo(asientos, '16') +  // CxC Diversas
            this.saldoPorPrefijo(asientos, '17') +  // CxC Diversas Relac.
            this.saldoPorPrefijo(asientos, '18') +  // Servicios anticipados
            this.saldoPorPrefijo(asientos, '20') +  // Mercaderías
            this.saldoPorPrefijo(asientos, '21') +  // Productos terminados
            this.saldoPorPrefijo(asientos, '22') +  // Subproductos
            this.saldoPorPrefijo(asientos, '23') +  // Productos en proceso
            this.saldoPorPrefijo(asientos, '24') +  // Materias primas
            this.saldoPorPrefijo(asientos, '25') +  // Materiales auxiliares
            this.saldoPorPrefijo(asientos, '26') +  // Envases
            this.saldoPorPrefijo(asientos, '28');   // Existencias por recibir
        
        // Activo no corriente (elementos 3)
        const activoNoCorriente =
            this.saldoPorPrefijo(asientos, '30') +
            this.saldoPorPrefijo(asientos, '31') +
            this.saldoPorPrefijo(asientos, '32') +
            this.saldoPorPrefijo(asientos, '33') +
            this.saldoPorPrefijo(asientos, '34') +
            this.saldoPorPrefijo(asientos, '35') +
            this.saldoPorPrefijo(asientos, '37') +
            this.saldoPorPrefijo(asientos, '38') -
            Math.abs(this.saldoPorPrefijo(asientos, '39')); // Depreciación acumulada resta
        
        const activoTotal = activoCorriente + activoNoCorriente;
        
        // Inventarios (para prueba ácida)
        const inventarios =
            this.saldoPorPrefijo(asientos, '20') +
            this.saldoPorPrefijo(asientos, '21') +
            this.saldoPorPrefijo(asientos, '22') +
            this.saldoPorPrefijo(asientos, '23') +
            this.saldoPorPrefijo(asientos, '24') +
            this.saldoPorPrefijo(asientos, '25') +
            this.saldoPorPrefijo(asientos, '26') +
            this.saldoPorPrefijo(asientos, '28');
        
        // ============ PASIVO ============
        const pasivoCorriente =
            this.saldoPorPrefijo(asientos, '40') * -1 +  // Tributos por pagar
            this.saldoPorPrefijo(asientos, '41') * -1 +  // Remuneraciones
            this.saldoPorPrefijo(asientos, '42') * -1 +  // CxP Comerciales
            this.saldoPorPrefijo(asientos, '43') * -1 +  // CxP Relacionadas
            this.saldoPorPrefijo(asientos, '44') * -1 +  // CxP Accionistas
            this.saldoPorPrefijo(asientos, '45') * -1 +  // Obligaciones financieras
            this.saldoPorPrefijo(asientos, '46') * -1 +  // CxP Diversas
            this.saldoPorPrefijo(asientos, '47') * -1;   // CxP Diversas Relac.
        
        const pasivoNoCorriente =
            this.saldoPorPrefijo(asientos, '48') * -1 +  // Provisiones
            this.saldoPorPrefijo(asientos, '49') * -1;   // Pasivo diferido
        
        const pasivoTotal = pasivoCorriente + pasivoNoCorriente;
        
        // ============ PATRIMONIO ============
        const patrimonio =
            this.saldoPorPrefijo(asientos, '50') * -1 +
            this.saldoPorPrefijo(asientos, '51') * -1 +
            this.saldoPorPrefijo(asientos, '52') * -1 +
            this.saldoPorPrefijo(asientos, '56') * -1 +
            this.saldoPorPrefijo(asientos, '57') * -1 +
            this.saldoPorPrefijo(asientos, '58') * -1 +
            this.saldoPorPrefijo(asientos, '59') * -1;
        
        // ============ RESULTADOS ============
        const ventas = this.totalHaber(asientos, '70');
        const otrosIngresos = this.totalHaber(asientos, '75');
        const ingresosTotales = ventas + otrosIngresos;
        
        const costoVentas = this.totalDebe(asientos, '69');
        const gastosAdmin = this.totalDebe(asientos, '94');
        const gastosVenta = this.totalDebe(asientos, '95');
        const gastosPersonal = this.totalDebe(asientos, '62');
        const gastosServicios = this.totalDebe(asientos, '63');
        const gastosFinancieros = this.totalDebe(asientos, '67');
        
        const utilidadBruta = ventas - costoVentas;
        const utilidadOperativa = utilidadBruta - gastosAdmin - gastosVenta - gastosPersonal - gastosServicios;
        const utilidadNeta = ingresosTotales - costoVentas - gastosAdmin - gastosVenta - gastosPersonal - gastosServicios - gastosFinancieros;
        
        // Cuentas específicas
        const cuentasPorCobrar = this.saldoPorPrefijo(asientos, '12') + this.saldoPorPrefijo(asientos, '13');
        const cuentasPorPagar = Math.abs(this.saldoPorPrefijo(asientos, '42')) + Math.abs(this.saldoPorPrefijo(asientos, '43'));
        const efectivo = this.saldoPorPrefijo(asientos, '10');
        
        // ==================== RATIOS ====================
        
        // 💧 LIQUIDEZ
        const liquidezCorriente = pasivoCorriente !== 0 ? activoCorriente / pasivoCorriente : 0;
        const pruebaAcida = pasivoCorriente !== 0 ? (activoCorriente - inventarios) / pasivoCorriente : 0;
        const capitalTrabajo = activoCorriente - pasivoCorriente;
        
        // 💰 ENDEUDAMIENTO
        const endeudamientoTotal = activoTotal !== 0 ? pasivoTotal / activoTotal : 0;
        const apalancamiento = patrimonio !== 0 ? pasivoTotal / patrimonio : 0;
        const coberturaIntereses = gastosFinancieros !== 0 ? utilidadOperativa / gastosFinancieros : 0;
        
        // 📈 RENTABILIDAD
        const margenBruto = ventas !== 0 ? (utilidadBruta / ventas) * 100 : 0;
        const margenOperativo = ventas !== 0 ? (utilidadOperativa / ventas) * 100 : 0;
        const margenNeto = ingresosTotales !== 0 ? (utilidadNeta / ingresosTotales) * 100 : 0;
        const roa = activoTotal !== 0 ? (utilidadNeta / activoTotal) * 100 : 0;
        const roe = patrimonio !== 0 ? (utilidadNeta / patrimonio) * 100 : 0;
        
        // 🔄 GESTIÓN
        const rotacionInventarios = inventarios !== 0 ? costoVentas / inventarios : 0;
        const rotacionCartera = cuentasPorCobrar !== 0 ? ventas / cuentasPorCobrar : 0;
        const rotacionPagos = cuentasPorPagar !== 0 ? this.totalDebe(asientos, '60') / cuentasPorPagar : 0;
        
        // ==================== RESULTADO ====================
        return {
            // Datos base
            activoCorriente,
            activoNoCorriente,
            activoTotal,
            pasivoCorriente,
            pasivoNoCorriente,
            pasivoTotal,
            patrimonio,
            inventarios,
            efectivo,
            cuentasPorCobrar,
            cuentasPorPagar,
            ventas,
            ingresosTotales,
            utilidadBruta,
            utilidadOperativa,
            utilidadNeta,
            
            // Ratios calculados
            ratios: {
                // Liquidez
                liquidezCorriente: {
                    valor: liquidezCorriente,
                    nombre: 'Liquidez Corriente',
                    formula: 'Activo Corriente / Pasivo Corriente',
                    benchmark: '> 1.50',
                    tipo: 'mayor',
                    min: 1.20,
                    max: 1.50,
                    unidad: 'x',
                    interpretacion: 'Capacidad de pagar deudas a corto plazo'
                },
                pruebaAcida: {
                    valor: pruebaAcida,
                    nombre: 'Prueba Ácida',
                    formula: '(Activo Corriente − Inventarios) / Pasivo Corriente',
                    benchmark: '> 1.00',
                    tipo: 'mayor',
                    min: 0.80,
                    max: 1.00,
                    unidad: 'x',
                    interpretacion: 'Liquidez sin depender del inventario'
                },
                capitalTrabajo: {
                    valor: capitalTrabajo,
                    nombre: 'Capital de Trabajo',
                    formula: 'Activo Corriente − Pasivo Corriente',
                    benchmark: '> 0',
                    tipo: 'mayor',
                    min: 0,
                    max: 100000,
                    unidad: 'S/',
                    interpretacion: 'Recursos disponibles para operar',
                    esMoneda: true
                },
                
                // Endeudamiento
                endeudamientoTotal: {
                    valor: endeudamientoTotal,
                    nombre: 'Endeudamiento Total',
                    formula: 'Pasivo Total / Activo Total',
                    benchmark: '< 0.60',
                    tipo: 'menor',
                    min: 0.40,
                    max: 0.60,
                    unidad: '',
                    interpretacion: 'Proporción de activos financiados con deuda',
                    esPorcentaje: true
                },
                apalancamiento: {
                    valor: apalancamiento,
                    nombre: 'Apalancamiento',
                    formula: 'Pasivo Total / Patrimonio',
                    benchmark: '< 1.50',
                    tipo: 'menor',
                    min: 0.80,
                    max: 1.50,
                    unidad: 'x',
                    interpretacion: 'Relación entre deuda y capital propio'
                },
                coberturaIntereses: {
                    valor: coberturaIntereses,
                    nombre: 'Cobertura de Intereses',
                    formula: 'Utilidad Operativa / Gastos Financieros',
                    benchmark: '> 2.50',
                    tipo: 'mayor',
                    min: 1.50,
                    max: 2.50,
                    unidad: 'x',
                    interpretacion: 'Capacidad de pagar intereses'
                },
                
                // Rentabilidad
                margenBruto: {
                    valor: margenBruto,
                    nombre: 'Margen Bruto',
                    formula: '(Ventas − Costo de Ventas) / Ventas × 100',
                    benchmark: '25% – 30%',
                    tipo: 'normal',
                    min: 25,
                    max: 30,
                    unidad: '%',
                    interpretacion: 'Ganancia después del costo directo'
                },
                margenOperativo: {
                    valor: margenOperativo,
                    nombre: 'Margen Operativo',
                    formula: 'Utilidad Operativa / Ventas × 100',
                    benchmark: '4% – 6%',
                    tipo: 'normal',
                    min: 4,
                    max: 6,
                    unidad: '%',
                    interpretacion: 'Ganancia antes de gastos financieros'
                },
                margenNeto: {
                    valor: margenNeto,
                    nombre: 'Margen Neto',
                    formula: 'Utilidad Neta / Ventas × 100',
                    benchmark: '2% – 3%',
                    tipo: 'normal',
                    min: 2,
                    max: 3,
                    unidad: '%',
                    interpretacion: 'Ganancia final después de todos los gastos'
                },
                roa: {
                    valor: roa,
                    nombre: 'ROA',
                    formula: 'Utilidad Neta / Activo Total × 100',
                    benchmark: '> 5%',
                    tipo: 'mayor',
                    min: 3,
                    max: 5,
                    unidad: '%',
                    interpretacion: 'Rentabilidad sobre los activos'
                },
                roe: {
                    valor: roe,
                    nombre: 'ROE',
                    formula: 'Utilidad Neta / Patrimonio × 100',
                    benchmark: '> 10%',
                    tipo: 'mayor',
                    min: 8,
                    max: 10,
                    unidad: '%',
                    interpretacion: 'Rentabilidad sobre el capital propio'
                },
                
                // Gestión
                rotacionInventarios: {
                    valor: rotacionInventarios,
                    nombre: 'Rotación de Inventarios',
                    formula: 'Costo de Ventas / Inventario Promedio',
                    benchmark: '> 6 veces/año',
                    tipo: 'mayor',
                    min: 4,
                    max: 6,
                    unidad: 'veces',
                    interpretacion: 'Cuántas veces se renueva el inventario al año'
                },
                rotacionCartera: {
                    valor: rotacionCartera,
                    nombre: 'Rotación de Cartera',
                    formula: 'Ventas / Cuentas por Cobrar',
                    benchmark: '> 6 veces/año',
                    tipo: 'mayor',
                    min: 4,
                    max: 6,
                    unidad: 'veces',
                    interpretacion: 'Cuántas veces se cobran las cuentas al año'
                },
                rotacionPagos: {
                    valor: rotacionPagos,
                    nombre: 'Rotación de Pagos',
                    formula: 'Compras / Cuentas por Pagar',
                    benchmark: '< 6 veces/año',
                    tipo: 'menor',
                    min: 4,
                    max: 6,
                    unidad: 'veces',
                    interpretacion: 'Cuántas veces se pagan las cuentas al año'
                }
            }
        };
    }
};