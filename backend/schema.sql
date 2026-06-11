-- ============================================================
-- ACB ACTAS DE REUNIÓN — esquema D1 (SQLite)
-- Aplicar: npm run db:init (remoto) / npm run db:local (local)
-- ============================================================

PRAGMA foreign_keys = ON;

-- Usuarios (auth propia: sustituye a Supabase auth + perfiles)
CREATE TABLE IF NOT EXISTS usuarios (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nombre              TEXT NOT NULL DEFAULT '',
  password_hash       TEXT NOT NULL,            -- formato saltHex:hashHex (PBKDF2-SHA256)
  es_admin            INTEGER NOT NULL DEFAULT 0,
  aprobado            INTEGER NOT NULL DEFAULT 0,
  obra_preferente_id  TEXT,
  fecha_creacion      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  fecha_actualizacion TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- Clientes (entidad propia; campos sensibles en columnas dedicadas,
-- preparadas para cifrado futuro a nivel de aplicación)
CREATE TABLE IF NOT EXISTS clientes (
  id                  TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL UNIQUE,
  nif                 TEXT,
  direccion           TEXT,
  telefono            TEXT,
  email               TEXT,
  activo              INTEGER NOT NULL DEFAULT 1,
  fecha_creacion      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  fecha_actualizacion TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- Obras (una obra pertenece a un cliente)
CREATE TABLE IF NOT EXISTS obras (
  id                  TEXT PRIMARY KEY,
  codigo              TEXT NOT NULL,
  nombre              TEXT NOT NULL,
  cliente_id          TEXT NOT NULL REFERENCES clientes(id),
  fecha_creacion      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  fecha_actualizacion TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- Actas (un cliente tiene múltiples actas; integridad referencial con
-- clientes y obras; borrado lógico con `eliminado`)
CREATE TABLE IF NOT EXISTS actas (
  id                  TEXT PRIMARY KEY,
  cliente_id          TEXT NOT NULL REFERENCES clientes(id),
  obra_id             TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  numero_acta         INTEGER NOT NULL,
  fecha               TEXT NOT NULL,            -- aaaa-mm-dd
  titulo              TEXT NOT NULL DEFAULT '', -- objeto de la reunión
  contenido           TEXT NOT NULL DEFAULT '{}', -- JSON: lugar, asistentes, asuntos, proximaReunion, textoOriginal
  estado              TEXT NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','emitida','aprobada')),
  autor               TEXT NOT NULL DEFAULT '',
  origen              TEXT NOT NULL DEFAULT 'manual',
  eliminado           INTEGER NOT NULL DEFAULT 0,
  fecha_creacion      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  fecha_actualizacion TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS actas_obra_idx    ON actas (obra_id, numero_acta);
CREATE INDEX IF NOT EXISTS actas_cliente_idx ON actas (cliente_id);
CREATE INDEX IF NOT EXISTS actas_fecha_idx   ON actas (fecha DESC);

-- Auditoría de operaciones críticas
CREATE TABLE IF NOT EXISTS auditoria (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    TEXT,
  usuario_email TEXT,
  accion        TEXT NOT NULL,   -- p.ej. entrar, registro, crear, actualizar, eliminar, aprobar
  entidad       TEXT,            -- usuario | cliente | obra | acta
  entidad_id    TEXT,
  detalle       TEXT,
  fecha         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS auditoria_fecha_idx ON auditoria (fecha DESC);
