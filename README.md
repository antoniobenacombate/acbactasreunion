# ACB · Actas de Reunión

Aplicación web para generar y gestionar **actas de visitas de obra y reuniones**
a partir de transcripciones de grabaciones, audios transcritos o notas sueltas.

## Qué hace

1. **Generación automática del acta**: arrastras los **PDF escaneados o fotos
   de tus notas a mano** de la reunión (la vía habitual) o pegas una
   transcripción o nota, y la app extrae fecha, lugar, objeto, asistentes y
   asuntos tratados con su responsable de acción (DO / CON / AT).
   - **PDF y fotos de notas manuscritas**: se procesan con la visión del API de
     Claude (transcribe la letra, interpreta abreviaturas, flechas y listas;
     PDF multipágina admitido, hasta 25 MB). Requiere clave.
   - **Modo IA con texto** (recomendado): usa el API de Claude si configuras tu clave.
   - **Modo básico**: análisis heurístico local solo para texto, sin conexión ni clave.
2. **Base de datos en la nube (Cloudflare D1, vía API privada)** con índice
   interactivo de todas las actas: búsqueda de texto completo y filtros por
   obra, cliente y origen. Compartida entre los usuarios aprobados. Las actas
   tienen **estado** (borrador / emitida / aprobada) y borrado lógico.
3. **Exportación a Word (.docx)** siguiendo la plantilla corporativa
   `samples\AAMMDD AR01 MODELO ACTA REUNION-E0g.docx`, con nombre de archivo
   `AAMMDD AR## ACTA REUNION <OBRA>-E0.docx`.
4. **Dashboard** con actas por obra, por cliente, actividad mensual y origen.

Incluye **6 actas de ejemplo en 3 obras** para ver el funcionamiento desde el
primer arranque (se pueden restablecer desde Configuración).

## Acceso web

La app está publicada en **https://antoniobenacombate.github.io/acbactasreunion/**
(se redespliega sola en cada push a `main`). Repositorio:
https://github.com/antoniobenacombate/acbactasreunion

## Usuarios y datos compartidos (Cloudflare Workers + D1)

Los datos (clientes, obras y actas) viven en una base de datos privada
**Cloudflare D1** a la que solo accede el **Worker** `acb-actas-backend`
(API privada con autenticación). El navegador nunca toca la base de datos
ni guarda credenciales de ella. Los datos se comparten entre todos los
usuarios aprobados, desde cualquier dispositivo.

Flujo de usuarios (igual que PORTALOBRA):

1. Cualquiera puede **crear cuenta** (email + contraseña) en la pantalla de acceso.
2. La cuenta queda **pendiente** hasta que un administrador la aprueba en
   el menú **Usuarios**.
3. El **primer usuario** registrado (o el email del administrador designado)
   es administrador automáticamente.

La autorización se aplica en el Worker en cada petición: solo usuarios
aprobados leen o escriben datos, y solo los admin gestionan usuarios.
La contraseña se puede cambiar desde **Configuración**.

### Acceso único con ACB Portal Obra

En la pantalla de acceso, **Entrar con ACB Portal Obra** permite usar la cuenta
de la app hermana: si ya está aprobada allí, entra aquí sin registrarse ni
esperar una segunda aprobación. Las dos apps siguen siendo independientes (cada
una con su base de datos y su secreto); Actas valida el token llamando a la API
de Portal Obra. La barra lateral incluye además un salto directo a Portal Obra.

Falta la mitad del circuito en el repositorio de Portal Obra (devolver el token
al parámetro `volver`): ver [docs/INTEGRACION_PORTALOBRA.md](docs/INTEGRACION_PORTALOBRA.md).

## Cómo arrancar

Doble clic en **`ACB_ActasReunion.bat`** (raíz del proyecto).
La primera vez instala las dependencias; después abre el navegador en
`http://localhost:5180`.

Manual:

```bat
npm install
npm run dev
```

## Configurar la IA (opcional pero recomendado)

1. Consigue una clave de API en https://console.anthropic.com
2. En la app: **Configuración → Clave de API** y guarda.
3. La clave se almacena solo en tu navegador (localStorage).

Sin clave, la app funciona igualmente con el generador básico local.

## Uso habitual

1. **Nueva acta** → arrastra las fotos de tus notas (varias páginas admitidas)
   y/o pega texto → elige obra (o crea una) → **Generar acta**.
2. Revisa y corrige el borrador (asistentes, asuntos, acciones).
3. **Guardar acta** → queda en el índice y el dashboard.
4. Desde el detalle: **Exportar Word** para obtener el `.docx` con la plantilla.

## Dónde se guardan los datos

- **Clientes, obras y actas**: en Cloudflare D1, accesible únicamente a través
  del Worker `acb-actas-backend` (carpeta `backend\`). Compartidos por el equipo.
- **Clave de API y datos por defecto**: solo en el navegador de cada dispositivo.
- Las fotos y PDF de notas **no se almacenan**: se envían al API de Claude para
  generar el acta y solo se guarda el resultado.

## Arquitectura

| Carpeta        | Contenido                                                        |
| -------------- | ---------------------------------------------------------------- |
| `frontend\`    | Aplicación React + TypeScript (Vite + Tailwind)                  |
| `config\`      | Configuración de Vite y Tailwind                                 |
| `public\`      | Logotipos (extraídos de la plantilla), favicon                   |
| `samples\`     | Plantilla Word del acta                                          |
| `backend\`     | Reservada (no hay servidor; ver su LEEME.md)                     |
| `herramientas\`| Utilidades (`extraer_logos.py`, `dev.bat`)                       |
| `docs\`        | Documentación técnica (`ARQUITECTURA.md`, `INTEGRACION_PORTALOBRA.md`) |
| `app_notas\`   | Tus notas de trabajo                                             |

Detalle técnico completo en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

### Stack (solo lo necesario)

- **React 18 + TypeScript + Vite** — interfaz
- **Tailwind CSS** — estilo minimalista con el sistema de diseño ACB
- **react-router-dom** — navegación
- **docx** — exportación Word en el navegador
- **lucide-react** — iconos
- Sin backend, sin ORM, sin librería de gráficas (SVG propio)

## Historial

- **v3.1** (09-08-2026): **acceso único con ACB Portal Obra** (entrar con la
  cuenta de la app hermana, sin compartir secretos ni bases de datos) y salto
  directo entre las dos aplicaciones.
- **v3.0** (11-06-2026): migración de Supabase a **Cloudflare Workers + D1**
  (API privada con JWT, autorización por aprobación, auditoría, clientes como
  entidad con baja lógica, estado y borrado lógico de actas, cambio de
  contraseña). Contraseña temporal de los usuarios migrados: `actas2026`.
- **v2.0** (11-06-2026): backend Supabase (datos compartidos en la nube),
  **usuarios con aprobación por admin** (flujo PORTALOBRA, primer registro =
  admin) y **entrada por PDF** (notas escaneadas multipágina, hasta 25 MB).
- **v1.2** (11-06-2026): página **Obras y clientes** (editar/eliminar obras con
  sus actas, obra preferente, clientes renombrables/eliminables); publicación en
  GitHub Pages con despliegue automático.
- **v1.1** (10-06-2026): entrada por **fotos de notas manuscritas** (visión de
  Claude, varias páginas, compresión local antes de enviar) y origen "Notas a mano".
- **v1.0** (10-06-2026): primera versión. Generador IA + heurístico, BD local,
  índice con filtros, exportación DOCX según plantilla, dashboard, 6 ejemplos.
