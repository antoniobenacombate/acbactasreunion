// Integración con ACB Portal Obra (aplicación hermana).
// Portal Obra envía aquí al usuario con su token de sesión en la query
// (`?po=<token>`), y este módulo lo recoge y limpia la URL para que el token
// no quede en la barra de direcciones ni en el historial.

export const URL_PORTALOBRA = "https://acb-portalobra.pages.dev";
export const PARAM_TOKEN = "po";

/** URL de Portal Obra que pide sesión y devuelve al usuario a esta app. */
export function urlEntradaPortalObra(): string {
  const volver = `${window.location.origin}${window.location.pathname}`;
  return `${URL_PORTALOBRA}/?volver=${encodeURIComponent(volver)}`;
}

function limpiarParametro(parametros: URLSearchParams) {
  parametros.delete(PARAM_TOKEN);
  const consulta = parametros.toString();
  const limpia = `${window.location.pathname}${consulta ? `?${consulta}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", limpia);
}

/**
 * Extrae el token que Portal Obra deja en la URL y la deja limpia.
 * Se admite tanto `?po=` (antes de la almohadilla) como `#/ruta?po=`,
 * porque la app usa HashRouter.
 */
export function extraerTokenPortalObra(): string | null {
  const parametros = new URLSearchParams(window.location.search);
  const token = parametros.get(PARAM_TOKEN);
  if (token) {
    limpiarParametro(parametros);
    return token;
  }

  // Token dentro del hash de ruta: #/acceso?po=...
  const hash = window.location.hash;
  const posicion = hash.indexOf("?");
  if (posicion === -1) return null;
  const parametrosHash = new URLSearchParams(hash.slice(posicion + 1));
  const tokenHash = parametrosHash.get(PARAM_TOKEN);
  if (!tokenHash) return null;

  parametrosHash.delete(PARAM_TOKEN);
  const consulta = parametrosHash.toString();
  const nuevoHash = `${hash.slice(0, posicion)}${consulta ? `?${consulta}` : ""}`;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${nuevoHash}`,
  );
  return tokenHash;
}
