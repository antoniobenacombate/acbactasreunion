# Integración con ACB Portal Obra

Las dos aplicaciones son independientes (cada una con su Worker, su base D1 y
su `JWT_SECRET`). Esta integración añade **acceso único (SSO)** y **salto entre
apps**, sin fusionar bases de datos ni compartir secretos.

| App | Frontend | API (Worker) | Base D1 |
| --- | --- | --- | --- |
| ACB Actas | https://antoniobenacombate.github.io/acbactasreunion/ | `acb-actas-backend` | `acb-actas-db` |
| ACB Portal Obra | https://acb-portalobra.pages.dev | `gisobra` | `gisobra-db` |

## Cómo funciona el acceso único

1. En la pantalla de acceso de Actas, **Entrar con ACB Portal Obra** lleva a
   Portal Obra con `?volver=<url de Actas>`.
2. Portal Obra, con el usuario ya identificado, devuelve al navegador a esa URL
   añadiendo su token: `<url de Actas>?po=<token>`.
3. Actas recoge el token de la URL, **la limpia** (`history.replaceState`) y lo
   envía a `POST /api/auth/portalobra` de su propio Worker.
4. El Worker de Actas valida el token llamando a
   `GET /api/auth/me` de Portal Obra. **No se comparte el `JWT_SECRET`**: la
   validación la hace siempre quien emitió el token.
5. Si el usuario está **aprobado en Portal Obra**:
   - si no existe en Actas, se crea ya aprobado (nombre y email heredados);
   - si existe pero estaba pendiente, se aprueba.
   Después Actas emite **su propio JWT** y la sesión sigue como siempre.

Se registra en `auditoria` con la acción `entrar_sso` y detalle `portalobra`.

### Contraseña de las cuentas creadas por SSO

Se guardan con la marca `sso-portalobra`, que no es un hash válido: no hay
contraseña local que pueda funcionar. Desde **Configuración → Cambiar
contraseña** el usuario puede fijar una (no se le pide la anterior, porque no
tiene) y a partir de ahí también podrá entrar por el formulario normal.

### Administradores

Un usuario nuevo entra como admin en Actas si es el primer usuario, si su email
es el `ADMIN_EMAIL` configurado, o si ya es admin en Portal Obra. En cuentas que
ya existían en Actas **no se toca** el rol: manda lo que haya aquí.

## Configuración

En `backend/wrangler.toml`:

```toml
PORTALOBRA_API = "https://gisobra.antoniobenacombate.workers.dev"
```

Si se deja vacía, la integración queda desactivada y el endpoint responde 503.
La URL del frontend de Portal Obra está en
`frontend/src/servicios/portalobra.ts` (`URL_PORTALOBRA`).

Tras cambiar el `wrangler.toml`: `cd backend && npm run deploy`.

## Lo que falta hacer en el repositorio de ACB Portal Obra

Esta parte **no está implementada todavía** (está en el otro repositorio,
`antoniobenacombate/acbportalobra`). Hay que atender el parámetro `volver`:
cuando llegue, y el usuario tenga sesión, redirigir de vuelta con el token.

En `frontend/src/App.tsx` (o en el arranque de la app), algo como:

```ts
// Vuelta a una app hermana (ACB Actas) llevando la sesión
const params = new URLSearchParams(window.location.search);
const volver = params.get("volver");
if (volver) {
  const permitidos = [
    "https://antoniobenacombate.github.io",
    "https://acb-actas-reunion.pages.dev",
    "http://localhost:5180",
  ];
  const destino = new URL(volver);
  const token = localStorage.getItem("<clave del token de Portal Obra>");
  if (token && permitidos.includes(destino.origin)) {
    destino.searchParams.set("po", token);
    window.location.replace(destino.toString());
  }
}
```

Puntos importantes:

- **Comprobar el origen de `volver` contra una lista blanca.** Sin eso,
  cualquier enlace podría llevarse el token del usuario.
- Si no hay sesión, mostrar primero el acceso y hacer la redirección después de
  entrar (guardando `volver` mientras tanto).
- El token viaja por la query: es de un solo salto y Actas limpia la URL nada
  más leerlo, pero conviene mantener el TTL corto de Portal Obra (7 días hoy).

## Siguientes pasos posibles

- **Salto con sesión en sentido contrario** (Actas → Portal Obra): mismo
  mecanismo, con un endpoint `/api/auth/actas` en el Worker de Portal Obra.
- **Datos de obra compartidos**: traer los `registros_obra` de Portal Obra como
  fuente para redactar el acta, enlazando `obras.codigo` con la obra de campo.
