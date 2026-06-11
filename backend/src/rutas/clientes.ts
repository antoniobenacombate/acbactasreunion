// CRUD de clientes (baja lógica con `activo`)
import { Hono } from "hono";
import type { Env, Variables } from "../tipos";
import { auditar } from "../lib/auditoria";

const clientes = new Hono<{ Bindings: Env; Variables: Variables }>();

const CAMPOS = "id, nombre, nif, direccion, telefono, email, activo, fecha_creacion, fecha_actualizacion";

function paginacion(c: { req: { query: (k: string) => string | undefined } }) {
  const pagina = Math.max(1, parseInt(c.req.query("pagina") ?? "1", 10) || 1);
  const limite = Math.min(200, Math.max(1, parseInt(c.req.query("limite") ?? "100", 10) || 100));
  return { pagina, limite, desplazamiento: (pagina - 1) * limite };
}

// Listado paginado (por defecto solo activos; ?todos=1 incluye inactivos)
clientes.get("/", async (c) => {
  const { pagina, limite, desplazamiento } = paginacion(c);
  const incluirInactivos = c.req.query("todos") === "1";
  const filtro = incluirInactivos ? "" : "WHERE activo = 1";

  const [filas, total] = await Promise.all([
    c.env.DB.prepare(`SELECT ${CAMPOS} FROM clientes ${filtro} ORDER BY nombre LIMIT ?1 OFFSET ?2`)
      .bind(limite, desplazamiento)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM clientes ${filtro}`).first<{ total: number }>(),
  ]);
  return c.json({ datos: filas.results ?? [], total: total?.total ?? 0, pagina, limite });
});

clientes.get("/:id", async (c) => {
  const fila = await c.env.DB.prepare(`SELECT ${CAMPOS} FROM clientes WHERE id = ?1`)
    .bind(c.req.param("id"))
    .first();
  if (!fila) return c.json({ error: "Cliente no encontrado." }, 404);
  return c.json(fila);
});

clientes.post("/", async (c) => {
  const usuario = c.get("usuario");
  const cuerpo = await c.req.json().catch(() => null);
  const nombre = String(cuerpo?.nombre ?? "").trim();
  if (!nombre) return c.json({ error: "El nombre es obligatorio." }, 400);

  const existente = await c.env.DB.prepare("SELECT id FROM clientes WHERE nombre = ?1")
    .bind(nombre)
    .first();
  if (existente) return c.json({ error: "Ya existe un cliente con ese nombre." }, 409);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO clientes (id, nombre, nif, direccion, telefono, email)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(
      id,
      nombre,
      cuerpo?.nif ? String(cuerpo.nif) : null,
      cuerpo?.direccion ? String(cuerpo.direccion) : null,
      cuerpo?.telefono ? String(cuerpo.telefono) : null,
      cuerpo?.email ? String(cuerpo.email) : null,
    )
    .run();
  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "crear", entidad: "cliente", entidadId: id, detalle: nombre });
  const fila = await c.env.DB.prepare(`SELECT ${CAMPOS} FROM clientes WHERE id = ?1`).bind(id).first();
  return c.json(fila, 201);
});

clientes.put("/:id", async (c) => {
  const usuario = c.get("usuario");
  const id = c.req.param("id");
  const cuerpo = await c.req.json().catch(() => null);
  const nombre = String(cuerpo?.nombre ?? "").trim();
  if (!nombre) return c.json({ error: "El nombre es obligatorio." }, 400);

  const duplicado = await c.env.DB.prepare("SELECT id FROM clientes WHERE nombre = ?1 AND id != ?2")
    .bind(nombre, id)
    .first();
  if (duplicado) return c.json({ error: "Ya existe un cliente con ese nombre." }, 409);

  const resultado = await c.env.DB.prepare(
    `UPDATE clientes SET nombre = ?1, nif = ?2, direccion = ?3, telefono = ?4, email = ?5,
       fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?6`,
  )
    .bind(
      nombre,
      cuerpo?.nif ? String(cuerpo.nif) : null,
      cuerpo?.direccion ? String(cuerpo.direccion) : null,
      cuerpo?.telefono ? String(cuerpo.telefono) : null,
      cuerpo?.email ? String(cuerpo.email) : null,
      id,
    )
    .run();
  if (!resultado.meta.changes) return c.json({ error: "Cliente no encontrado." }, 404);

  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "actualizar", entidad: "cliente", entidadId: id, detalle: nombre });
  return c.json({ ok: true });
});

// Desactivación lógica; sus obras pasan al cliente "Sin cliente"
clientes.delete("/:id", async (c) => {
  const usuario = c.get("usuario");
  const id = c.req.param("id");

  const fila = await c.env.DB.prepare("SELECT id, nombre FROM clientes WHERE id = ?1")
    .bind(id)
    .first<{ id: string; nombre: string }>();
  if (!fila) return c.json({ error: "Cliente no encontrado." }, 404);
  if (fila.nombre === "Sin cliente")
    return c.json({ error: "Este cliente no puede desactivarse." }, 400);

  // Garantiza el cliente comodín y reasigna obras y actas
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO clientes (id, nombre) VALUES ('cli-sin-cliente', 'Sin cliente')`,
  ).run();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE obras SET cliente_id = 'cli-sin-cliente' WHERE cliente_id = ?1").bind(id),
    c.env.DB.prepare("UPDATE actas SET cliente_id = 'cli-sin-cliente' WHERE cliente_id = ?1").bind(id),
    c.env.DB.prepare(
      `UPDATE clientes SET activo = 0,
         fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?1`,
    ).bind(id),
  ]);

  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "desactivar", entidad: "cliente", entidadId: id, detalle: fila.nombre });
  return c.json({ ok: true });
});

export default clientes;
