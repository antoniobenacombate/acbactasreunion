// Hash de contraseñas PBKDF2-SHA256 (formato saltHex:hashHex)
const enc = new TextEncoder();

const aHex = (buf: Uint8Array) =>
  Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function derivar(contrasena: string, salt: Uint8Array): Promise<string> {
  const clave = await crypto.subtle.importKey("raw", enc.encode(contrasena), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 10_000, hash: "SHA-256" },
    clave,
    256,
  );
  return aHex(new Uint8Array(bits));
}

export async function hashContrasena(contrasena: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${aHex(salt)}:${await derivar(contrasena, salt)}`;
}

export async function verificarContrasena(contrasena: string, guardado: string): Promise<boolean> {
  const [saltHex, hashHex] = guardado.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const nuevo = await derivar(contrasena, salt);
  return nuevo === hashHex;
}
