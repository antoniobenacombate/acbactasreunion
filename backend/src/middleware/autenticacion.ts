// Middleware de autenticación y autorización.
// Verifica el JWT y SIEMPRE recarga el usuario desde la base de datos para
// que aprobaciones/revocaciones surtan efecto inmediato (no se confía en
// los flags del token).
import type { Context, Next } from "hono";
import type { Env, UsuarioBD, Variables } from "../tipos";
import { verificarJwt } from "../lib/jwt";

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

export async function requiereSesion(c: Ctx, next: Next) {
  const cabecera = c.req.header("Authorization") ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  if (!token) return c.json({ error: "No autorizado" }, 401);

  const carga = await verificarJwt(token, c.env.JWT_SECRET);
  if (!carga) return c.json({ error: "Sesión inválida o caducada" }, 401);

  const usuario = await c.env.DB.prepare("SELECT * FROM usuarios WHERE id = ?1")
    .bind(carga.sub)
    .first<UsuarioBD>();
  if (!usuario) return c.json({ error: "Sesión inválida o caducada" }, 401);

  c.set("usuario", usuario);
  return next();
}

/** Solo usuarios aprobados (o admin) acceden a los datos */
export async function requiereAprobado(c: Ctx, next: Next) {
  const usuario = c.get("usuario");
  if (!usuario.aprobado && !usuario.es_admin)
    return c.json({ error: "Cuenta pendiente de aprobación" }, 403);
  return next();
}

export async function requiereAdmin(c: Ctx, next: Next) {
  const usuario = c.get("usuario");
  if (!usuario.es_admin) return c.json({ error: "Se requiere rol de administrador" }, 403);
  return next();
}
