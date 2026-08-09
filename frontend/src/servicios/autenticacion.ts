// Autenticación contra la API privada (Worker + D1).
// Flujo igual que ACB_PORTALOBRA: registro público → pendiente de
// aprobación → el admin aprueba. El email del administrador designado
// (y el primer usuario) entra como admin directamente.

import { useSyncExternalStore } from "react";
import { apiFetch, borrarToken, guardarToken, obtenerToken } from "./api";
import { extraerTokenPortalObra } from "./portalobra";

export interface Perfil {
  id: string;
  email: string;
  nombre: string;
  esAdmin: boolean;
  aprobado: boolean;
  obraPreferenteId?: string;
}

interface EstadoAuth {
  cargado: boolean;
  perfil: Perfil | null;
  /** Error del acceso único con Portal Obra, para mostrarlo en la pantalla de acceso */
  errorPortalObra?: string;
}

let estado: EstadoAuth = { cargado: false, perfil: null };
let version = 0;
const oyentes = new Set<() => void>();

function notificar() {
  version++;
  oyentes.forEach((fn) => fn());
}

export function suscribirAuth(fn: () => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function usarAuth(): EstadoAuth {
  useSyncExternalStore(suscribirAuth, () => version);
  return estado;
}

async function cargarPerfil(): Promise<void> {
  if (!obtenerToken()) {
    estado = { cargado: true, perfil: null };
    notificar();
    return;
  }
  try {
    const perfil = await apiFetch<Perfil>("/api/auth/yo");
    estado = { cargado: true, perfil };
  } catch {
    // Token caducado o revocado
    borrarToken();
    estado = { cargado: true, perfil: null };
  }
  notificar();
}

let iniciado = false;
export function iniciarAuth() {
  if (iniciado) return;
  iniciado = true;

  // Llegada desde ACB Portal Obra con su token en la URL: se canjea por una
  // sesión de esta app. Si falla, se sigue con la sesión local de siempre.
  const tokenPortalObra = extraerTokenPortalObra();
  if (tokenPortalObra) {
    void entrarConPortalObra(tokenPortalObra).catch(async (err) => {
      await cargarPerfil();
      estado = { ...estado, errorPortalObra: (err as Error).message };
      notificar();
    });
    return;
  }

  void cargarPerfil();
}

/** Canjea un token de ACB Portal Obra por una sesión de ACB Actas (acceso único). */
export async function entrarConPortalObra(token: string) {
  const datos = await apiFetch<{ token: string; usuario: Perfil }>("/api/auth/portalobra", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  guardarToken(datos.token);
  estado = { cargado: true, perfil: datos.usuario };
  notificar();
}

export async function entrar(email: string, contrasena: string) {
  const datos = await apiFetch<{ token: string; usuario: Perfil }>("/api/auth/entrar", {
    method: "POST",
    body: JSON.stringify({ email, contrasena }),
  });
  guardarToken(datos.token);
  estado = { cargado: true, perfil: datos.usuario };
  notificar();
}

export async function registrar(email: string, contrasena: string, nombre: string) {
  const datos = await apiFetch<{ token: string; usuario: Perfil }>("/api/auth/registro", {
    method: "POST",
    body: JSON.stringify({ email, contrasena, nombre }),
  });
  guardarToken(datos.token);
  estado = { cargado: true, perfil: datos.usuario };
  notificar();
}

export async function salir() {
  borrarToken();
  estado = { cargado: true, perfil: null };
  notificar();
}

export function refrescarPerfil() {
  return cargarPerfil();
}

export async function cambiarContrasena(actual: string, nueva: string) {
  await apiFetch("/api/auth/cambiar-contrasena", {
    method: "POST",
    body: JSON.stringify({ actual, nueva }),
  });
}

// --- Administración de usuarios (solo admin; autorización en el Worker) ---

export async function listarPerfiles(): Promise<Perfil[]> {
  return apiFetch<Perfil[]>("/api/usuarios");
}

export async function aprobarUsuario(id: string, aprobado: boolean) {
  await apiFetch(`/api/usuarios/${id}`, { method: "PUT", body: JSON.stringify({ aprobado }) });
}

export async function hacerAdmin(id: string, esAdmin: boolean) {
  await apiFetch(`/api/usuarios/${id}`, { method: "PUT", body: JSON.stringify({ esAdmin }) });
}

export async function eliminarUsuario(id: string) {
  await apiFetch(`/api/usuarios/${id}`, { method: "DELETE" });
}
