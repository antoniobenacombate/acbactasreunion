// Base de datos local: persiste en localStorage del navegador.
// Sencilla y sin dependencias: suficiente para uso personal/equipo pequeño.

import type { Acta, Configuracion, Obra } from "../tipos";
import { ACTAS_SEMILLA, OBRAS_SEMILLA } from "../datos/semilla";

const CLAVE_BD = "acb_actas_bd_v1";
const CLAVE_CONFIG = "acb_actas_config_v1";

interface BD {
  obras: Obra[];
  actas: Acta[];
  /** Obra seleccionada por defecto al crear actas nuevas */
  obraPreferenteId?: string;
}

let cache: BD | null = null;
const oyentes = new Set<() => void>();

function cargar(): BD {
  if (cache) return cache;
  const crudo = localStorage.getItem(CLAVE_BD);
  if (crudo) {
    cache = JSON.parse(crudo) as BD;
  } else {
    // Primera ejecución: cargamos los ejemplos
    cache = { obras: OBRAS_SEMILLA, actas: ACTAS_SEMILLA };
    persistir();
  }
  return cache;
}

function persistir() {
  if (cache) localStorage.setItem(CLAVE_BD, JSON.stringify(cache));
  oyentes.forEach((fn) => fn());
}

export function suscribir(fn: () => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

// --- Obras ---

export function listarObras(): Obra[] {
  return [...cargar().obras];
}

export function obtenerObra(id: string): Obra | undefined {
  return cargar().obras.find((o) => o.id === id);
}

export function crearObra(datos: Omit<Obra, "id">): Obra {
  const obra: Obra = { ...datos, id: `obra-${Date.now()}` };
  cargar().obras.push(obra);
  persistir();
  return obra;
}

export function actualizarObra(obra: Obra) {
  const bd = cargar();
  const i = bd.obras.findIndex((o) => o.id === obra.id);
  if (i >= 0) {
    bd.obras[i] = obra;
    persistir();
  }
}

/** Elimina la obra Y TODAS sus actas asociadas */
export function eliminarObra(id: string) {
  const bd = cargar();
  bd.obras = bd.obras.filter((o) => o.id !== id);
  bd.actas = bd.actas.filter((a) => a.obraId !== id);
  if (bd.obraPreferenteId === id) bd.obraPreferenteId = undefined;
  persistir();
}

export function ponerObraPreferente(id: string | undefined) {
  cargar().obraPreferenteId = id;
  persistir();
}

export function obtenerObraPreferenteId(): string | undefined {
  return cargar().obraPreferenteId;
}

// --- Clientes (derivados de las obras) ---

export function listarClientes(): string[] {
  return [...new Set(cargar().obras.map((o) => o.cliente))].sort();
}

/** Renombra un cliente en todas las obras que lo tienen */
export function renombrarCliente(antiguo: string, nuevo: string) {
  const bd = cargar();
  bd.obras.forEach((o) => {
    if (o.cliente === antiguo) o.cliente = nuevo.trim();
  });
  persistir();
}

/** Elimina un cliente: sus obras pasan a "Sin cliente" */
export function eliminarCliente(nombre: string) {
  const bd = cargar();
  bd.obras.forEach((o) => {
    if (o.cliente === nombre) o.cliente = "Sin cliente";
  });
  persistir();
}

// --- Actas ---

export function listarActas(): Acta[] {
  return [...cargar().actas].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function obtenerActa(id: string): Acta | undefined {
  return cargar().actas.find((a) => a.id === id);
}

export function siguienteNumero(obraId: string): number {
  const nums = cargar()
    .actas.filter((a) => a.obraId === obraId)
    .map((a) => a.numero);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

export function guardarActa(acta: Acta) {
  const bd = cargar();
  const i = bd.actas.findIndex((a) => a.id === acta.id);
  if (i >= 0) bd.actas[i] = acta;
  else bd.actas.push(acta);
  persistir();
}

export function eliminarActa(id: string) {
  const bd = cargar();
  bd.actas = bd.actas.filter((a) => a.id !== id);
  persistir();
}

export function restablecerEjemplos() {
  cache = { obras: OBRAS_SEMILLA, actas: ACTAS_SEMILLA };
  persistir();
}

// --- Configuración ---

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
