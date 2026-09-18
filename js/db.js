

// Importar cliente (usando CDN en el HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>



function initSupabase() {
    if (supabaseClient) return true;  // ← Ya está inicializado
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase inicializado');
        return true;
    }
    console.error('❌ Supabase no está cargado');
    return false;
}

// ==================== DB - Capa de abstracción ASÍNCRONA ====================
const DB = {
    // -------- GET ALL (asíncrono) --------
    async getAll(key) {
        if (!supabaseClient) initSupabase();
        const tableName = this._mapKey(key);
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            console.error(`Error en getAll(${key}):`, error);
            return [];
        }
        return data || [];
    },

    // -------- GET ONE --------
    async get(key, id) {
        if (!supabaseClient) initSupabase();
        const tableName = this._mapKey(key);
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) return null;
        return data;
    },

    // -------- INSERT --------
    async insert(key, record) {
        if (!supabaseClient) initSupabase();
        const tableName = this._mapKey(key);
        const { data, error } = await supabaseClient
            .from(tableName)
            .insert([record])
            .select();
        
        if (error) {
            console.error(`Error en insert(${key}):`, error);
            throw error;
        }
        return data[0];
    },

    // -------- UPDATE --------
    async update(key, id, record) {
        if (!supabaseClient) initSupabase();
        const tableName = this._mapKey(key);
        const { data, error } = await supabaseClient
            .from(tableName)
            .update(record)
            .eq('id', id)
            .select();
        
        if (error) {
            console.error(`Error en update(${key}):`, error);
            throw error;
        }
        return data[0];
    },

    // -------- DELETE --------
    async delete(key, id) {
        if (!supabaseClient) initSupabase();
        const tableName = this._mapKey(key);
        const { error } = await supabaseClient
            .from(tableName)
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error(`Error en delete(${key}):`, error);
            throw error;
        }
        return true;
    },

    // -------- BULK INSERT (para migración inicial) --------
    async bulkInsert(key, records) {
        if (!supabaseClient) initSupabase();
        const tableName = this._mapKey(key);
        const { data, error } = await supabaseClient
            .from(tableName)
            .insert(records)
            .select();
        
        if (error) {
            console.error(`Error en bulkInsert(${key}):`, error);
            throw error;
        }
        return data;
    },

    // -------- DELETE ALL (cuidado) --------
    async deleteAll(key) {
        if (!supabaseClient) initSupabase();
        const tableName = this._mapKey(key);
        const { error } = await supabaseClient
            .from(tableName)
            .delete()
            .neq('id', 0);  // Elimina todos
        
        if (error) throw error;
        return true;
    },

    // -------- MAPEO de claves locales a nombres de tabla --------
    _mapKey(key) {
        const map = {
            'cuentas': 'cuentas',
            'planJerarquico': 'plan_jerarquico',
            'asientos': 'asientos',
            'compras': 'compras',
            'ventas': 'ventas',
            'planillas': 'planillas',
            'mercaderias': 'mercaderias',
            'activoFijo': 'activo_fijo',
            'centrosCosto': 'centros_costo',
            'inductores': 'inductores',
            'repuestos': 'repuestos',
            'ajustes': 'ajustes',
            'productos': 'productos'
        };
        return map[key] || key;
    }
};

