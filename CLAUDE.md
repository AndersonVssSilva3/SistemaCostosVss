# VSS S.A.C. · Sistema de Costos

Sistema web de costos de una planta embotelladora (agua San Luis y Coca-Cola), en español y en soles (PEN).
Es HTML + CSS + JavaScript puro (sin frameworks ni compilación) con base de datos en **Supabase**.
Se abre desde `index.html` (inicio de sesión) y cada módulo es una carpeta independiente.

## Módulos

| Carpeta | Qué es |
|---|---|
| `index.html` | Inicio de sesión |
| `sistema-ordenes/` | Costeo por órdenes; contiene los **archivos compartidos** (CSS, `js/supabase-config.js`, `js/db.js`, `js/utils.js`) que usan los demás módulos |
| `sistema-contable/` | Contabilidad |
| `sistema-costeo-abc/` | Costeo basado en actividades (ABC) — el módulo más desarrollado |
| `sistema-costos-conjuntos/` | Costos conjuntos |
| `aurora/` y `supabase/functions/aurora/` | Asistente "Aurora" (lee el resumen ABC desde `localStorage['aurora_abc']`) |

## Supabase

- Proyecto correcto: **`cngdylllnpwbcscbeucq`** (URL y clave pública en `sistema-ordenes/js/supabase-config.js`).
  ⚠️ Ya pasó una vez que el SQL se ejecutó en otro proyecto por error: verificar siempre el código del proyecto.
- Claude no tiene acceso directo a Supabase: los cambios de base de datos se entregan como SQL para que el usuario
  lo ejecute en Supabase → SQL Editor.
- Los scripts SQL deben ser **re-ejecutables sin borrar datos** (`create table if not exists`, `drop policy if exists`, etc.).
- Las tablas usan RLS con una política abierta para `anon` y `authenticated` (mismo criterio en todo el sistema).

## Costeo ABC (`sistema-costeo-abc/`)

Archivos: `index.html`, `js/abc.js` (lógica e interfaz), `js/abc-seed.js` (datos de ejemplo), `css/abc.css`,
`sql/abc_schema.sql` (todas las tablas `abc_*`), `sw.js` + `manifest.webmanifest` + `icons/` (app instalable / PWA).

- **Modelo de 5 etapas como mínimo** (se pueden agregar más, tablas `abc_etapas` y `abc_etapa_dist`):
  ① Recursos → Centros · ② Centros de apoyo → Centros · ③ Centros → Actividades ·
  ④ Actividades de apoyo → Actividades principales · ⑤ Actividades → Productos.
  Las etapas extra son de nivel `centro` o `actividad`; la numeración se calcula sola (`abcEtapasModelo()`).
- MOD/MOI salen de la tabla `planillas`; los demás gastos tienen monto base (`abc_recursos`) y monto por mes (`abc_recursos_mes`).
- **Alertas de presupuesto** por centro y actividad (`abc_presupuestos`): presupuesto mensual + umbral (90% por defecto);
  presupuesto sugerido = promedio mensual + 15%. Gráfica mes a mes con tendencia y proyección (Chart.js).
- **Exportar a Excel** (.xlsx con SheetJS) por tabla y libro completo.
- **En vivo · Simulación** (`abc_simulacion`, `abc_movimientos`, Supabase Realtime): simula del día 1 al 30 en 10 minutos;
  un dispositivo controla y los demás ven los cambios al instante (o cada 3 s si Realtime no conecta). No modifica datos reales.
- Si faltan tablas nuevas, la página sigue funcionando en memoria y muestra un aviso para ejecutar `sql/abc_schema.sql`.
- Menú: solo el lateral (agrupado, se oculta solo, pestaña en el borde para abrirlo, opción "Mantener menú fijo").

## Forma de trabajar

- Responder en **español**, con explicaciones sencillas (proyecto universitario de costos).
- Mantener el estilo existente: funciones con prefijo `abc…`, textos de la interfaz en español, montos con `abcSoles()`.
- Al subir de versión archivos del ABC, cambiar `CACHE` en `sistema-costeo-abc/sw.js` para que la app instalada se actualice.
- Las librerías externas se cargan desde `cdn.jsdelivr.net` con versión fija.
