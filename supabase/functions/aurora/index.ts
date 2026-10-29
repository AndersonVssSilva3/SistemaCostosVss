// =====================================================================
// AURORA · Asistente de análisis de costos de VSS S.A.C.
// Supabase Edge Function (Deno) que usa la API de Google Gemini.
// Recibe la conversación y una instantánea de los datos del sistema, y
// devuelve texto, versión para voz y acciones de navegación.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   GEMINI_API_KEY   clave de Google AI Studio (o fila en la tabla privada
//                    aurora_config, ver supabase/aurora_config.sql)
//   GEMINI_MODEL     modelo preferido (opcional; si falla se usan los de respaldo)
// SUPABASE_URL y SUPABASE_ANON_KEY los define Supabase automáticamente.
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

// Modelos en orden de preferencia: si uno está saturado (503), sin cuota (429)
// o ya no disponible (404), se prueba el siguiente.
const MODELOS = [
    ...(Deno.env.get("GEMINI_MODEL") ? [Deno.env.get("GEMINI_MODEL")!] : []),
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite"
];
const ESPERA_POR_MODELO_MS = 35_000;
const API = "https://generativelanguage.googleapis.com/v1beta/models";

// Ventanas y burbujas a las que Aurora puede llevar al usuario.
// Debe coincidir con AURORA_DESTINOS en aurora/aurora.js.
const DESTINOS: Record<string, string> = {
    "contable": "Sistema Contable · Resumen (dashboard contable)",
    "contable-operaciones": "Sistema Contable · Operaciones (compras, ventas, asientos)",
    "contable-kardex": "Sistema Contable · Kardex de inventarios",
    "contable-libros": "Sistema Contable · Libros contables (diario, mayor)",
    "contable-eeff": "Sistema Contable · Estados financieros",
    "contable-costos": "Sistema Contable · Costos (mayor de fábrica, hoja de costos, costo de ventas)",
    "contable-cierre": "Sistema Contable · Ajustes y cierre",
    "contable-tablas": "Sistema Contable · Datos maestros (productos, centros de costo, activo fijo)",
    "contable-utilitarios": "Sistema Contable · Herramientas y utilitarios",
    "contable-ratios": "Sistema Contable · Ratios financieros",
    "contable-planilla": "Sistema Contable · Planilla de remuneraciones",
    "ordenes": "Órdenes de Trabajo · Dashboard industrial",
    "ordenes-lista": "Órdenes de Trabajo · Lista de órdenes",
    "ordenes-mp": "Órdenes de Trabajo · Materia prima",
    "ordenes-mo": "Órdenes de Trabajo · Mano de obra",
    "ordenes-cif": "Órdenes de Trabajo · CIF",
    "ordenes-mayor": "Órdenes de Trabajo · Mayor de fábrica",
    "ordenes-hoja": "Órdenes de Trabajo · Hoja de costos",
    "ordenes-eeff": "Órdenes de Trabajo · Estados financieros",
    "ordenes-reportes": "Órdenes de Trabajo · Reportes",
    "conjuntos": "Costos Conjuntos (burbuja)",
    "abc-resumen": "Costeo ABC · Resumen y flujo",
    "abc-centros": "Costeo ABC · Centros de actividad (mapa de procesos, organigrama, MOF)",
    "abc-recursos": "Costeo ABC · Recursos",
    "abc-ind1": "Costeo ABC · Inductor tipo 1 (recursos → centros)",
    "abc-ind2": "Costeo ABC · Inductor tipo 2 (centros → actividades)",
    "abc-ind3": "Costeo ABC · Inductor tipo 3 (actividades → productos)",
    "abc-objetos": "Costeo ABC · Objeto de costos (hoja de costo por producto)"
};

