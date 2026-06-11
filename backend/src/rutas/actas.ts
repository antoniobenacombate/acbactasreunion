// CRUD de actas: listado paginado, detalle, alta, edición,
// cambio de estado y eliminación lógica.
import { Hono } from "hono";
import type { Env, Variables } from "../tipos";
import { auditar } from "../lib/auditoria";

const actas = new Hono<{ Bindings: Env; Variables: Variables }>();

const ESTADOS = ["borrador", "emitida", "aprobada"] as const;
const ORIGENES = ["manuscrito", "transcripcion", "audio", "nota", "manual"];

const CAMPOS = `id, cliente_id, obra_id, numero_acta, fecha, titulo, contenido,
                estado, autor, origen, fecha_creacion, fecha_actualizacion`;

function aRespuesta(fila: Record<string, unknown>) {
  let contenido: Record<string, unknown> = {};
  try {
    contenido = JSON.parse(String(fila.contenido ?? "{}"));
  } catch {
    contenido = {};
  }
  return {
    id: fila.id,
    obraId: fila.obra_id,
    clienteId: fila.cliente_id,
    numero: fila.numero_acta,
    fecha: fila.fecha,
    objeto: fila.titulo,
    estado: fila.estado,
    autor: fila.autor,
    origen: fila.origen,
    lugar: contenido.lugar ?? "",
    asistentes: contenido.asistentes ?? [],
    asuntos: contenido.asuntos ?? [],
    proximaReunion: contenido.proximaReunion ?? undefined,
    textoOriginal: contenido.textoOriginal ?? undefined,
    creadoEl: fila.fecha_creacion,
  };
}

function validarEntrada(cuerpo: unknown): { error?: string } {
  const b = cuerpo as Record<string, unknown> | null;
  if (!b) return { error: "Cuerpo de la petición inválido." };
  if (!b.obraId) return { error: "La obra es obligatoria." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha ?? "")))
    return { error: "La fecha no es válida." };
  if (b.origen && !ORIGENES.includes(String(b.origen)))
    return { error: "Origen no válido." };
  return {};
}

function empaquetarContenido(b: Record<string, unknown>): string {
  return JSON.stringify({
    lugar: String(b.lugar ?? ""),
    asistentes: Array.isArray(b.asistentes) ? b.asistentes : [],
    asuntos: Array.isArray(b.asuntos) ? b.asuntos : [],
    proximaReunion: b.proximaReunion ? String(b.proximaReunion) : undefined,
    textoOriginal: b.textoOriginal ? String(b.textoOriginal) : undefined,
  });
}

// Listado paginado (sin eliminadas); filtro opcional ?obra=
actas.get("/", async (c) => {
  const pagina = Math.max(1, parseInt(c.req.query("pagina") ?? "1", 10) || 1);
  const limite = Math.min(200, Math.max(1, parseInt(c.req.query("limite") ?? "100", 10) || 100));
  const obraId = c.req.query("obra");

  const filtro = obraId ? "WHERE eliminado = 0 AND obra_id = ?3" : "WHERE eliminado = 0";
  const consulta = c.env.DB.prepare(
    `SELECT ${CAMPOS} FROM actas ${filtro} ORDER BY fecha DESC, numero_acta DESC LIMIT ?1 OFFSET ?2`,
  );
  const cuenta = c.env.DB.prepare(`SELECT COUNT(*) AS total FROM actas ${filtro.replace("?3", "?1")}`);

  const [filas, total] = await Promise.all([
    (obraId
      ? consulta.bind(limite, (pagina - 1) * limite, obraId)
      : consulta.bind(limite, (pagina - 1) * limite)
    ).all(),
    (obraId ? cuenta.bind(obraId) : cuenta).first<{ total: number }>(),
  ]);

  return c.json({
    datos: (filas.results ?? []).map(aRespuesta),
    total: total?.total ?? 0,
    pagina,
    limite,
  });
});

actas.get("/:id", async (c) => {
  const fila = await c.env.DB.prepare(`SELECT ${CAMPOS} FROM actas WHERE id = ?1 AND eliminado = 0`)
    .bind(c.req.param("id"))
    .first();
  if (!fila) return c.json({ error: "Acta no encontrada." }, 404);
  return c.json(aRespuesta(fila as Record<string, unknown>));
});

