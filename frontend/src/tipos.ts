// Tipos de datos de la aplicación

export type Organizacion = "DO" | "CON" | "AT" | "OTRO";

export interface Asistente {
  nombre: string;
  cargo: string;
  organizacion: Organizacion;
}

export interface Asunto {
  titulo: string;
  desarrollo: string;
  /** Siglas de quien debe ejecutar la acción: DO, CON, AT... */
  accionPor: string[];
}

export type OrigenActa = "manuscrito" | "transcripcion" | "audio" | "nota" | "manual";

export type EstadoActa = "borrador" | "emitida" | "aprobada";

export const ETIQUETA_ESTADO: Record<EstadoActa, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  aprobada: "Aprobada",
};

export interface Acta {
  id: string;
  /** Número de acta dentro de la obra (AR01, AR02...) */
  numero: number;
  obraId: string;
  /** Fecha de la reunión en ISO (aaaa-mm-dd) */
  fecha: string;
  lugar: string;
  objeto: string;
  asistentes: Asistente[];
  asuntos: Asunto[];
  proximaReunion?: string;
  origen: OrigenActa;
  /** Estado del acta en su ciclo de vida */
  estado?: EstadoActa;
  /** Autor (asignado por el servidor al crear) */
  autor?: string;
  /** Texto original volcado (transcripción o nota) */
  textoOriginal?: string;
  creadoEl: string;
}

export interface Obra {
  id: string;
  codigo: string;
  nombre: string;
  cliente: string;
}

export interface Configuracion {
  claveApiClaude: string;
  claveApiOcrSpace: string;
  nombreAT: string;
  empresaAT: string;
}

export const ETIQUETA_ORGANIZACION: Record<Organizacion, string> = {
  DO: "Dirección de Obra",
  CON: "Contratista",
  AT: "Asistencia Técnica",
  OTRO: "Otros",
};

export const ETIQUETA_ORIGEN: Record<OrigenActa, string> = {
  manuscrito: "Notas a mano",
  transcripcion: "Transcripción",
  audio: "Audio",
  nota: "Nota suelta",
  manual: "Manual",
};

/** Formatea fecha ISO a dd-mm-aaaa (formato España) */
export function formatearFecha(iso: string): string {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}-${m}-${a}`;
}

/** Formatea fecha ISO a aammdd para nombres de archivo */
export function fechaAAMMDD(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${a.slice(2)}${m}${d}`;
}

/** Fecha de hoy en ISO, zona horaria de Madrid */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
}
