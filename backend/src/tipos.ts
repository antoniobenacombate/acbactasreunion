export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  CORS_ORIGIN: string;
}

export interface CargaJwt {
  sub: string; // id de usuario
  email: string;
  iat: number;
  exp: number;
}

export interface UsuarioBD {
  id: string;
  email: string;
  nombre: string;
  password_hash: string;
  es_admin: number;
  aprobado: number;
  obra_preferente_id: string | null;
}

export type Variables = {
  usuario: UsuarioBD;
};
