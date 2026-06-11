// CRUD de obras. El frontend trabaja con el nombre del cliente;
// el Worker resuelve o crea la fila de cliente correspondiente.
import { Hono } from "hono";
import type { Env, Variables } from "../tipos";
import { auditar } from "../lib/auditoria";

const obras = new Hono<{ Bindings: Env; Variables: Variables }>();

const SELECCION = `SELECT o.id, o.codigo, o.nombre, o.cliente_id, c.nombre AS cliente
                     FROM obras o JOIN clientes c ON c.id = o.cliente_id`;

async function resolverCliente(env: Env, nombre: string): Promise<string> {
  const limpio = nombre.trim() || "Sin cliente";
  const existente = await env.DB.prepare("SELECT id FROM clientes WHERE nombre = ?1")
    .bind(limpio)
    .first<{ id: string }>();
  if (existente) {
    // Si estaba desactivado y vuelve a usarse, se reactiva
    await env.DB.prepare("UPDATE clientes SET activo = 1 WHERE id = ?1 AND activo = 0")
      .bind(existente.id)
      .run();
    return existente.id;
  }
  const id = limpio === "Sin cliente" ? "cli-sin-cliente" : crypto.randomUUID();
  await env.DB.prepare("INSERT OR IGNORE INTO clientes (id, nombre) VALUES (?1, ?2)")
    .bind(id, limpio)
    .run();
  return id;
}

obras.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(`${SELECCION} ORDER BY o.fecha_creacion`).all();
  return c.json(results ?? []);
});

obras.post("/", async (c) => {
  const usuario = c.get("usuario");
  const cuerpo = await c.req.json().catch(() => null);
  const nombre = String(cuerpo?.nombre ?? "").trim();
  const codigo = String(cuerpo?.codigo ?? "").trim();
  if (!nombre) return c.json({ error: "El nombre de la obra es obligatorio." }, 400);

  const clienteId = await resolverCliente(c.env, String(cuerpo?.cliente ?? ""));
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO obras (id, codigo, nombre, cliente_id) VALUES (?1, ?2, ?3, ?4)",
  )
    .bind(id, codigo || nombre.slice(0, 8).toUpperCase(), nombre, clienteId)
    .run();
  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "crear", entidad: "obra", entidadId: id, detalle: nombre });

  const fila = await c.env.DB.prepare(`${SELECCION} WHERE o.id = ?1`).bind(id).first();
  return c.json(fila, 201);
});

obras.put("/:id", async (c) => {
  const usuario = c.get("usuario");
  const id = c.req.param("id");
  const cuerpo = await c.req.json().catch(() => null);
  const nombre = String(cuerpo?.nombre ?? "").trim();
  const codigo = String(cuerpo?.codigo ?? "").trim();
  if (!nombre) return c.json({ error: "El nombre de la obra es obligatorio." }, 400);

  const clienteId = await resolverCliente(c.env, String(cuerpo?.cliente ?? ""));
  const resultado = await c.env.DB.prepare(
    `UPDATE obras SET codigo = ?1, nombre = ?2, cliente_id = ?3,
       fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?4`,
  )
    .bind(codigo || nombre.slice(0, 8).toUpperCase(), nombre, clienteId, id)
    .run();
  if (!resultado.meta.changes) return c.json({ error: "Obra no encontrada." }, 404);

  // Mantiene la denormalización cliente_id de las actas de la obra
  await c.env.DB.prepare("UPDATE actas SET cliente_id = ?1 WHERE obra_id = ?2")
    .bind(clienteId, id)
    .run();

  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "actualizar", entidad: "obra", entidadId: id, detalle: nombre });
  return c.json({ ok: true });
});

// Elimina la obra y TODAS sus actas (cascada por FK)
obras.delete("/:id", async (c) => {
  const usuario = c.get("usuario");
  const id = c.req.param("id");
  const resultado = await c.env.DB.prepare("DELETE FROM obras WHERE id = ?1").bind(id).run();
  if (!resultado.meta.changes) return c.json({ error: "Obra no encontrada." }, 404);
  await c.env.DB.prepare(
    "UPDATE usuarios SET obra_preferente_id = NULL WHERE obra_preferente_id = ?1",
  )
    .bind(id)
    .run();
  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "eliminar", entidad: "obra", entidadId: id, detalle: "con actas en cascada" });
  return c.json({ ok: true });
});

export default obras;
