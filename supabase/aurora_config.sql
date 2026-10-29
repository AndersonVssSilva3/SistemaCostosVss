-- =====================================================================
-- AURORA · Configuración privada (alternativa a los secretos de Edge Functions)
-- Solo la Edge Function "aurora" la lee, usando la clave de servicio.
-- El navegador (anon / authenticated) no tiene ningún acceso.
-- =====================================================================
create table if not exists aurora_config (
    clave      text primary key,
    valor      text not null,
    updated_at timestamptz default now()
);

alter table aurora_config enable row level security;   -- sin políticas: nadie con anon/authenticated
revoke all on table aurora_config from anon, authenticated;

-- Guardar o cambiar la clave de Gemini (reemplace TU_CLAVE):
-- insert into aurora_config (clave, valor) values ('GEMINI_API_KEY', 'TU_CLAVE')
-- on conflict (clave) do update set valor = excluded.valor, updated_at = now();
