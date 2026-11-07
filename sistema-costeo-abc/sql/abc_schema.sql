-- =====================================================================
-- SISTEMA DE COSTEO BASADO EN ACTIVIDADES (ABC) · VSS S.A.C.
-- Ejecutar en Supabase → SQL Editor → New query → Run (se puede volver a
-- ejecutar sin perder datos: solo crea lo que falta, p. ej. las tablas 10-13).
-- Al abrir sistema-costeo-abc/index.html las tablas vacías se llenan
-- automáticamente con los datos de ejemplo (productos, gastos, inductores).
--
-- Flujo:  Recursos ─(inductor tipo 1: %)→ Centros de actividad
--                  ─(inductor tipo 2: %)→ Actividades
--                  ─(inductor tipo 3: consumo)→ Objetos de costo
-- =====================================================================

-- 1. Centros de actividad (estratégicos, operativos y de apoyo)
create table if not exists abc_centros (
    id          bigserial primary key,
    codigo      text unique not null,
    nombre      text not null,
    tipo        text not null check (tipo in ('estrategico', 'operativo', 'apoyo')),
    responsable text,
    funciones   text,            -- Manual de Organización y Funciones (MOF)
    padre_codigo text,           -- centro del que depende en el organigrama
    orden       int default 0,
    created_at  timestamptz default now()
);
alter table abc_centros add column if not exists padre_codigo text;
alter table abc_centros drop constraint if exists abc_centros_padre_fk;
alter table abc_centros add constraint abc_centros_padre_fk foreign key (padre_codigo)
    references abc_centros (codigo) on delete set null on update cascade;

-- 2. Recursos: MOD / MOI (desde planillas), CIF, Gastos de Administración y de Ventas
create table if not exists abc_recursos (
    id          bigserial primary key,
    codigo      text unique not null,
    nombre      text not null,
    categoria   text not null check (categoria in ('MOD', 'MOI', 'CIF', 'GADM', 'GVTA')),
    origen      text not null default 'manual' check (origen in ('manual', 'planilla')),
    cargo       text,            -- si origen = planilla, cargo de planillas.empleado_cargo
    monto       numeric(14, 2) default 0,   -- monto mensual (solo origen manual)
    created_at  timestamptz default now()
);

-- 3. Inductor tipo 1: % de cada recurso asignado a cada centro (% = tasa)
create table if not exists abc_inductor1 (
    id             bigserial primary key,
    recurso_codigo text not null references abc_recursos (codigo) on delete cascade on update cascade,
    centro_codigo  text not null references abc_centros (codigo) on delete cascade on update cascade,
    porcentaje     numeric(7, 3) not null default 0,
    created_at     timestamptz default now(),
    unique (recurso_codigo, centro_codigo)
);

-- 4. Inductores tipo 3 (unidades de medida que consumen los productos)
create table if not exists abc_inductores (
    id         bigserial primary key,
    codigo     text unique not null,
    nombre     text not null,
    unidad     text,
    created_at timestamptz default now()
);

-- 5. Actividades: inductor tipo 2 (% del centro) e inductor tipo 3 asignado
create table if not exists abc_actividades (
    id              bigserial primary key,
    codigo          text unique not null,
    nombre          text not null,
    centro_codigo   text not null references abc_centros (codigo) on delete cascade on update cascade,
    porcentaje      numeric(7, 3) not null default 0,
    inductor_codigo text references abc_inductores (codigo) on delete set null on update cascade,
    created_at      timestamptz default now()
);

-- 6. Objetos de costo (vinculados a productos.codigo)
create table if not exists abc_objetos_costo (
    id              bigserial primary key,
    producto_codigo text unique not null,
    presentacion    text,
    unidades        numeric(14, 2) not null default 0,   -- producción mensual
    created_at      timestamptz default now()
);

-- 7. Consumo de inductores tipo 3 por producto
create table if not exists abc_consumo (
    id              bigserial primary key,
    inductor_codigo text not null references abc_inductores (codigo) on delete cascade on update cascade,
    producto_codigo text not null,
    cantidad        numeric(16, 4) not null default 0,
    created_at      timestamptz default now(),
    unique (inductor_codigo, producto_codigo)
);

-- 8. Materia prima directa por unidad de producto (lista de materiales)
create table if not exists abc_materiales (
    id              bigserial primary key,
    producto_codigo text not null,
    insumo          text not null,
    cantidad        numeric(14, 4) not null default 0,
    unidad          text,
    costo_unitario  numeric(14, 4) not null default 0,
    created_at      timestamptz default now()
);

-- 9. Organigrama: puestos (cargos de planillas o vacantes) ubicados en cada centro
create table if not exists abc_organigrama (
    id            bigserial primary key,
    cargo         text unique not null,
    centro_codigo text references abc_centros (codigo) on delete set null on update cascade,
    orden         int default 0,
    created_at    timestamptz default now()
);