actas.post("/", async (c) => {
  const usuario = c.get("usuario");
  const cuerpo = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const { error } = validarEntrada(cuerpo);
  if (error || !cuerpo) return c.json({ error: error ?? "Petición inválida." }, 400);

  const obra = await c.env.DB.prepare("SELECT id, cliente_id FROM obras WHERE id = ?1")
    .bind(String(cuerpo.obraId))
    .first<{ id: string; cliente_id: string }>();
  if (!obra) return c.json({ error: "La obra indicada no existe." }, 400);

  // Numeración correlativa dentro de la obra, calculada en servidor
  const { siguiente } = (await c.env.DB.prepare(
    "SELECT COALESCE(MAX(numero_acta), 0) + 1 AS siguiente FROM actas WHERE obra_id = ?1",
  )
    .bind(obra.id)
    .first()) as { siguiente: number };

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO actas (id, cliente_id, obra_id, numero_acta, fecha, titulo, contenido, estado, autor, origen)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'borrador', ?8, ?9)`,
  )
    .bind(
      id,
      obra.cliente_id,
      obra.id,
      siguiente,
      String(cuerpo.fecha),
      String(cuerpo.objeto ?? ""),
      empaquetarContenido(cuerpo),
      usuario.nombre || usuario.email,
      String(cuerpo.origen ?? "manual"),
    )
    .run();

  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "crear", entidad: "acta", entidadId: id });
  const fila = await c.env.DB.prepare(`SELECT ${CAMPOS} FROM actas WHERE id = ?1`).bind(id).first();
  return c.json(aRespuesta(fila as Record<string, unknown>), 201);
});

actas.put("/:id", async (c) => {
  const usuario = c.get("usuario");
  const id = c.req.param("id");
  const cuerpo = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const { error } = validarEntrada(cuerpo);
  if (error || !cuerpo) return c.json({ error: error ?? "Petición inválida." }, 400);

  const obra = await c.env.DB.prepare("SELECT id, cliente_id FROM obras WHERE id = ?1")
    .bind(String(cuerpo.obraId))
    .first<{ id: string; cliente_id: string }>();
  if (!obra) return c.json({ error: "La obra indicada no existe." }, 400);

  const resultado = await c.env.DB.prepare(
    `UPDATE actas SET cliente_id = ?1, obra_id = ?2, fecha = ?3, titulo = ?4, contenido = ?5, origen = ?6,
       fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?7 AND eliminado = 0`,
  )
    .bind(
      obra.cliente_id,
      obra.id,
      String(cuerpo.fecha),
      String(cuerpo.objeto ?? ""),
      empaquetarContenido(cuerpo),
      String(cuerpo.origen ?? "manual"),
      id,
    )
    .run();
  if (!resultado.meta.changes) return c.json({ error: "Acta no encontrada." }, 404);

  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "actualizar", entidad: "acta", entidadId: id });
  return c.json({ ok: true });
});

actas.patch("/:id/estado", async (c) => {
  const usuario = c.get("usuario");
  const id = c.req.param("id");
  const cuerpo = (await c.req.json().catch(() => null)) as { estado?: string } | null;
  const estado = String(cuerpo?.estado ?? "");
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number]))
    return c.json({ error: "Estado no válido." }, 400);

  const resultado = await c.env.DB.prepare(
    `UPDATE actas SET estado = ?1,
       fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?2 AND eliminado = 0`,
  )
    .bind(estado, id)
    .run();
  if (!resultado.meta.changes) return c.json({ error: "Acta no encontrada." }, 404);

  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "cambiar_estado", entidad: "acta", entidadId: id, detalle: estado });
  return c.json({ ok: true });
});

// Eliminación lógica
actas.delete("/:id", async (c) => {
  const usuario = c.get("usuario");
  const id = c.req.param("id");
  const resultado = await c.env.DB.prepare(
    `UPDATE actas SET eliminado = 1,
       fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?1 AND eliminado = 0`,
  )
    .bind(id)
    .run();
  if (!resultado.meta.changes) return c.json({ error: "Acta no encontrada." }, 404);
  await auditar(c.env, { usuarioId: usuario.id, usuarioEmail: usuario.email, accion: "eliminar", entidad: "acta", entidadId: id });
  return c.json({ ok: true });
});

export default actas;
