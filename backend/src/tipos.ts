export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  CORS_ORIGIN: string;
  /** API del Worker de ACB Portal Obra (acceso único). Vacía = integración desactivada. */
  PORTALOBRA_API?: string;
}

/** Perfil que devuelve `GET /api/auth/me` del Worker de ACB Portal Obra */
export interface PerfilPortalObra {
  id?: string;
  email?: string;
  full_name?: string;
  is_admin?: boolean;
  is_approved?: boolean;
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
