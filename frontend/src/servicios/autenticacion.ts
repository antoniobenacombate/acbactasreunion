// Autenticación y perfiles. Flujo igual que ACB_PORTALOBRA:
// registro público → pendiente de aprobación → el admin aprueba.
// El primer usuario registrado es admin automáticamente (trigger en BD).

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

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

function mapearPerfil(fila: Record<string, unknown>): Perfil {
  return {
    id: fila.id as string,
    email: fila.email as string,
    nombre: (fila.nombre as string) ?? "",
    esAdmin: !!fila.es_admin,
    aprobado: !!fila.aprobado,
    obraPreferenteId: (fila.obra_preferente_id as string) ?? undefined,
  };
}

async function cargarPerfil(): Promise<void> {
  const { data: datosSesion } = await supabase.auth.getSession();
  if (!datosSesion.session) {
    estado = { cargado: true, perfil: null };
    notificar();
    return;
  }
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", datosSesion.session.user.id)
    .single();
  estado = { cargado: true, perfil: error || !data ? null : mapearPerfil(data) };
  notificar();
}

let iniciado = false;
export function iniciarAuth() {
  if (iniciado) return;
  iniciado = true;
  void cargarPerfil();
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_IN" || evento === "SIGNED_OUT" || evento === "USER_UPDATED") {
      void cargarPerfil();
    }
  });
}

export async function entrar(email: string, contrasena: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
  if (error) throw new Error(traducirError(error.message));
  await cargarPerfil();
}

export async function registrar(email: string, contrasena: string, nombre: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password: contrasena,
    options: { data: { nombre } },
  });
  if (error) throw new Error(traducirError(error.message));
  // El email se autoconfirma por trigger: entramos directamente
  await entrar(email, contrasena);
}

export async function salir() {
  await supabase.auth.signOut();
  estado = { cargado: true, perfil: null };
  notificar();
}

export function refrescarPerfil() {
  return cargarPerfil();
}

// --- Administración de usuarios (solo admin, protegido por RLS) ---

export async function listarPerfiles(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .order("creado_el", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapearPerfil);
}

export async function aprobarUsuario(id: string, aprobado: boolean) {
  const { error } = await supabase.from("perfiles").update({ aprobado }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hacerAdmin(id: string, esAdmin: boolean) {
  const { error } = await supabase.from("perfiles").update({ es_admin: esAdmin }).eq("id", id);
  if (error) throw new Error(error.message);
}

function traducirError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos.";
  if (/already registered/i.test(msg)) return "Ese email ya está registrado.";
  if (/at least 6 characters/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/valid email/i.test(msg)) return "El email no es válido.";
  return msg;
}
