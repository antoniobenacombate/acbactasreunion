// Gestión de usuarios (solo administradores)
import { Hono } from "hono";
import type { Env, Variables } from "../tipos";
import { auditar } from "../lib/auditoria";

const usuarios = new Hono<{ Bindings: Env; Variables: Variables }>();

usuarios.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, email, nombre, es_admin, aprobado, fecha_creacion
       FROM usuarios ORDER BY fecha_creacion`,
  ).all();
  return c.json(
    (results ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      esAdmin: !!u.es_admin,
      aprobado: !!u.aprobado,
    })),
  );
});

usuarios.put("/:id", async (c) => {
  const admin = c.get("usuario");
  const id = c.req.param("id");
  if (id === admin.id)
    return c.json({ error: "No puedes modificar tu propia cuenta desde aquí." }, 400);

  const cuerpo = await c.req.json().catch(() => null);
  const cambios: string[] = [];
  const valores: unknown[] = [];
  if (typeof cuerpo?.aprobado === "boolean") {
    cambios.push(`aprobado = ?${valores.length + 1}`);
    valores.push(cuerpo.aprobado ? 1 : 0);
  }
  if (typeof cuerpo?.esAdmin === "boolean") {
    cambios.push(`es_admin = ?${valores.length + 1}`);
    valores.push(cuerpo.esAdmin ? 1 : 0);
  }
  if (!cambios.length) return c.json({ error: "Nada que actualizar." }, 400);

  const resultado = await c.env.DB.prepare(
    `UPDATE usuarios SET ${cambios.join(", ")},
       fecha_actualizacion = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?${valores.length + 1}`,
  )
    .bind(...valores, id)
    .run();
  if (!resultado.meta.changes) return c.json({ error: "Usuario no encontrado." }, 404);

  await auditar(c.env, {
    usuarioId: admin.id,
    usuarioEmail: admin.email,
    accion: "actualizar_usuario",
    entidad: "usuario",
    entidadId: id,
    detalle: JSON.stringify({ aprobado: cuerpo?.aprobado, esAdmin: cuerpo?.esAdmin }),
  });
  return c.json({ ok: true });
});

usuarios.delete("/:id", async (c) => {
  const admin = c.get("usuario");
  const id = c.req.param("id");
  if (id === admin.id)
    return c.json({ error: "No puedes eliminar tu propia cuenta." }, 400);

  const resultado = await c.env.DB.prepare("DELETE FROM usuarios WHERE id = ?1")
    .bind(id)
    .run();
  if (!resultado.meta.changes) return c.json({ error: "Usuario no encontrado." }, 404);

  await auditar(c.env, {
    usuarioId: admin.id,
    usuarioEmail: admin.email,
    accion: "eliminar_usuario",
    entidad: "usuario",
    entidadId: id,
  });
  return c.json({ ok: true });
});

export default usuarios;
