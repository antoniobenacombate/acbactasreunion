// Rutas de autenticación: registro, entrada, perfil, contraseña, preferente
import { Hono } from "hono";
import type { Env, PerfilPortalObra, UsuarioBD, Variables } from "../tipos";
import { firmarJwt } from "../lib/jwt";
import { hashContrasena, verificarContrasena } from "../lib/contrasena";
import { auditar } from "../lib/auditoria";
import { requiereSesion } from "../middleware/autenticacion";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// Marca de contraseña para cuentas creadas por acceso único: no es un hash
// válido, así que ninguna contraseña puede coincidir con ella.
const MARCA_SSO = "sso-portalobra";

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

// Acceso único (SSO) con ACB Portal Obra.
// Recibe un token emitido por el Worker de Portal Obra, lo valida contra su
// propia API (no se comparte el JWT_SECRET entre las dos aplicaciones) y abre
// sesión aquí. Si el usuario no existe todavía en Actas se crea heredando la
// aprobación que ya tiene en Portal Obra.
auth.post("/portalobra", async (c) => {
  const base = (c.env.PORTALOBRA_API ?? "").trim().replace(/\/+$/, "");
  if (!base) return c.json({ error: "La integración con Portal Obra no está configurada." }, 503);

  const cuerpo = await c.req.json().catch(() => null);
  const tokenExterno = String(cuerpo?.token ?? "").trim();
  if (!tokenExterno) return c.json({ error: "Falta el token de Portal Obra." }, 400);

  let externo: PerfilPortalObra;
  try {
    const respuesta = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenExterno}` },
    });
    if (!respuesta.ok)
      return c.json({ error: "La sesión de Portal Obra no es válida o ha caducado." }, 401);
    externo = (await respuesta.json()) as PerfilPortalObra;
  } catch {
    return c.json({ error: "No se ha podido contactar con Portal Obra." }, 502);
  }

  const email = String(externo?.email ?? "").trim().toLowerCase();
  if (!emailValido(email))
    return c.json({ error: "La sesión de Portal Obra no es válida o ha caducado." }, 401);
  if (!externo?.is_approved)
    return c.json({ error: "Tu cuenta de Portal Obra está pendiente de aprobación." }, 403);

  const nombre = String(externo?.full_name ?? "").trim();
  let usuario = await c.env.DB.prepare("SELECT * FROM usuarios WHERE email = ?1")
    .bind(email)
    .first<UsuarioBD>();

  if (!usuario) {
    const { total } = (await c.env.DB.prepare("SELECT COUNT(*) AS total FROM usuarios").first()) as {
      total: number;
    };
    const esAdmin =
      total === 0 || email === c.env.ADMIN_EMAIL.toLowerCase() || !!externo?.is_admin;
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO usuarios (id, email, nombre, password_hash, es_admin, aprobado)
       VALUES (?1, ?2, ?3, ?4, ?5, 1)`,
    )
      .bind(id, email, nombre || email, MARCA_SSO, esAdmin ? 1 : 0)
      .run();
    usuario = (await c.env.DB.prepare("SELECT * FROM usuarios WHERE id = ?1")
      .bind(id)
      .first()) as UsuarioBD;
  } else if (!usuario.aprobado || (!usuario.nombre && nombre)) {
    // Ya aprobado en Portal Obra: se refleja aquí sin volver a pedir el visto bueno
    await c.env.DB.prepare(
      `UPDATE usuarios SET aprobado = 1, nombre = ?1,
         fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?2`,
    )
      .bind(usuario.nombre || nombre || email, usuario.id)
      .run();
    usuario = (await c.env.DB.prepare("SELECT * FROM usuarios WHERE id = ?1")
      .bind(usuario.id)
      .first()) as UsuarioBD;
  }

  await auditar(c.env, {
    usuarioId: usuario.id,
    usuarioEmail: email,
    accion: "entrar_sso",
    entidad: "usuario",
    entidadId: usuario.id,
    detalle: "portalobra",
  });

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
  // Cuenta creada por acceso único: aún no tiene contraseña local, así que la
  // define sin pedir la anterior (la sesión ya está verificada).
  const sinContrasenaLocal = usuario.password_hash === MARCA_SSO;
  if (!sinContrasenaLocal && !(await verificarContrasena(actual, usuario.password_hash)))
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
