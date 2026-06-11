// JWT HS256 con Web Crypto (mismo patrón que ACB_PORTALOBRA)
import type { CargaJwt } from "../tipos";

const b64u = {
  codificar: (buf: ArrayBuffer | Uint8Array): string =>
    btoa(String.fromCharCode(...(buf instanceof Uint8Array ? buf : new Uint8Array(buf))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  decodificar: (s: string): Uint8Array =>
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
};

const enc = new TextEncoder();
const dec = new TextDecoder();

async function importarClave(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function firmarJwt(
  carga: Omit<CargaJwt, "exp" | "iat">,
  secreto: string,
  ttlHoras = 24 * 7,
): Promise<string> {
  const cabecera = b64u.codificar(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = b64u.codificar(
    enc.encode(JSON.stringify({ ...carga, iat: ahora, exp: ahora + ttlHoras * 3600 })),
  );
  const datos = `${cabecera}.${cuerpo}`;
  const clave = await importarClave(secreto);
  const firma = await crypto.subtle.sign("HMAC", clave, enc.encode(datos));
  return `${datos}.${b64u.codificar(firma)}`;
}

export async function verificarJwt(token: string, secreto: string): Promise<CargaJwt | null> {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [cabecera, cuerpo, firma] = partes;
  const clave = await importarClave(secreto);
  const valido = await crypto.subtle.verify(
    "HMAC",
    clave,
    b64u.decodificar(firma),
    enc.encode(`${cabecera}.${cuerpo}`),
  );
  if (!valido) return null;
  try {
    const carga = JSON.parse(dec.decode(b64u.decodificar(cuerpo))) as CargaJwt;
    if (carga.exp < Math.floor(Date.now() / 1000)) return null;
    return carga;
  } catch {
    return null;
  }
}
