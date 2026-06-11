-- ============================================================
-- Migración de datos desde Supabase (estado a 11-06-2026)
-- Aplicar UNA VEZ tras schema.sql: npm run db:seed
-- Contraseña temporal de los usuarios migrados: actas2026
-- (cambiarla desde Configuración tras el primer acceso)
-- ============================================================

-- Clientes
INSERT OR IGNORE INTO clientes (id, nombre) VALUES
  ('cli-sin-cliente', 'Sin cliente'),
  ('cli-dgc', 'DGC');

-- Obra real migrada (conserva su UUID de Supabase)
INSERT OR IGNORE INTO obras (id, codigo, nombre, cliente_id) VALUES
  ('4fd84019-0f97-4b9c-bf16-742c19c06d3e',
   'CYV OBRA',
   'CYV OBRAS: AUTOVÍA DEL MEDITERRÁNEO A-7. AMPLIACIÓN A  TERCER CARRIL POR CALZADA ENTRE LOS PP.KK. 528 Y 545.  TRAMO: CREVILLENTE (ENLACE CON LA AP-7) - ENLACE DE  ORIHUELA/BENFERRI. PROVINCIA DE ALICANTE',
   'cli-dgc');

-- Usuarios migrados (mismos UUID; flags conservados)
INSERT OR IGNORE INTO usuarios (id, email, nombre, password_hash, es_admin, aprobado, obra_preferente_id) VALUES
  ('5e07fc38-2daf-43e0-80d1-102895d62dde',
   'antoniobenacombate@gmail.com',
   'Antonio Carlos Benavides García',
   'da3b5a43bd5df33088463ac60dcbd422:9101e9ab8abc78aa967ac431e2821743ff0db90dac88ce080cf60e82795394ad',
   1, 1, '4fd84019-0f97-4b9c-bf16-742c19c06d3e'),
  ('ab82e481-b5aa-4cb3-8b79-7441074be5bf',
   'antonio.benavides@grusamar.com',
   'Antonio Benavides',
   'c227ebf59bc6447caafd1bdc56da688b:5607aecbea1ddc195cea52d5d9830890bb7e8801a50dfa10f30bf008b6517f3c',
   0, 1, NULL);

INSERT INTO auditoria (accion, entidad, detalle)
  VALUES ('migracion', 'sistema', 'Datos migrados desde Supabase a D1');
