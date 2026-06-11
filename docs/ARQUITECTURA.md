# Arquitectura técnica

## Visión general

Aplicación 100 % cliente (SPA). No hay servidor: la persistencia es
`localStorage` y la única llamada externa es al API de Claude (opcional).

```
frontend\src\
├── main.tsx              Arranque (React + HashRouter)
├── App.tsx               Rutas
├── tipos.ts              Modelo de datos y utilidades de fecha
├── index.css             Sistema de diseño ACB (Tailwind)
├── datos\
│   └── semilla.ts        6 actas y 3 obras de ejemplo
├── servicios\
│   ├── bd.ts             "Base de datos" sobre localStorage + suscripción
│   ├── generador.ts      Generación de actas: IA (Claude) + heurístico
│   └── exportarDocx.ts   Exportación .docx según la plantilla
├── componentes\
│   ├── Disposicion.tsx   Barra lateral + contenido
│   ├── EditorActa.tsx    Formulario de edición de acta
│   └── Graficas.tsx      Barras, donut y columnas en SVG/CSS propio
└── paginas\
    ├── Dashboard.tsx     KPIs y gráficas
    ├── IndiceActas.tsx   Índice interactivo con búsqueda y filtros
    ├── DetalleActa.tsx   Vista, edición, exportación y borrado
    ├── NuevaActa.tsx     Volcado de texto → borrador → guardar
    └── Configuracion.tsx Clave API, datos por defecto, restablecer
```

## Modelo de datos

- **Obra**: `id`, `codigo` (corto, p. ej. "A-7 VG"), `nombre`, `cliente`.
- **Acta**: `numero` (AR## dentro de la obra), `obraId`, `fecha` (ISO),
  `lugar`, `objeto`, `asistentes[]` (nombre, cargo, organización DO/CON/AT/OTRO),
  `asuntos[]` (título, desarrollo, `accionPor[]`), `proximaReunion`,
  `origen` (transcripción / audio / nota / manual), `textoOriginal`.

## Persistencia

`servicios/bd.ts` guarda `{obras, actas}` como JSON en
`localStorage["acb_actas_bd_v1"]`. Patrón de suscripción simple
(`useSyncExternalStore`) para refrescar las vistas al guardar.
La primera ejecución carga la semilla de ejemplos.

## Generador de actas

1. **IA** (`generarConIA`): `POST https://api.anthropic.com/v1/messages`
   directamente desde el navegador con la cabecera
   `anthropic-dangerous-direct-browser-access: true`.
   - Modelo `claude-opus-4-8`, `thinking: adaptive`.
   - **Visión**: las fotos de notas manuscritas van como bloques `image`
     (base64) delante del texto. `prepararImagen()` reduce cada foto a
     ≤2000 px de lado largo y la comprime a JPEG en un canvas local antes
     de enviarla (controla tokens y tamaño de petición). Las fotos NO se
     guardan en la BD local (limitación de espacio de localStorage); solo
     queda el acta generada y los nombres de archivo en `textoOriginal`.
   - Salida estructurada garantizada con `output_config.format` (json_schema):
     fecha, lugar, objeto, asistentes, asuntos con `accionPor`.
2. **Heurístico** (`generarHeuristico`): regex en local —
   fechas (numéricas y verbales en español), lugar, bloque de asistentes
   "Nombre (cargo)", asuntos por párrafos, detección de acciones por
   patrones "el contratista presentará...", "la AT preparará...".
3. `generarActa()` decide: IA si hay clave (con caída automática al
   heurístico si falla), heurístico si no.

## Exportación DOCX

`exportarDocx.ts` reproduce la plantilla con la librería `docx`:

- Cabecera: logos (`public\image1.png`, `image2.png`, extraídos de la propia
  plantilla) + nombre de obra + banda "ACTA DE REUNIÓN".
- Tabla de datos: LUGAR | FECHA, OBJETO, ASISTENTES y bloque de firmas
  en 3 columnas (AT | DO | CON).
- Tabla de asuntos: "ASUNTOS TRATADOS" | "Acción a realizar por:".
- A4, Arial 10, pie con paginación.
- Nombre de archivo: `AAMMDD AR## ACTA REUNION <CODIGO OBRA>-E0.docx`
  (sigue el modelo de la plantilla).

## Decisiones

- **Sin backend**: uso personal, datos sensibles en local, arranque con un bat.
- **Sin librería de gráficas**: tres componentes SVG/CSS propios (~100 líneas)
  evitan una dependencia pesada (recharts ≈ 400 KB).
- **HashRouter**: evita configurar reescrituras de servidor.
- **Puerto 5180**: distinto del 5173 de ACB_PORTALOBRA para poder ejecutar ambas.

## Posibles evoluciones

- Backend compartido (Supabase, como ACB_PORTALOBRA) para uso en equipo.
- Transcripción de audio integrada (Whisper) en `backend\`.
- Exportación PDF directa.