-- 10. Etapas de reparto adicionales (modelo de 5 etapas como mínimo, se pueden agregar más)
--     nivel 'centro'    → se aplica entre "Recursos → Centros" y "Centros → Actividades"
--     nivel 'actividad' → se aplica entre "Centros → Actividades" y "Actividades → Productos"
create table if not exists abc_etapas (
    id          bigserial primary key,
    codigo      text unique not null,
    nombre      text not null,
    nivel       text not null check (nivel in ('centro', 'actividad')),
    orden       int default 0,
    descripcion text,
    created_at  timestamptz default now()
);

-- 11. Distribución de cada etapa: % del costo del origen que pasa a cada destino
create table if not exists abc_etapa_dist (
    id           bigserial primary key,
    etapa_codigo text not null references abc_etapas (codigo) on delete cascade on update cascade,
    origen       text not null,   -- código de centro o de actividad (según el nivel de la etapa)
    destino      text not null,
    porcentaje   numeric(7, 3) not null default 0,
    created_at   timestamptz default now(),
    unique (etapa_codigo, origen, destino)
);

-- 12. Presupuesto mensual por centro o actividad y umbral de alerta (%)
create table if not exists abc_presupuestos (
    id         bigserial primary key,
    tipo       text not null check (tipo in ('centro', 'actividad')),
    codigo     text not null,
    monto      numeric(14, 2) not null default 0,
    umbral     numeric(6, 2) not null default 80,   -- % del presupuesto a partir del cual se alerta
    created_at timestamptz default now(),
    unique (tipo, codigo)
);

-- 13. Monto de un recurso manual en un mes específico (si no existe se usa abc_recursos.monto)
create table if not exists abc_recursos_mes (
    id             bigserial primary key,
    recurso_codigo text not null references abc_recursos (codigo) on delete cascade on update cascade,
    periodo        text not null,   -- 'YYYY-MM'
    monto          numeric(14, 2) not null default 0,
    created_at     timestamptz default now(),
    unique (recurso_codigo, periodo)
);

-- 14. Simulación en vivo de un mes (solo la última simulación; no modifica los datos reales)
create table if not exists abc_simulacion (
    id           bigserial primary key,
    sim_id       text unique not null,
    periodo      text not null,            -- mes simulado 'YYYY-MM'
    base_periodo text,                     -- mes cuyos montos sirven de referencia
    estado       text not null default 'corriendo' check (estado in ('corriendo', 'pausada', 'terminada')),
    dia          int not null default 0,
    dias         int not null default 30,
    duracion_seg int not null default 600, -- duración del mes completo a velocidad x1
    velocidad    numeric(5, 2) not null default 1,
    controlador  text,                     -- dispositivo que maneja la simulación
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

-- 15. Gastos registrados día a día durante la simulación
create table if not exists abc_movimientos (
    id             bigserial primary key,
    sim_id         text not null references abc_simulacion (sim_id) on delete cascade,
    dia            int not null,
    grupo          text,          -- evento al que pertenece (planilla del día, avería, campaña…)
    icono          text,
    descripcion    text,
    recurso_codigo text not null,
    monto          numeric(14, 2) not null default 0,
    created_at     timestamptz default now()
);
create index if not exists abc_movimientos_sim_idx on abc_movimientos (sim_id, id);

-- Acceso desde la aplicación (misma política abierta que el resto de tablas del sistema)
do $$
declare t text;
begin
    foreach t in array array['abc_centros', 'abc_recursos', 'abc_inductor1', 'abc_inductores',
                             'abc_actividades', 'abc_objetos_costo', 'abc_consumo', 'abc_materiales',
                             'abc_organigrama', 'abc_etapas', 'abc_etapa_dist', 'abc_presupuestos',
                             'abc_recursos_mes', 'abc_simulacion', 'abc_movimientos']
    loop
        execute format('alter table %I enable row level security', t);
        execute format('drop policy if exists %I on %I', t || '_acceso', t);
        execute format('create policy %I on %I for all to anon, authenticated using (true) with check (true)',
                       t || '_acceso', t);
    end loop;
end $$;

-- Tiempo real: las pantallas abiertas reciben al instante los cambios de la simulación
do $$
declare t text;
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        foreach t in array array['abc_simulacion', 'abc_movimientos']
        loop
            if not exists (select 1 from pg_publication_tables
                           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
                execute format('alter publication supabase_realtime add table public.%I', t);
            end if;
        end loop;
    end if;
end $$;

-- Refresca la caché de la API para que las tablas estén disponibles de inmediato
notify pgrst, 'reload schema';
