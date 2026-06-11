// Registro de auditoría de operaciones críticas
import type { Env } from "../tipos";

export async function auditar(
  env: Env,
  datos: {
    usuarioId?: string;
    usuarioEmail?: string;
    accion: string;
    entidad?: string;
    entidadId?: string;
    detalle?: string;
  },
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO auditoria (usuario_id, usuario_email, accion, entidad, entidad_id, detalle)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
      .bind(
        datos.usuarioId ?? null,
        datos.usuarioEmail ?? null,
        datos.accion,
        datos.entidad ?? null,
        datos.entidadId ?? null,
        datos.detalle ?? null,
      )
      .run();
  } catch {
    // La auditoría nunca debe tumbar la operación principal
  }
}
