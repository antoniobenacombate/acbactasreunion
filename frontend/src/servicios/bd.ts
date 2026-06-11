// Base de datos en Supabase con caché en memoria.
// Las páginas leen en síncrono desde la caché (useSyncExternalStore) y las
// mutaciones escriben primero en Supabase y luego actualizan la caché.

import { useSyncExternalStore } from "react";
import type { Acta, Configuracion, Obra } from "../tipos";
import { supabase } from "./supabase";
import { refrescarPerfil, usarAuth } from "./autenticacion";

const CLAVE_CONFIG = "acb_actas_config_v1";

interface Cache {
  obras: Obra[];
  actas: Acta[];
  obraPreferenteId?: string;
}

let cache: Cache = { obras: [], actas: [] };
let estado: "inactivo" | "cargando" | "listo" | "error" = "inactivo";
let mensajeError = "";
let version = 0;
const oyentes = new Set<() => void>();

function notificar() {
  version++;
  oyentes.forEach((fn) => fn());
}

export function suscribir(fn: () => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** Hook de las páginas: re-renderiza cuando cambian los datos */
export function usarBD() {
  useSyncExternalStore(suscribir, () => version);
  return { estado, mensajeError };
}

// --- Mapeo filas Supabase <-> modelo de la app ---

function mapearActa(f: Record<string, unknown>): Acta {
  return {
    id: f.id as string,
    numero: f.numero as number,
    obraId: f.obra_id as string,
    fecha: f.fecha as string,
    lugar: (f.lugar as string) ?? "",
    objeto: (f.objeto as string) ?? "",
    asistentes: (f.asistentes as Acta["asistentes"]) ?? [],
    asuntos: (f.asuntos as Acta["asuntos"]) ?? [],
    proximaReunion: (f.proxima_reunion as string) ?? undefined,
    origen: (f.origen as Acta["origen"]) ?? "manual",
    textoOriginal: (f.texto_original as string) ?? undefined,
    creadoEl: f.creado_el as string,
  };
}

function filaActa(a: Acta) {
  return {
    id: a.id || undefined,
    obra_id: a.obraId,
    numero: a.numero,
    fecha: a.fecha,
    lugar: a.lugar,
    objeto: a.objeto,
    asistentes: a.asistentes,
    asuntos: a.asuntos,
    proxima_reunion: a.proximaReunion ?? null,
    origen: a.origen,
    texto_original: a.textoOriginal ?? null,
  };
}

function mapearObra(f: Record<string, unknown>): Obra {
  return {
    id: f.id as string,
    codigo: f.codigo as string,
    nombre: f.nombre as string,
    cliente: (f.cliente as string) ?? "Sin cliente",
  };
}

// --- Carga inicial (tras iniciar sesión con usuario aprobado) ---

export async function cargarBD(perfilObraPreferente?: string) {
  if (estado === "cargando") return;
  estado = "cargando";
  notificar();
  try {
    const [obras, actas] = await Promise.all([
      supabase.from("obras").select("*").order("creado_el"),
      supabase.from("actas").select("*").order("fecha", { ascending: false }),
    ]);
    if (obras.error) throw new Error(obras.error.message);
    if (actas.error) throw new Error(actas.error.message);
    cache = {
      obras: (obras.data ?? []).map(mapearObra),
      actas: (actas.data ?? []).map(mapearActa),
      obraPreferenteId: perfilObraPreferente,
    };
    estado = "listo";
  } catch (e) {
    estado = "error";
    mensajeError = (e as Error).message;
  }
  notificar();
}

export function estadoBD() {
  return estado;
}

// --- Obras ---

export function listarObras(): Obra[] {
  return [...cache.obras];
}

export function obtenerObra(id: string): Obra | undefined {
  return cache.obras.find((o) => o.id === id);
}

export async function crearObra(datos: Omit<Obra, "id">): Promise<Obra> {
  const { data, error } = await supabase
    .from("obras")
    .insert({ codigo: datos.codigo, nombre: datos.nombre, cliente: datos.cliente })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const obra = mapearObra(data);
  cache.obras.push(obra);
  notificar();
  return obra;
}

export async function actualizarObra(obra: Obra) {
  const { error } = await supabase
    .from("obras")
    .update({ codigo: obra.codigo, nombre: obra.nombre, cliente: obra.cliente })
    .eq("id", obra.id);
  if (error) throw new Error(error.message);
  const i = cache.obras.findIndex((o) => o.id === obra.id);
  if (i >= 0) cache.obras[i] = obra;
  notificar();
}

/** Elimina la obra Y TODAS sus actas (cascada en la base de datos) */
export async function eliminarObra(id: string) {
  const { error } = await supabase.from("obras").delete().eq("id", id);
  if (error) throw new Error(error.message);
  cache.obras = cache.obras.filter((o) => o.id !== id);
  cache.actas = cache.actas.filter((a) => a.obraId !== id);
  if (cache.obraPreferenteId === id) cache.obraPreferenteId = undefined;
  notificar();
}

export async function ponerObraPreferente(id: string | undefined) {
  const { data: sesion } = await supabase.auth.getSession();
  const usuario = sesion.session?.user.id;
  if (!usuario) return;
  const { error } = await supabase
    .from("perfiles")
    .update({ obra_preferente_id: id ?? null })
    .eq("id", usuario);
  if (error) throw new Error(error.message);
  cache.obraPreferenteId = id;
  notificar();
  void refrescarPerfil();
}

export function obtenerObraPreferenteId(): string | undefined {
  return cache.obraPreferenteId;
}

// --- Clientes (derivados de las obras) ---

export function listarClientes(): string[] {
  return [...new Set(cache.obras.map((o) => o.cliente))].sort();
}

export async function renombrarCliente(antiguo: string, nuevo: string) {
  const { error } = await supabase
    .from("obras")
    .update({ cliente: nuevo.trim() })
    .eq("cliente", antiguo);
  if (error) throw new Error(error.message);
  cache.obras.forEach((o) => {
    if (o.cliente === antiguo) o.cliente = nuevo.trim();
  });
  notificar();
}

export async function eliminarCliente(nombre: string) {
  await renombrarCliente(nombre, "Sin cliente");
}

// --- Actas ---

export function listarActas(): Acta[] {
  return [...cache.actas].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function obtenerActa(id: string): Acta | undefined {
  return cache.actas.find((a) => a.id === id);
}

export function siguienteNumero(obraId: string): number {
  const nums = cache.actas.filter((a) => a.obraId === obraId).map((a) => a.numero);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

export async function guardarActa(acta: Acta): Promise<Acta> {
  const existe = cache.actas.some((a) => a.id === acta.id);
  if (existe) {
    const { error } = await supabase.from("actas").update(filaActa(acta)).eq("id", acta.id);
    if (error) throw new Error(error.message);
    const i = cache.actas.findIndex((a) => a.id === acta.id);
    cache.actas[i] = acta;
    notificar();
    return acta;
  }
  // Alta: deja que la BD genere el id
  const fila = filaActa(acta);
  delete (fila as Record<string, unknown>).id;
  const { data, error } = await supabase.from("actas").insert(fila).select().single();
  if (error) throw new Error(error.message);
  const guardada = mapearActa(data);
  cache.actas.push(guardada);
  notificar();
  return guardada;
}

export async function eliminarActa(id: string) {
  const { error } = await supabase.from("actas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  cache.actas = cache.actas.filter((a) => a.id !== id);
  notificar();
}

// --- Configuración local del dispositivo (clave API, datos por defecto) ---

export function obtenerConfig(): Configuracion {
  const crudo = localStorage.getItem(CLAVE_CONFIG);
  if (crudo) return JSON.parse(crudo) as Configuracion;
  return {
    claveApiClaude: "",
    nombreAT: "Antonio Benavides",
    empresaAT: "U.T.E. Ing63 Grusamar Cainur",
  };
}

export function guardarConfig(config: Configuracion) {
  localStorage.setItem(CLAVE_CONFIG, JSON.stringify(config));
}

export { usarAuth };
