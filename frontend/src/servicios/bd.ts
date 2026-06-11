// Acceso a datos a través de la API privada (Worker + D1) con caché en
// memoria: las páginas leen en síncrono y las mutaciones escriben primero
// en el servidor y después actualizan la caché.

import { useSyncExternalStore } from "react";
import type { Acta, Configuracion, EstadoActa, Obra } from "../tipos";
import { apiFetch } from "./api";
import { refrescarPerfil, usarAuth } from "./autenticacion";

const CLAVE_CONFIG = "acb_actas_config_v1";

interface ClienteApi {
  id: string;
  nombre: string;
  activo: number;
}

interface Cache {
  obras: Obra[];
  actas: Acta[];
  clientes: ClienteApi[];
  obraPreferenteId?: string;
}

let cache: Cache = { obras: [], actas: [], clientes: [] };
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

interface ObraApi {
  id: string;
  codigo: string;
  nombre: string;
  cliente: string;
}

interface ListaPaginada<T> {
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
}

async function cargarActasCompletas(): Promise<Acta[]> {
  const todas: Acta[] = [];
  let pagina = 1;
  for (;;) {
    const lote = await apiFetch<ListaPaginada<Acta>>(`/api/actas?pagina=${pagina}&limite=200`);
    todas.push(...lote.datos);
    if (todas.length >= lote.total || lote.datos.length === 0) break;
    pagina++;
  }
  return todas;
}

// --- Carga inicial (tras iniciar sesión con usuario aprobado) ---

export async function cargarBD(perfilObraPreferente?: string) {
  if (estado === "cargando") return;
  estado = "cargando";
  notificar();
  try {
    const [obras, clientes, actas] = await Promise.all([
      apiFetch<ObraApi[]>("/api/obras"),
      apiFetch<ListaPaginada<ClienteApi>>("/api/clientes?limite=200"),
      cargarActasCompletas(),
    ]);
    cache = {
      obras: obras.map((o) => ({ id: o.id, codigo: o.codigo, nombre: o.nombre, cliente: o.cliente })),
      clientes: clientes.datos,
      actas,
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
  const fila = await apiFetch<ObraApi>("/api/obras", {
    method: "POST",
    body: JSON.stringify({ codigo: datos.codigo, nombre: datos.nombre, cliente: datos.cliente }),
  });
  const obra: Obra = { id: fila.id, codigo: fila.codigo, nombre: fila.nombre, cliente: fila.cliente };
  cache.obras.push(obra);
  await recargarClientes();
  notificar();
  return obra;
}

export async function actualizarObra(obra: Obra) {
  await apiFetch(`/api/obras/${obra.id}`, {
    method: "PUT",
    body: JSON.stringify({ codigo: obra.codigo, nombre: obra.nombre, cliente: obra.cliente }),
  });
  const i = cache.obras.findIndex((o) => o.id === obra.id);
  if (i >= 0) cache.obras[i] = obra;
  await recargarClientes();
  notificar();
}

/** Elimina la obra Y TODAS sus actas (cascada en el servidor) */
export async function eliminarObra(id: string) {
  await apiFetch(`/api/obras/${id}`, { method: "DELETE" });
  cache.obras = cache.obras.filter((o) => o.id !== id);
  cache.actas = cache.actas.filter((a) => a.obraId !== id);
  if (cache.obraPreferenteId === id) cache.obraPreferenteId = undefined;
  notificar();
}

export async function ponerObraPreferente(id: string | undefined) {
  await apiFetch("/api/auth/obra-preferente", {
    method: "PUT",
    body: JSON.stringify({ obraId: id ?? null }),
  });
  cache.obraPreferenteId = id;
  notificar();
  void refrescarPerfil();
}

export function obtenerObraPreferenteId(): string | undefined {
  return cache.obraPreferenteId;
}

// --- Clientes ---

async function recargarClientes() {
  const lote = await apiFetch<ListaPaginada<ClienteApi>>("/api/clientes?limite=200");
  cache.clientes = lote.datos;
}

export function listarClientes(): string[] {
  return cache.clientes
    .filter((c) => c.activo)
    .map((c) => c.nombre)
    .sort();
}

export async function renombrarCliente(antiguo: string, nuevo: string) {
  const cliente = cache.clientes.find((c) => c.nombre === antiguo);
  if (!cliente) throw new Error("Cliente no encontrado.");
  await apiFetch(`/api/clientes/${cliente.id}`, {
    method: "PUT",
    body: JSON.stringify({ nombre: nuevo.trim() }),
  });
  cliente.nombre = nuevo.trim();
  cache.obras.forEach((o) => {
    if (o.cliente === antiguo) o.cliente = nuevo.trim();
  });
  notificar();
}

/** Desactiva el cliente; sus obras pasan a "Sin cliente" (en servidor y caché) */
export async function eliminarCliente(nombre: string) {
  const cliente = cache.clientes.find((c) => c.nombre === nombre);
  if (!cliente) throw new Error("Cliente no encontrado.");
  await apiFetch(`/api/clientes/${cliente.id}`, { method: "DELETE" });
  cache.obras.forEach((o) => {
    if (o.cliente === nombre) o.cliente = "Sin cliente";
  });
  await recargarClientes();
  notificar();
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

function cuerpoActa(acta: Acta) {
  return {
    obraId: acta.obraId,
    fecha: acta.fecha,
    objeto: acta.objeto,
    lugar: acta.lugar,
    asistentes: acta.asistentes,
    asuntos: acta.asuntos,
    proximaReunion: acta.proximaReunion,
    textoOriginal: acta.textoOriginal,
    origen: acta.origen,
  };
}

export async function guardarActa(acta: Acta): Promise<Acta> {
  const existe = cache.actas.some((a) => a.id === acta.id);
  if (existe) {
    await apiFetch(`/api/actas/${acta.id}`, {
      method: "PUT",
      body: JSON.stringify(cuerpoActa(acta)),
    });
    const i = cache.actas.findIndex((a) => a.id === acta.id);
    cache.actas[i] = acta;
    notificar();
    return acta;
  }
  // Alta: el servidor asigna id, número correlativo, estado y autor
  const guardada = await apiFetch<Acta>("/api/actas", {
    method: "POST",
    body: JSON.stringify(cuerpoActa(acta)),
  });
  cache.actas.push(guardada);
  notificar();
  return guardada;
}

export async function cambiarEstadoActa(id: string, estadoNuevo: EstadoActa) {
  await apiFetch(`/api/actas/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado: estadoNuevo }),
  });
  const acta = cache.actas.find((a) => a.id === id);
  if (acta) acta.estado = estadoNuevo;
  notificar();
}

/** Eliminación lógica en el servidor */
export async function eliminarActa(id: string) {
  await apiFetch(`/api/actas/${id}`, { method: "DELETE" });
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