// ==================== PLAN CONTABLE PCGE (se mantiene igual) ====================
const PLAN_CONTABLE_PCGE = [
    // ============ ELEMENTO 1: ACTIVO DISPONIBLE Y EXIGIBLE ============
    {
        codigo: '10', nombre: 'Efectivo y Equivalentes de Efectivo', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '101', nombre: 'Caja' },
            { codigo: '102', nombre: 'Fondos Fijos' },
            { codigo: '103', nombre: 'Efectivo en Tránsito' },
            { codigo: '104', nombre: 'Cuentas Corrientes en Instituciones Financieras' },
            { codigo: '105', nombre: 'Certificados Bancarios' },
            { codigo: '106', nombre: 'Depósitos a Plazo' },
            { codigo: '107', nombre: 'Fondos Sujetos a Restricción' },
            { codigo: '108', nombre: 'Otros Equivalentes de Efectivo' },
            { codigo: '109', nombre: 'Otros Activos Financieros' }
        ]
    },
    {
        codigo: '11', nombre: 'Inversiones Financieras', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '111', nombre: 'Inversiones al Valor Razonable' },
            { codigo: '112', nombre: 'Inversiones al Costo' },
            { codigo: '113', nombre: 'Inversiones Disponibles para la Venta' },
            { codigo: '114', nombre: 'Inversiones en Subsidiarias' },
            { codigo: '115', nombre: 'Inversiones en Asociadas' },
            { codigo: '116', nombre: 'Inversiones en Negocios Conjuntos' }
        ]
    },
    {
        codigo: '12', nombre: 'Cuentas por Cobrar Comerciales - Terceros', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '121', nombre: 'Facturas, Boletas y Otros Comprobantes por Cobrar' },
            { codigo: '122', nombre: 'Letras por Cobrar' },
            { codigo: '123', nombre: 'Documentos por Cobrar' },
            { codigo: '124', nombre: 'Papeles Comerciales por Cobrar' },
            { codigo: '125', nombre: 'Cuentas por Cobrar a Vinculadas' },
            { codigo: '126', nombre: 'Cuentas por Cobrar Diversas' },
            { codigo: '127', nombre: 'Cuentas por Cobrar Comerciales - En Cobranza Judicial' },
            { codigo: '128', nombre: 'Cuentas por Cobrar Comerciales - Deterioradas' },
            { codigo: '129', nombre: 'Cobranza Dudosa' }
        ]
    },
    {
        codigo: '13', nombre: 'Cuentas por Cobrar Comerciales - Relacionadas', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '131', nombre: 'Cuentas por Cobrar a Vinculadas - Facturas' },
            { codigo: '132', nombre: 'Cuentas por Cobrar a Vinculadas - Letras' },
            { codigo: '133', nombre: 'Cuentas por Cobrar a Vinculadas - Otras' }
        ]
    },
    {
        codigo: '14', nombre: 'Cuentas por Cobrar al Personal, a los Accionistas y Directores', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '141', nombre: 'Cuentas por Cobrar al Personal' },
            { codigo: '142', nombre: 'Cuentas por Cobrar a los Accionistas' },
            { codigo: '143', nombre: 'Cuentas por Cobrar a los Directores' },
            { codigo: '144', nombre: 'Préstamos al Personal' },
            { codigo: '145', nombre: 'Adelantos al Personal' }
        ]
    },
    {
        codigo: '16', nombre: 'Cuentas por Cobrar Diversas - Terceros', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '161', nombre: 'Cuentas por Cobrar Diversas - Terceros' },
            { codigo: '162', nombre: 'Reclamos a Terceros' },
            { codigo: '163', nombre: 'Intereses por Cobrar' },
            { codigo: '164', nombre: 'Depósitos en Garantía' },
            { codigo: '165', nombre: 'Cuentas por Cobrar Diversas - Deterioradas' }
        ]
    },
    {
        codigo: '17', nombre: 'Cuentas por Cobrar Diversas - Relacionadas', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '171', nombre: 'Cuentas por Cobrar Diversas a Vinculadas' },
            { codigo: '172', nombre: 'Reclamos a Vinculadas' },
            { codigo: '173', nombre: 'Intereses por Cobrar a Vinculadas' },
            { codigo: '174', nombre: 'Depósitos en Garantía a Vinculadas' }
        ]
    },
    {
        codigo: '18', nombre: 'Servicios y Otros Contratados por Anticipado', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '181', nombre: 'Costos y Gastos Pagados por Anticipado' },
            { codigo: '182', nombre: 'Seguros Pagados por Anticipado' },
            { codigo: '183', nombre: 'Alquileres Pagados por Anticipado' },
            { codigo: '184', nombre: 'Primas Pagadas por Anticipado' },
            { codigo: '185', nombre: 'Intereses Pagados por Anticipado' }
        ]
    },
    {
        codigo: '19', nombre: 'Estimación de Cuentas de Cobranza Dudosa', tipo: 'activo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '191', nombre: 'Estimación de Cuentas por Cobrar Comerciales' },
            { codigo: '192', nombre: 'Estimación de Cuentas por Cobrar Diversas' },
            { codigo: '193', nombre: 'Estimación de Cuentas por Cobrar al Personal' }
        ]
    },

    // ============ ELEMENTO 2: ACTIVO REALIZABLE ============
    {
        codigo: '20', nombre: 'Mercaderías', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '201', nombre: 'Mercaderías - Costo' },
            { codigo: '202', nombre: 'Mercaderías - Valor Razonable' },
            { codigo: '203', nombre: 'Mercaderías - Deterioro' },
            { codigo: '209', nombre: 'Mercaderías - Otras' }
        ]
    },
    {
        codigo: '21', nombre: 'Productos Terminados', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '211', nombre: 'Productos Terminados - Costo' },
            { codigo: '212', nombre: 'Productos Terminados - Valor Razonable' },
            { codigo: '213', nombre: 'Productos Terminados - Deterioro' }
        ]
    },
    {
        codigo: '22', nombre: 'Subproductos, Desechos y Desperdicios', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '221', nombre: 'Subproductos' },
            { codigo: '222', nombre: 'Desechos' },
            { codigo: '223', nombre: 'Desperdicios' }
        ]
    },
    {
        codigo: '23', nombre: 'Productos en Proceso', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '231', nombre: 'Productos en Proceso - Costo' },
            { codigo: '232', nombre: 'Productos en Proceso - Valor Razonable' },
            { codigo: '233', nombre: 'Productos en Proceso - Deterioro' }
        ]
    },
    {
        codigo: '24', nombre: 'Materias Primas y Auxiliares', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '241', nombre: 'Materias Primas' },
            { codigo: '242', nombre: 'Materiales Auxiliares' },
            { codigo: '243', nombre: 'Materiales de Embalaje' },
            { codigo: '244', nombre: 'Combustibles y Lubricantes' }
        ]
    },
    {
        codigo: '25', nombre: 'Materiales Auxiliares, Suministros y Repuestos', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '251', nombre: 'Materiales Auxiliares' },
            { codigo: '252', nombre: 'Suministros' },
            { codigo: '253', nombre: 'Repuestos' },
            { codigo: '254', nombre: 'Herramientas' },
            { codigo: '255', nombre: 'Útiles de Escritorio' }
        ]
    },
    {
        codigo: '26', nombre: 'Envases y Embalajes', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '261', nombre: 'Envases' },
            { codigo: '262', nombre: 'Embalajes' }
        ]
    },
    {
        codigo: '27', nombre: 'Activos No Corrientes Mantenidos para la Venta', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '271', nombre: 'Activos No Corrientes Mantenidos para la Venta' },
            { codigo: '272', nombre: 'Activos Biológicos Mantenidos para la Venta' },
            { codigo: '273', nombre: 'Deterioro Acumulado de Activos No Corrientes' }
        ]
    },
    {
        codigo: '28', nombre: 'Existencias por Recibir', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '281', nombre: 'Existencias por Recibir' },
            { codigo: '282', nombre: 'Existencias en Tránsito' }
        ]
    },
    {
        codigo: '29', nombre: 'Desvalorización de Existencias', tipo: 'activo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '291', nombre: 'Desvalorización de Mercaderías' },
            { codigo: '292', nombre: 'Desvalorización de Productos Terminados' },
            { codigo: '293', nombre: 'Desvalorización de Productos en Proceso' },
            { codigo: '294', nombre: 'Desvalorización de Materias Primas' }
        ]
    },

    // ============ ELEMENTO 3: ACTIVO INMOVILIZADO ============
    {
        codigo: '30', nombre: 'Inversiones Mobiliarias', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '301', nombre: 'Inversiones en Acciones' },
            { codigo: '302', nombre: 'Inversiones en Bonos' },
            { codigo: '303', nombre: 'Inversiones en Papeles Comerciales' }
        ]
    },
    {
        codigo: '31', nombre: 'Inversiones Inmobiliarias', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '311', nombre: 'Terrenos' },
            { codigo: '312', nombre: 'Edificaciones' },
            { codigo: '313', nombre: 'Muebles y Enseres' }
        ]
    },
    {
        codigo: '32', nombre: 'Activos Biológicos', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '321', nombre: 'Activos Biológicos en Producción' },
            { codigo: '322', nombre: 'Activos Biológicos en Crecimiento' },
            { codigo: '323', nombre: 'Activos Biológicos Terminados' }
        ]
    },
    {
        codigo: '33', nombre: 'Inmuebles, Maquinaria y Equipo', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '331', nombre: 'Terrenos' },
            { codigo: '332', nombre: 'Edificaciones' },
            { codigo: '333', nombre: 'Maquinarias y Equipos de Explotación' },
            { codigo: '334', nombre: 'Unidades de Transporte' },
            { codigo: '335', nombre: 'Muebles y Enseres' },
            { codigo: '336', nombre: 'Equipos Diversos' },
            { codigo: '337', nombre: 'Herramientas y Unidades de Reemplazo' },
            { codigo: '338', nombre: 'Unidades por Recibir' },
            { codigo: '339', nombre: 'Obras en Curso' }
        ]
    },
    {
        codigo: '34', nombre: 'Intangibles', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '341', nombre: 'Concesiones y Derechos' },
            { codigo: '342', nombre: 'Patentes y Propiedad Industrial' },
            { codigo: '343', nombre: 'Marcas' },
            { codigo: '344', nombre: 'Derechos de Autor' },
            { codigo: '345', nombre: 'Licencias y Derechos de Software' },
            { codigo: '346', nombre: 'Plusvalía Comercial (Goodwill)' },
            { codigo: '347', nombre: 'Derechos de Franquicia' }
        ]
    },
    {
        codigo: '35', nombre: 'Activos Biológicos en Producción', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '351', nombre: 'Activos Biológicos en Producción - Costo' },
            { codigo: '352', nombre: 'Activos Biológicos en Producción - Valor Razonable' }
        ]
    },
    {
        codigo: '36', nombre: 'Desvalorización de Activos Inmovilizados', tipo: 'activo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '361', nombre: 'Desvalorización de Inversiones Inmobiliarias' },
            { codigo: '362', nombre: 'Desvalorización de Activos Biológicos' },
            { codigo: '363', nombre: 'Desvalorización de Inmuebles, Maquinaria y Equipo' },
            { codigo: '364', nombre: 'Desvalorización de Intangibles' }
        ]
    },
    {
        codigo: '37', nombre: 'Activo Diferido', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '371', nombre: 'Impuesto a la Renta Diferido' },
            { codigo: '372', nombre: 'Gastos Diferidos' }
        ]
    },
    {
        codigo: '38', nombre: 'Otros Activos', tipo: 'activo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '381', nombre: 'Bienes en Arrendamiento Financiero' },
            { codigo: '382', nombre: 'Depósitos en Garantía' },
            { codigo: '383', nombre: 'Otros Activos Diversos' }
        ]
    },
    {
        codigo: '39', nombre: 'Depreciación, Amortización y Agotamiento Acumulados', tipo: 'activo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '391', nombre: 'Depreciación Acumulada - Inversiones Inmobiliarias' },
            { codigo: '392', nombre: 'Depreciación Acumulada - Inmuebles, Maquinaria y Equipo' },
            { codigo: '393', nombre: 'Depreciación Acumulada - Activos Biológicos' },
            { codigo: '394', nombre: 'Amortización Acumulada - Intangibles' },
            { codigo: '395', nombre: 'Agotamiento Acumulado' }
        ]
    },

    // ============ ELEMENTO 4: PASIVO ============
    {
        codigo: '40', nombre: 'Tributos, Contraprestaciones y Aportes al Sistema de Pensiones y de Salud por Pagar', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '401', nombre: 'Impuesto General a las Ventas (IGV)' },
            { codigo: '402', nombre: 'Impuesto Selectivo al Consumo' },
            { codigo: '403', nombre: 'Impuesto a la Renta' },
            { codigo: '404', nombre: 'Impuesto a las Transacciones Financieras' },
            { codigo: '405', nombre: 'Impuesto Temporal a los Activos Netos' },
            { codigo: '406', nombre: 'Otros Impuestos' },
            { codigo: '407', nombre: 'Aportes al Sistema de Pensiones (AFP/ONP)' },
            { codigo: '408', nombre: 'Aportes a ESSALUD' },
            { codigo: '409', nombre: 'Otros Tributos por Pagar' }
        ]
    },
    {
        codigo: '41', nombre: 'Remuneraciones y Participaciones por Pagar', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '411', nombre: 'Sueldos y Salarios por Pagar' },
            { codigo: '412', nombre: 'Comisiones por Pagar' },
            { codigo: '413', nombre: 'Gratificaciones por Pagar' },
            { codigo: '414', nombre: 'Vacaciones por Pagar' },
            { codigo: '415', nombre: 'CTS por Pagar' },
            { codigo: '416', nombre: 'Participaciones de los Trabajadores' },
            { codigo: '417', nombre: 'Indemnizaciones por Pagar' }
        ]
    },
    {
        codigo: '42', nombre: 'Cuentas por Pagar Comerciales - Terceros', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '421', nombre: 'Facturas, Boletas y Otros Comprobantes por Pagar' },
            { codigo: '422', nombre: 'Letras por Pagar' },
            { codigo: '423', nombre: 'Documentos por Pagar' },
            { codigo: '424', nombre: 'Papeles Comerciales por Pagar' },
            { codigo: '425', nombre: 'Cuentas por Pagar a Vinculadas' },
            { codigo: '426', nombre: 'Cuentas por Pagar Diversas' },
            { codigo: '427', nombre: 'Cuentas por Pagar Comerciales - En Cobranza Judicial' }
        ]
    },
    {
        codigo: '43', nombre: 'Cuentas por Pagar Comerciales - Relacionadas', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '431', nombre: 'Cuentas por Pagar a Vinculadas - Facturas' },
            { codigo: '432', nombre: 'Cuentas por Pagar a Vinculadas - Letras' },
            { codigo: '433', nombre: 'Cuentas por Pagar a Vinculadas - Otras' }
        ]
    },
    {
        codigo: '44', nombre: 'Cuentas por Pagar a los Accionistas, Directores y Gerentes', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '441', nombre: 'Cuentas por Pagar a los Accionistas' },
            { codigo: '442', nombre: 'Cuentas por Pagar a los Directores' },
            { codigo: '443', nombre: 'Cuentas por Pagar a los Gerentes' },
            { codigo: '444', nombre: 'Dividendos por Pagar' }
        ]
    },
    {
        codigo: '45', nombre: 'Obligaciones Financieras', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '451', nombre: 'Préstamos Bancarios' },
            { codigo: '452', nombre: 'Sobregiros Bancarios' },
            { codigo: '453', nombre: 'Letras por Pagar a Bancos' },
            { codigo: '454', nombre: 'Arrendamiento Financiero' },
            { codigo: '455', nombre: 'Pagarés por Pagar' },
            { codigo: '456', nombre: 'Bonos por Pagar' }
        ]
    },
    {
        codigo: '46', nombre: 'Cuentas por Pagar Diversas - Terceros', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '461', nombre: 'Cuentas por Pagar Diversas - Terceros' },
            { codigo: '462', nombre: 'Reclamos de Terceros' },
            { codigo: '463', nombre: 'Intereses por Pagar' },
            { codigo: '464', nombre: 'Depósitos en Garantía Recibidos' },
            { codigo: '465', nombre: 'Cuentas por Pagar Diversas - Otras' }
        ]
    },
    {
        codigo: '47', nombre: 'Cuentas por Pagar Diversas - Relacionadas', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '471', nombre: 'Cuentas por Pagar Diversas a Vinculadas' },
            { codigo: '472', nombre: 'Reclamos de Vinculadas' },
            { codigo: '473', nombre: 'Intereses por Pagar a Vinculadas' }
        ]
    },
    {
        codigo: '48', nombre: 'Provisiones', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '481', nombre: 'Provisión para Beneficios Sociales' },
            { codigo: '482', nombre: 'Provisión para Contingencias' },
            { codigo: '483', nombre: 'Provisión para Desmantelamiento' }
        ]
    },
    {
        codigo: '49', nombre: 'Pasivo Diferido', tipo: 'pasivo', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '491', nombre: 'Impuesto a la Renta Diferido' },
            { codigo: '492', nombre: 'Ingresos Diferidos' },
            { codigo: '493', nombre: 'Ganancias Diferidas' }
        ]
    },

    // ============ ELEMENTO 5: PATRIMONIO ============
    {
        codigo: '50', nombre: 'Capital', tipo: 'patrimonio', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '501', nombre: 'Capital Social' },
            { codigo: '502', nombre: 'Capital Adicional' },
            { codigo: '503', nombre: 'Acciones de Inversión' },
            { codigo: '504', nombre: 'Acciones de Tesorería' }
        ]
    },
    {
        codigo: '51', nombre: 'Acciones de Inversión', tipo: 'patrimonio', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '511', nombre: 'Acciones de Inversión' },
            { codigo: '512', nombre: 'Prima de Acciones de Inversión' }
        ]
    },
    {
        codigo: '52', nombre: 'Capital Adicional', tipo: 'patrimonio', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '521', nombre: 'Prima de Acciones' },
            { codigo: '522', nombre: 'Aportes de Capital' },
            { codigo: '523', nombre: 'Donaciones' }
        ]
    },
    {
        codigo: '56', nombre: 'Resultados No Realizados', tipo: 'patrimonio', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '561', nombre: 'Resultados por Valorización de Inversiones' },
            { codigo: '562', nombre: 'Resultados por Valorización de Activos Biológicos' },
            { codigo: '563', nombre: 'Resultados por Cobertura de Flujos de Efectivo' }
        ]
    },
    {
        codigo: '57', nombre: 'Excedente de Revaluación', tipo: 'patrimonio', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '571', nombre: 'Excedente de Revaluación - Inmuebles' },
            { codigo: '572', nombre: 'Excedente de Revaluación - Maquinarias' },
            { codigo: '573', nombre: 'Excedente de Revaluación - Intangibles' }
        ]
    },
    {
        codigo: '58', nombre: 'Reservas', tipo: 'patrimonio', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '581', nombre: 'Reserva Legal' },
            { codigo: '582', nombre: 'Reserva Facultativa' },
            { codigo: '583', nombre: 'Reserva Estatutaria' },
            { codigo: '584', nombre: 'Reserva para Inversiones' }
        ]
    },
    {
        codigo: '59', nombre: 'Resultados Acumulados', tipo: 'patrimonio', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '591', nombre: 'Utilidades No Distribuidas' },
            { codigo: '592', nombre: 'Pérdidas Acumuladas' },
            { codigo: '593', nombre: 'Utilidad del Ejercicio' },
            { codigo: '594', nombre: 'Pérdida del Ejercicio' }
        ]
    },

    // ============ ELEMENTO 6: GASTOS POR NATURALEZA ============
    {
        codigo: '60', nombre: 'Compras', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '601', nombre: 'Mercaderías' },
            { codigo: '602', nombre: 'Materias Primas' },
            { codigo: '603', nombre: 'Materiales Auxiliares, Suministros y Repuestos' },
            { codigo: '604', nombre: 'Envases y Embalajes' },
            { codigo: '605', nombre: 'Materiales de Construcción' },
            { codigo: '606', nombre: 'Inmuebles, Maquinaria y Equipo' },
            { codigo: '607', nombre: 'Intangibles' }
        ]
    },
    {
        codigo: '61', nombre: 'Variación de Existencias', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '611', nombre: 'Variación de Mercaderías' },
            { codigo: '612', nombre: 'Variación de Productos Terminados' },
            { codigo: '613', nombre: 'Variación de Productos en Proceso' },
            { codigo: '614', nombre: 'Variación de Materias Primas' }
        ]
    },
    {
        codigo: '62', nombre: 'Gastos de Personal, Directores y Gerentes', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '621', nombre: 'Sueldos y Salarios' },
            { codigo: '622', nombre: 'Comisiones' },
            { codigo: '623', nombre: 'Gratificaciones' },
            { codigo: '624', nombre: 'Vacaciones' },
            { codigo: '625', nombre: 'CTS' },
            { codigo: '626', nombre: 'Indemnizaciones' },
            { codigo: '627', nombre: 'Seguridad y Previsión Social' },
            { codigo: '628', nombre: 'Capacitación' },
            { codigo: '629', nombre: 'Otros Gastos de Personal' }
        ]
    },
    {
        codigo: '63', nombre: 'Gastos de Servicios Prestados por Terceros', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '631', nombre: 'Transporte y Fletes' },
            { codigo: '632', nombre: 'Alquileres' },
            { codigo: '633', nombre: 'Servicios Básicos (Luz, Agua, Teléfono)' },
            { codigo: '634', nombre: 'Mantenimiento y Reparaciones' },
            { codigo: '635', nombre: 'Servicios Profesionales' },
            { codigo: '636', nombre: 'Seguros' },
            { codigo: '637', nombre: 'Publicidad y Marketing' },
            { codigo: '638', nombre: 'Servicios de Terceros - Otros' },
            { codigo: '639', nombre: 'Gastos Bancarios' }
        ]
    },
    {
        codigo: '64', nombre: 'Gastos por Tributos', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '641', nombre: 'Impuesto General a las Ventas' },
            { codigo: '642', nombre: 'Impuesto Selectivo al Consumo' },
            { codigo: '643', nombre: 'Impuesto a las Transacciones Financieras' },
            { codigo: '644', nombre: 'Impuesto Predial' },
            { codigo: '645', nombre: 'Impuesto Vehicular' },
            { codigo: '646', nombre: 'Otros Tributos' }
        ]
    },
    {
        codigo: '65', nombre: 'Otros Gastos de Gestión', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '651', nombre: 'Gastos de Viaje' },
            { codigo: '652', nombre: 'Gastos de Representación' },
            { codigo: '653', nombre: 'Gastos de Capacitación' },
            { codigo: '654', nombre: 'Gastos Legales y Notariales' },
            { codigo: '655', nombre: 'Suscripciones y Donaciones' },
            { codigo: '656', nombre: 'Gastos Diversos' }
        ]
    },
    {
        codigo: '66', nombre: 'Pérdida por Medición de Activos No Financieros al Valor Razonable', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '661', nombre: 'Pérdida por Medición de Existencias' },
            { codigo: '662', nombre: 'Pérdida por Medición de Activos Biológicos' },
            { codigo: '663', nombre: 'Pérdida por Medición de Inversiones Inmobiliarias' }
        ]
    },
    {
        codigo: '67', nombre: 'Gastos Financieros', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '671', nombre: 'Intereses de Préstamos' },
            { codigo: '672', nombre: 'Intereses de Sobregiros' },
            { codigo: '673', nombre: 'Intereses de Arrendamiento Financiero' },
            { codigo: '674', nombre: 'Diferencia de Cambio - Pérdida' },
            { codigo: '675', nombre: 'Comisiones Bancarias' }
        ]
    },
    {
        codigo: '68', nombre: 'Valuación y Deterioro de Activos y Provisiones', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '681', nombre: 'Depreciación de Inmuebles, Maquinaria y Equipo' },
            { codigo: '682', nombre: 'Amortización de Intangibles' },
            { codigo: '683', nombre: 'Agotamiento de Recursos Naturales' },
            { codigo: '684', nombre: 'Deterioro de Cuentas por Cobrar' },
            { codigo: '685', nombre: 'Deterioro de Existencias' },
            { codigo: '686', nombre: 'Provisión para Beneficios Sociales' }
        ]
    },
    {
        codigo: '69', nombre: 'Costo de Ventas', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '691', nombre: 'Costo de Mercaderías Vendidas' },
            { codigo: '692', nombre: 'Costo de Productos Terminados Vendidos' },
            { codigo: '693', nombre: 'Costo de Servicios Prestados' }
        ]
    },

    // ============ ELEMENTO 7: INGRESOS ============
    {
        codigo: '70', nombre: 'Ventas', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '701', nombre: 'Mercaderías' },
            { codigo: '702', nombre: 'Productos Terminados' },
            { codigo: '703', nombre: 'Subproductos, Desechos y Desperdicios' },
            { codigo: '704', nombre: 'Servicios Prestados' },
            { codigo: '705', nombre: 'Ventas de Bienes Inmuebles' }
        ]
    },
    {
        codigo: '71', nombre: 'Variación de la Producción Almacenada', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '711', nombre: 'Variación de Productos Terminados' },
            { codigo: '712', nombre: 'Variación de Productos en Proceso' },
            { codigo: '713', nombre: 'Variación de Subproductos' }
        ]
    },
    {
        codigo: '72', nombre: 'Producción de Activo Inmovilizado', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '721', nombre: 'Producción de Inmuebles, Maquinaria y Equipo' },
            { codigo: '722', nombre: 'Producción de Intangibles' },
            { codigo: '723', nombre: 'Producción de Activos Biológicos' }
        ]
    },
    {
        codigo: '73', nombre: 'Descuentos, Rebajas y Bonificaciones Obtenidos', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '731', nombre: 'Descuentos Obtenidos' },
            { codigo: '732', nombre: 'Rebajas Obtenidas' },
            { codigo: '733', nombre: 'Bonificaciones Obtenidas' }
        ]
    },
    {
        codigo: '74', nombre: 'Descuentos, Rebajas y Bonificaciones Concedidos', tipo: 'ingreso', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '741', nombre: 'Descuentos Concedidos' },
            { codigo: '742', nombre: 'Rebajas Concedidas' },
            { codigo: '743', nombre: 'Bonificaciones Concedidas' }
        ]
    },
    {
        codigo: '75', nombre: 'Otros Ingresos de Gestión', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '751', nombre: 'Intereses Ganados' },
            { codigo: '752', nombre: 'Ganancia por Diferencia de Cambio' },
            { codigo: '753', nombre: 'Ganancia por Venta de Activos' },
            { codigo: '754', nombre: 'Recuperación de Cuentas Castigadas' },
            { codigo: '755', nombre: 'Ingresos Diversos' }
        ]
    },
    {
        codigo: '76', nombre: 'Ganancia por Medición de Activos No Financieros al Valor Razonable', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '761', nombre: 'Ganancia por Medición de Existencias' },
            { codigo: '762', nombre: 'Ganancia por Medición de Activos Biológicos' },
            { codigo: '763', nombre: 'Ganancia por Medición de Inversiones Inmobiliarias' }
        ]
    },
    {
        codigo: '77', nombre: 'Ingresos Financieros', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '771', nombre: 'Intereses de Inversiones' },
            { codigo: '772', nombre: 'Dividendos Ganados' },
            { codigo: '773', nombre: 'Ganancia por Venta de Inversiones' }
        ]
    },
    {
        codigo: '78', nombre: 'Cargas Cubiertas por Provisiones', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '781', nombre: 'Cargas Cubiertas por Provisiones' }
        ]
    },
    {
        codigo: '79', nombre: 'Cargas Imputables a Cuentas de Costos y Gastos', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '791', nombre: 'Cargas Imputables a Cuentas de Costos y Gastos' }
        ]
    },

    // ============ ELEMENTO 8: SALDOS INTERMEDIARIOS DE GESTIÓN Y DETERMINACIÓN DEL RESULTADO DEL EJERCICIO ============
    {
        codigo: '80', nombre: 'Margen Comercial', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '801', nombre: 'Margen Comercial' }
        ]
    },
    {
        codigo: '81', nombre: 'Producción del Ejercicio', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '811', nombre: 'Producción del Ejercicio' }
        ]
    },
    {
        codigo: '82', nombre: 'Valor Agregado', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '821', nombre: 'Valor Agregado' }
        ]
    },
    {
        codigo: '83', nombre: 'Excedente Bruto de Explotación', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '831', nombre: 'Excedente Bruto de Explotación' }
        ]
    },
    {
        codigo: '84', nombre: 'Resultado de Explotación', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '841', nombre: 'Resultado de Explotación' }
        ]
    },
    {
        codigo: '85', nombre: 'Resultado antes de Participaciones e Impuestos', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '851', nombre: 'Resultado antes de Participaciones e Impuestos' }
        ]
    },
    {
        codigo: '86', nombre: 'Resultado antes de Impuesto a la Renta', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '861', nombre: 'Resultado antes de Impuesto a la Renta' }
        ]
    },
    {
        codigo: '87', nombre: 'Participación de los Trabajadores', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '871', nombre: 'Participación de los Trabajadores' }
        ]
    },
    {
        codigo: '88', nombre: 'Impuesto a la Renta', tipo: 'gasto', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '881', nombre: 'Impuesto a la Renta - Régimen General' },
            { codigo: '882', nombre: 'Impuesto a la Renta - Régimen Especial' },
            { codigo: '883', nombre: 'Impuesto a la Renta - Régimen MYPE' }
        ]
    },
    {
        codigo: '89', nombre: 'Determinación del Resultado del Ejercicio', tipo: 'ingreso', naturaleza: 'acreedora',
        subcuentas: [
            { codigo: '891', nombre: 'Resultado del Ejercicio - Ganancia' },
            { codigo: '892', nombre: 'Resultado del Ejercicio - Pérdida' }
        ]
    },

    // ============ ELEMENTO 9: CONTABILIDAD ANALÍTICA DE EXPLOTACIÓN ============
    {
        codigo: '90', nombre: 'Costos por Naturaleza', tipo: 'costo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '901', nombre: 'Materias Primas' },
            { codigo: '902', nombre: 'Mano de Obra Directa' },
            { codigo: '903', nombre: 'Costos Indirectos de Fabricación' },
            { codigo: '904', nombre: 'Gastos de Administración' },
            { codigo: '905', nombre: 'Gastos de Venta' }
        ]
    },
    {
        codigo: '91', nombre: 'Costos por Función', tipo: 'costo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '911', nombre: 'Costo de Producción' },
            { codigo: '912', nombre: 'Costo de Distribución' },
            { codigo: '913', nombre: 'Costo de Administración' },
            { codigo: '914', nombre: 'Costo Financiero' }
        ]
    },
    {
        codigo: '92', nombre: 'Costos de Producción', tipo: 'costo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '921', nombre: 'Materia Prima Directa' },
            { codigo: '922', nombre: 'Mano de Obra Directa' },
            { codigo: '923', nombre: 'Costos Indirectos de Fabricación' }
        ]
    },
    {
        codigo: '93', nombre: 'Centros de Costos', tipo: 'costo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '931', nombre: 'Centro de Costo - Producción' },
            { codigo: '932', nombre: 'Centro de Costo - Administración' },
            { codigo: '933', nombre: 'Centro de Costo - Ventas' }
        ]
    },
    {
        codigo: '94', nombre: 'Gastos de Administración', tipo: 'costo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '941', nombre: 'Gastos de Personal - Administración' },
            { codigo: '942', nombre: 'Servicios de Terceros - Administración' },
            { codigo: '943', nombre: 'Depreciaciones - Administración' }
        ]
    },
    {
        codigo: '95', nombre: 'Gastos de Venta', tipo: 'costo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '951', nombre: 'Gastos de Personal - Ventas' },
            { codigo: '952', nombre: 'Publicidad y Marketing' },
            { codigo: '953', nombre: 'Comisiones de Venta' }
        ]
    },
    {
        codigo: '96', nombre: 'Gastos Financieros - Analítico', tipo: 'costo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '961', nombre: 'Intereses - Analítico' },
            { codigo: '962', nombre: 'Diferencia de Cambio - Analítico' }
        ]
    },
    {
        codigo: '97', nombre: 'Gastos por Tributos - Analítico', tipo: 'costo', naturaleza: 'deudora',
        subcuentas: [
            { codigo: '971', nombre: 'Tributos - Analítico' }
        ]
    }
];


