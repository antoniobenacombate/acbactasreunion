// Rutas de autenticación: registro, entrada, perfil, contraseña, preferente
import { Hono } from "hono";
import type { Env, UsuarioBD, Variables } from "../tipos";
import { firmarJwt } from "../lib/jwt";
import { hashContrasena, verificarContrasena } from "../lib/contrasena";
import { auditar } from "../lib/auditoria";
import { requiereSesion } from "../middleware/autenticacion";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

function perfilPublico(u: UsuarioBD) {
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    esAdmin: !!u.es_admin,
    aprobado: !!u.aprobado,
    obraPreferenteId: u.obra_preferente_id ?? undefined,
  };
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

auth.post("/registro", async (c) => {
  const cuerpo = await c.req.json().catch(() => null);
  const email = String(cuerpo?.email ?? "").trim().toLowerCase();
  const contrasena = String(cuerpo?.contrasena ?? "");
  const nombre = String(cuerpo?.nombre ?? "").trim();

  if (!emailValido(email)) return c.json({ error: "El email no es válido." }, 400);
  if (contrasena.length < 6)
    return c.json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);

  const existente = await c.env.DB.prepare("SELECT id FROM usuarios WHERE email = ?1")
    .bind(email)
    .first();
  if (existente) return c.json({ error: "Ese email ya está registrado." }, 409);

  // Primer usuario o email del administrador designado → admin aprobado
  const { total } = (await c.env.DB.prepare("SELECT COUNT(*) AS total FROM usuarios").first()) as {
    total: number;
  };
  const esAdmin = total === 0 || email === c.env.ADMIN_EMAIL.toLowerCase();

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO usuarios (id, email, nombre, password_hash, es_admin, aprobado)
     VALUES (?1, ?2, ?3, ?4, ?5, ?5)`,
  )
    .bind(id, email, nombre, await hashContrasena(contrasena), esAdmin ? 1 : 0)
    .run();

  await auditar(c.env, { usuarioId: id, usuarioEmail: email, accion: "registro", entidad: "usuario", entidadId: id });

  const usuario = (await c.env.DB.prepare("SELECT * FROM usuarios WHERE id = ?1")
    .bind(id)
    .first()) as UsuarioBD;
  const token = await firmarJwt({ sub: id, email }, c.env.JWT_SECRET);
  return c.json({ token, usuario: perfilPublico(usuario) }, 201);
});

auth.post("/entrar", async (c) => {
  const cuerpo = await c.req.json().catch(() => null);
  const email = String(cuerpo?.email ?? "").trim().toLowerCase();
  const contrasena = String(cuerpo?.contrasena ?? "");

  const usuario = await c.env.DB.prepare("SELECT * FROM usuarios WHERE email = ?1")
    .bind(email)
    .first<UsuarioBD>();
  // Mensaje único: no revelar si el email existe
  if (!usuario || !(await verificarContrasena(contrasena, usuario.password_hash)))
    return c.json({ error: "Email o contraseña incorrectos." }, 401);

  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: email, accion: "entrar", entidad: "usuario", entidadId: usuario.id });

  const token = await firmarJwt({ sub: usuario.id, email: usuario.email }, c.env.JWT_SECRET);
  return c.json({ token, usuario: perfilPublico(usuario) });
});

auth.get("/yo", requiereSesion, async (c) => {
  return c.json(perfilPublico(c.get("usuario")));
});

auth.post("/cambiar-contrasena", requiereSesion, async (c) => {
  const usuario = c.get("usuario");
  const cuerpo = await c.req.json().catch(() => null);
  const actual = String(cuerpo?.actual ?? "");
  const nueva = String(cuerpo?.nueva ?? "");

  if (nueva.length < 6)
    return c.json({ error: "La contraseña nueva debe tener al menos 6 caracteres." }, 400);
  if (!(await verificarContrasena(actual, usuario.password_hash)))
    return c.json({ error: "La contraseña actual no es correcta." }, 401);

  await c.env.DB.prepare(
    `UPDATE usuarios SET password_hash = ?1,
       fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?2`,
  )
    .bind(await hashContrasena(nueva), usuario.id)
    .run();
  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "cambiar_contrasena", entidad: "usuario", entidadId: usuario.id });
  return c.json({ ok: true });
});

auth.put("/obra-preferente", requiereSesion, async (c) => {
  const usuario = c.get("usuario");
  const cuerpo = await c.req.json().catch(() => null);
  const obraId = cuerpo?.obraId ? String(cuerpo.obraId) : null;
  await c.env.DB.prepare(
    `UPDATE usuarios SET obra_preferente_id = ?1,
       fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?2`,
  )
    .bind(obraId, usuario.id)
    .run();
  return c.json({ ok: true });
});

export default auth;
