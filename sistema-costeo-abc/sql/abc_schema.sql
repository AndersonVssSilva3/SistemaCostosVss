-- =====================================================================
-- SISTEMA DE COSTEO BASADO EN ACTIVIDADES (ABC) · VSS S.A.C.
-- Ejecutar UNA VEZ en Supabase → SQL Editor → New query → Run.
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

-- Acceso desde la aplicación (misma política abierta que el resto de tablas del sistema)
do $$
declare t text;
begin
    foreach t in array array['abc_centros', 'abc_recursos', 'abc_inductor1', 'abc_inductores',
                             'abc_actividades', 'abc_objetos_costo', 'abc_consumo', 'abc_materiales',
                             'abc_organigrama']
    loop
        execute format('alter table %I enable row level security', t);
        execute format('drop policy if exists %I on %I', t || '_acceso', t);
        execute format('create policy %I on %I for all to anon, authenticated using (true) with check (true)',
                       t || '_acceso', t);
    end loop;
end $$;

-- Refresca la caché de la API para que las tablas estén disponibles de inmediato
notify pgrst, 'reload schema';