const SISTEMA = `Eres Aurora, la asistente de análisis de costos y contabilidad de VSS S.A.C. (Perú, moneda soles S/).
El sistema tiene cuatro módulos ("burbujas"): Sistema Contable, Órdenes de Trabajo, Costos Conjuntos y Costeo ABC
(planta embotelladora: agua San Luis 600 ml / 3 L / 7 L y Coca-Cola 600 ml / 1.5 L).

Recibes una instantánea de la base de datos (tablas resumidas, costeo ABC calculado) y lo que el usuario ve en pantalla.
Tu trabajo:
- Responder preguntas concretas (costos, márgenes, inductores, planilla, ventas, órdenes) con cifras exactas de los datos.
- Analizar y recomendar: qué decisiones tomar (precios, productos poco rentables, actividades caras, inductores mal
  distribuidos, gastos que crecen) y qué falta en el sistema (datos vacíos, tablas sin crear, información incoherente
  o de ejemplo). Prioriza: primero lo de mayor impacto en soles.
- Llevar al usuario a la ventana o burbuja que pida, usando la acción "navegar".

Reglas:
- Usa solo los datos recibidos. Si un dato no está, dilo y explica cómo registrarlo en el sistema; no inventes cifras.
- Haz los cálculos con cuidado (sumas, porcentajes, variaciones) y muestra las cifras clave.
- Escribe en español, claro y breve. Formato del campo "respuesta": párrafos cortos y viñetas con "- ", negritas con **texto**.
  No uses tablas ni encabezados largos (el chat es angosto).
- El campo "voz" es lo que se leerá en voz alta: máximo 3 oraciones, sin símbolos ni viñetas, cifras fáciles de oír
  (por ejemplo "45 céntimos" o "1 sol con 20 céntimos").
- Si el usuario pide abrir, entrar, ir o mostrar una ventana, agrega una acción {"tipo":"navegar","destino":<id>}
  con el id más adecuado; si además pide información, respóndela también. Si no hay que navegar, "acciones" va vacío.

Destinos disponibles (id: descripción):
${Object.entries(DESTINOS).map(([id, d]) => `- ${id}: ${d}`).join("\n")}`;

const ESQUEMA = {
    type: "object",
    properties: {
        respuesta: { type: "string", description: "Respuesta para mostrar en el chat" },
        voz: { type: "string", description: "Versión corta para leer en voz alta" },
        acciones: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    tipo: { type: "string", enum: ["navegar"] },
                    destino: { type: "string", enum: Object.keys(DESTINOS) }
                },
                required: ["tipo", "destino"]
            }
        }
    },
    required: ["respuesta", "voz", "acciones"]
};

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// La clave se toma del secreto GEMINI_API_KEY o, si no se pudo crear el secreto,
// de la tabla privada aurora_config (solo legible con la clave de servicio).
let claveEnCache: string | null = null;
async function obtenerClaveGemini(): Promise<string | null> {
    const env = Deno.env.get("GEMINI_API_KEY");
    if (env) return env;
    if (claveEnCache) return claveEnCache;
    const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!servicio) return null;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, servicio, { auth: { persistSession: false } });
    const { data, error } = await admin.from("aurora_config").select("valor").eq("clave", "GEMINI_API_KEY").maybeSingle();
    if (error) console.error("Aurora · aurora_config", error.message);
    claveEnCache = data?.valor ?? null;
    return claveEnCache;
}

type Turno = { role: "user" | "assistant"; texto: string };
type Parte = { text?: string; thought?: boolean };

class ErrorModelo extends Error {
    constructor(public status: number, mensaje: string) { super(mensaje); }
}