// ==================== INICIALIZACIÓN DE DATOS EN SUPABASE ====================
async function initDefaultData() {
    if (!supabaseClient) initSupabase();
    
    console.log('🔄 Verificando datos iniciales...');
    
    try {
        // ==================== 1. CUENTAS ====================
        const cuentasExistentes = await DB.getAll('cuentas');
        console.log(`   cuentas: ${cuentasExistentes.length} en BD`);
        
        if (cuentasExistentes.length === 0) {
            console.log('📦 Insertando cuentas...');
            const cuentasPlanas = [];
            PLAN_CONTABLE_PCGE.forEach(c => {
                cuentasPlanas.push({
                    codigo: c.codigo, nombre: c.nombre, tipo: c.tipo,
                    naturaleza: c.naturaleza, es_padre: true
                });
                c.subcuentas.forEach(sub => {
                    cuentasPlanas.push({
                        codigo: sub.codigo, nombre: sub.nombre, tipo: c.tipo,
                        naturaleza: c.naturaleza, es_padre: false, cuenta_padre: c.codigo
                    });
                });
            });
            
            // Insertar con upsert ignorando duplicados
            for (let i = 0; i < cuentasPlanas.length; i += 50) {
                const lote = cuentasPlanas.slice(i, i + 50);
                await supabaseClient
                    .from('cuentas')
                    .upsert(lote, { onConflict: 'codigo', ignoreDuplicates: true });
            }
            console.log(`✅ ${cuentasPlanas.length} cuentas procesadas`);
        }

        // ==================== 2. PLAN JERÁRQUICO ====================
        const planExistente = await DB.getAll('planJerarquico');
        console.log(`   plan_jerarquico: ${planExistente.length} en BD`);
        
        if (planExistente.length === 0) {
            console.log('📦 Insertando plan jerárquico...');
            const planJer = PLAN_CONTABLE_PCGE.map(c => ({
                codigo: c.codigo, nombre: c.nombre, tipo: c.tipo,
                naturaleza: c.naturaleza, subcuentas: c.subcuentas
            }));
            await supabaseClient
                .from('plan_jerarquico')
                .upsert(planJer, { onConflict: 'codigo', ignoreDuplicates: true });
            console.log(`✅ ${planJer.length} cuentas jerárquicas procesadas`);
        }

        // ==================== 3. ASIENTOS ====================
        const asientosExistentes = await DB.getAll('asientos');
        if (asientosExistentes.length === 0) {
            console.log('📦 Insertando asientos de ejemplo...');
            await supabaseClient.from('asientos').insert([{
                numero: 'AS-001', fecha: '2026-09-04', tipo: 'normal',
                glosa: 'Venta de demostración cobrada en cuenta corriente',
                lineas: [
                    { cuenta: '104', nombre: 'Cuentas Corrientes', debe: 11800, haber: 0 },
                    { cuenta: '401', nombre: 'IGV', debe: 0, haber: 1800 },
                    { cuenta: '701', nombre: 'Mercaderías', debe: 0, haber: 10000 }
                ],
                estado: 'validado'
            }]);
        }

        console.log('✅ Init completa');
    } catch (error) {
        console.error('❌ Error inicializando datos:', error);
    }
}