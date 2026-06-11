// Cliente de la API privada (Cloudflare Worker).
// El navegador solo conoce esta URL y el token de sesión del usuario:
// no existe ninguna credencial de base de datos en el cliente.

const URL_API = "https://acb-actas-backend.antoniobenacombate.workers.dev";
const CLAVE_TOKEN = "acb_actas_token";

export function obtenerToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string) {
  localStorage.setItem(CLAVE_TOKEN, token);
}

export function borrarToken() {
  localStorage.removeItem(CLAVE_TOKEN);
}

export async function apiFetch<T = unknown>(ruta: string, init: RequestInit = {}): Promise<T> {
  const token = obtenerToken();
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const datos = (await respuesta.json().catch(() => ({}))) as T & { error?: string };
  if (!respuesta.ok) throw new Error(datos?.error ?? `Error HTTP ${respuesta.status}`);
  return datos;
}