async function llamarGemini(modelo: string, clave: string, cuerpo: unknown) {
    const res = await fetch(`${API}/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(ESPERA_POR_MODELO_MS)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ErrorModelo(res.status, data?.error?.message ?? `HTTP ${res.status}`);
    return data;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

    const clave = await obtenerClaveGemini();
    if (!clave) return json({ error: "Falta la clave de Gemini (secreto GEMINI_API_KEY o tabla aurora_config)." }, 500);

    // Solo usuarios con sesión iniciada en el sistema pueden usar a Aurora
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !auth?.user) return json({ error: "Inicie sesión en el sistema para usar a Aurora." }, 401);

    let body: { datos?: string; pantalla?: string; historial?: Turno[] };
    try {
        body = await req.json();
    } catch {
        return json({ error: "Solicitud inválida" }, 400);
    }

    const datos = String(body.datos ?? "").slice(0, 600_000);
    const pantalla = String(body.pantalla ?? "").slice(0, 12_000);
    const historial = (Array.isArray(body.historial) ? body.historial : [])
        .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.texto === "string" && t.texto.trim())
        .slice(-24);
    while (historial.length && historial[0].role !== "user") historial.shift();
    if (!historial.length || historial[historial.length - 1].role !== "user") {
        return json({ error: "Falta la pregunta del usuario" }, 400);
    }

    // La instantánea de datos va al inicio del primer turno y no cambia durante la
    // conversación (Gemini reutiliza automáticamente ese prefijo en caché).
    // Lo que se ve en pantalla cambia en cada pregunta, por eso va en el último turno.
    const ultimo = historial.length - 1;
    const contents = historial.map((t, i) => {
        if (t.role === "assistant") return { role: "model", parts: [{ text: t.texto }] };
        const parts: Parte[] = [];
        if (i === 0) parts.push({ text: "INSTANTÁNEA DE LA BASE DE DATOS (JSON):\n" + datos });
        parts.push({ text: i === ultimo && pantalla ? `${t.texto}\n\n[Pantalla actual del usuario]\n${pantalla}` : t.texto });
        return { role: "user", parts };
    });

    const cuerpo = {
        systemInstruction: { parts: [{ text: SISTEMA }] },
        contents,
        generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: ESQUEMA,
            maxOutputTokens: 16384
        }
    };

    const intentos: string[] = [];
    for (const modelo of [...new Set(MODELOS)]) {
        try {
            const data = await llamarGemini(modelo, clave, cuerpo);
            const candidato = data?.candidates?.[0];
            if (!candidato) {
                const motivo = data?.promptFeedback?.blockReason;
                return json({ respuesta: motivo ? "No puedo responder a esa solicitud." : "No obtuve respuesta.", voz: "", acciones: [], raw: "" });
            }
            const raw = (candidato.content?.parts ?? [])
                .filter((p: Parte) => !p.thought && p.text).map((p: Parte) => p.text).join("");
            let salida: { respuesta: string; voz: string; acciones: { tipo: string; destino: string }[] };
            try {
                salida = JSON.parse(raw);
            } catch {
                salida = { respuesta: raw || "No obtuve respuesta.", voz: "", acciones: [] };
            }
            if (!Array.isArray(salida.acciones)) salida.acciones = [];
            if (candidato.finishReason === "MAX_TOKENS") salida.respuesta += "\n\n_(Respuesta recortada por longitud.)_";
            return json({ ...salida, raw, modelo: data.modelVersion ?? modelo, uso: data.usageMetadata });
        } catch (error) {
            const status = error instanceof ErrorModelo ? error.status : 0;   // 0 = tiempo agotado / red
            intentos.push(`${modelo}: ${status || "sin respuesta"}`);
            console.error(`Aurora · ${modelo}`, status, (error as Error).message);
            if (status === 400 && /API key|API_KEY/i.test((error as Error).message)) {
                return json({ error: "La clave GEMINI_API_KEY no es válida." }, 500);
            }
            if (status === 400) return json({ error: "Solicitud rechazada por Gemini: " + (error as Error).message }, 400);
            // 403, 404, 429, 5xx o tiempo agotado: probar el siguiente modelo
        }
    }
    return json({ error: "Gemini está saturado o sin cuota en este momento. Intente en un minuto. (" + intentos.join(", ") + ")" }, 503);
});
