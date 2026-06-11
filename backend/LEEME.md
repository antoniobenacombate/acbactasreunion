# backend\

La aplicación no necesita servidor: todo funciona en el navegador.

- **Base de datos**: localStorage del navegador (`acb_actas_bd_v1`).
- **Generación con IA**: llamada directa al API de Claude desde el frontend
  (cabecera CORS `anthropic-dangerous-direct-browser-access`).
- **Exportación Word**: biblioteca `docx` ejecutada en el navegador.

Esta carpeta queda reservada por si en el futuro se añade un backend
(por ejemplo, base de datos compartida entre compañeros o transcripción
automática de audio con Whisper).
