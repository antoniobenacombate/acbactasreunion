# Arquitectura técnica

## Visión general

Arquitectura de tres capas (igual que ACB_PORTALOBRA):

```
Frontend (React, GitHub Pages)
   ↓ HTTPS (Bearer JWT)
Cloudflare Worker «acb-actas-backend» (API privada, backend\)
   ↓ binding D1 (.prepare().bind() exclusivamente)
Cloudflare D1 «acb-actas-db» (SQLite)
```

- **Toda** consulta a datos pasa por el Worker: el navegador no tiene
  credenciales de base de datos, solo el token JWT de sesión del usuario.
- **API de Claude** (opcional, clave por dispositivo): generación de actas
  desde PDF, fotos de notas manuscritas o texto. Es la única otra llamada
  externa del frontend.

### Seguridad del backend

- Autenticación propia: PBKDF2-SHA256 (10k iteraciones, salt aleatorio) y
  JWT HS256 firmado con `JWT_SECRET` (secreto de Cloudflare, fuera del repo).
- El middleware recarga el usuario desde D1 en cada petición: aprobar o
  revocar una cuenta surte efecto inmediato, sin esperar a que caduque el token.
- Autorización por capas: datos → usuario aprobado; gestión de usuarios → admin.
- Consultas 100 % parametrizadas (`.prepare().bind()`); sin SQL dinámico
  con entrada del usuario.
- Errores genéricos hacia el cliente (sin detalles de infraestructura);
  login con mensaje único que no revela si el email existe.
- CORS restringido a `localhost:5180` y `antoniobenacombate.github.io`.
- Tabla `auditoria` con las operaciones críticas (registro, login,
  aprobaciones, altas/ediciones/borrados de clientes, obras y actas).

### Modelo de datos (D1)

- `usuarios` (id, email, nombre, password_hash, es_admin, aprobado,
  obra_preferente_id, fechas).
- `clientes` (id, nombre único, nif, direccion, telefono, email, **activo**
  para baja lógica, fechas) — campos sensibles en columnas dedicadas,
  preparadas para cifrado a nivel de aplicación.
- `obras` (id, codigo, nombre, **cliente_id** FK).
- `actas` (id, **cliente_id** FK, **obra_id** FK con borrado en cascada,
  numero_acta, fecha, titulo, contenido JSON, **estado**
  borrador/emitida/aprobada, autor, origen, **eliminado** para borrado
  lógico, fechas).

Usuarios (flujo PORTALOBRA): registro público → pendiente → aprobación por
admin en la página Usuarios. El primer usuario (o `ADMIN_EMAIL`) es admin.

`bd.ts` mantiene una caché en memoria sincronizada con la API: las páginas
leen en síncrono (useSyncExternalStore) y las mutaciones escriben primero en
el Worker y luego actualizan la caché.

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

## Despliegue del backend

```bat
cd backend
npm install
npx wrangler d1 create acb-actas-db        REM una sola vez; id en wrangler.toml
npm run db:init                            REM esquema
npm run db:seed                            REM migración de datos (una sola vez)
npx wrangler secret put JWT_SECRET         REM secreto aleatorio largo
npm run deploy
```

URL del Worker: `https://acb-actas-backend.antoniobenacombate.workers.dev`
(constante `URL_API` en `frontend/src/servicios/api.ts`).

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
