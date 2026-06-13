// Generador de actas a partir de transcripciones, audios transcritos o notas.
// Dos modos:
//   1) IA (API de Claude) si hay clave configurada — resultado de máxima calidad.
//   2) Heurístico local sin conexión — análisis básico del texto.

import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Asistente, Asunto, Organizacion } from "../tipos";
import { hoyISO } from "../tipos";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const MAX_PAGINAS_PDF = 20;

export interface BorradorActa {
  fecha: string;
  lugar: string;
  objeto: string;
  asistentes: Asistente[];
  asuntos: Asunto[];
  proximaReunion?: string;
  generadoCon: "ia" | "heuristico";
}

export interface Adjunto {
  tipo: "imagen" | "pdf";
  mediaType: string;
  datosBase64: string;
}

/** Mantiene compatibilidad: una imagen es un adjunto de tipo imagen */
export type ImagenEntrada = Adjunto;

/**
 * Convierte cada página de un PDF a JPEG y la devuelve como adjunto de imagen.
 * Permite que Claude vea el contenido visual (manuscritos, croquis, escaneados)
 * igual que cuando el usuario sube fotos directamente.
 */
export async function prepararPdfComoImagenes(
  archivo: File,
): Promise<{ adjuntos: Adjunto[]; paginasTotales: number }> {
  const MAX = 2000;
  const buffer = await archivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const paginasTotales = pdf.numPages;
  const numPaginas = Math.min(paginasTotales, MAX_PAGINAS_PDF);

  const adjuntos: Adjunto[] = [];
  for (let i = 1; i <= numPaginas; i++) {
    const pagina = await pdf.getPage(i);
    const vpBase = pagina.getViewport({ scale: 1 });
    const escala = Math.min(1, MAX / Math.max(vpBase.width, vpBase.height));
    const vp = pagina.getViewport({ scale: escala });
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(vp.width);
    lienzo.height = Math.round(vp.height);
    await pagina.render({ canvas: lienzo, viewport: vp }).promise;
    adjuntos.push({
      tipo: "imagen",
      mediaType: "image/jpeg",
      datosBase64: lienzo.toDataURL("image/jpeg", 0.85).split(",")[1],
    });
  }
  return { adjuntos, paginasTotales };
}

/**
 * Prepara una foto de notas manuscritas para enviarla al API:
 * reduce a un máximo de 2000 px de lado largo y comprime a JPEG.
 */
export async function prepararImagen(archivo: File): Promise<ImagenEntrada> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const i = new Image();
      i.onload = () => resolver(i);
      i.onerror = () => rechazar(new Error(`No se pudo leer la imagen ${archivo.name}`));
      i.src = url;
    });
    const MAX = 2000;
    const escala = Math.min(1, MAX / Math.max(img.width, img.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(img.width * escala);
    lienzo.height = Math.round(img.height * escala);
    lienzo.getContext("2d")!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    const dataUrl = lienzo.toDataURL("image/jpeg", 0.85);
    return { tipo: "imagen", mediaType: "image/jpeg", datosBase64: dataUrl.split(",")[1] };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Modo IA: llamada directa al Messages API de Claude desde el navegador
// ---------------------------------------------------------------------------

const ESQUEMA_ACTA = {
  type: "object",
  properties: {
    fecha: { type: "string", description: "Fecha de la reunión en formato aaaa-mm-dd. Si no consta, cadena vacía." },
    lugar: { type: "string", description: "Lugar de la reunión o visita" },
    objeto: { type: "string", description: "Objeto de la reunión, breve (máx. 10 palabras)" },
    asistentes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          cargo: { type: "string" },
          organizacion: { type: "string", enum: ["DO", "CON", "AT", "OTRO"] },
        },
        required: ["nombre", "cargo", "organizacion"],
        additionalProperties: false,
      },
    },
    asuntos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título corto del asunto" },
          desarrollo: { type: "string", description: "Desarrollo del asunto en redacción formal de acta" },
          accionPor: {
            type: "array",
            items: { type: "string", enum: ["DO", "CON", "AT", "OTRO"] },
            description: "Quién debe ejecutar la acción derivada",
          },
        },
        required: ["titulo", "desarrollo", "accionPor"],
        additionalProperties: false,
      },
    },
    proximaReunion: { type: "string", description: "Fecha de la próxima reunión aaaa-mm-dd, o cadena vacía" },
  },
  required: ["fecha", "lugar", "objeto", "asistentes", "asuntos", "proximaReunion"],
  additionalProperties: false,
};

const INSTRUCCIONES_SISTEMA = `Eres asistente técnico de un ingeniero de caminos que redacta actas de reunión de visitas de obra en España.
Recibirás FOTOS DE NOTAS MANUSCRITAS, DOCUMENTOS PDF (notas escaneadas, actas previas, croquis anotados), una transcripción de grabación, una nota de voz transcrita o una nota suelta (o una combinación).
Si hay imágenes o PDF: transcribe la letra manuscrita con cuidado, interpreta abreviaturas habituales de obra (DO, CON, AT, PK, ODT, T-2, etc.), flechas, tachones y listas, y combínalo con el texto adicional si lo hay. Si el PDF tiene varias páginas, intégralas todas en una sola acta.
Tu tarea: extraer y redactar el acta con registro formal técnico de obra civil española.
Reglas:
- Redacta los desarrollos en tercera persona e impersonal ("Se aprueba...", "El contratista presentará...").
- Agrupa el contenido en asuntos diferenciados con título corto.
- Organizaciones: DO = Dirección de Obra, CON = Contratista, AT = Asistencia Técnica a la DO, OTRO = resto.
- En accionPor indica quién debe ejecutar cada acción derivada del asunto.
- No inventes datos que no estén en el texto; deja cadena vacía si no constan.
- Las fechas siempre en formato aaaa-mm-dd.`;

export async function generarConIA(
  texto: string,
  claveApi: string,
  adjuntos: Adjunto[] = [],
): Promise<BorradorActa> {
  // Contenido multimodal: primero las fotos/PDF de notas, después el texto
  const contenido = [
    ...adjuntos.map((a) =>
      a.tipo === "pdf"
        ? {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: a.datosBase64 },
          }
        : {
            type: "image",
            source: { type: "base64", media_type: a.mediaType, data: a.datosBase64 },
          },
    ),
    {
      type: "text",
      text:
        texto.trim() ||
        "Genera el acta a partir de las notas adjuntas (imágenes o PDF).",
    },
  ];

  const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": claveApi,
      "anthropic-version": "2023-06-01",
      // Necesario para llamar al API directamente desde el navegador (CORS)
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system: INSTRUCCIONES_SISTEMA,
      messages: [{ role: "user", content: contenido }],
      output_config: { format: { type: "json_schema", schema: ESQUEMA_ACTA } },
    }),
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const msg = cuerpo?.error?.message ?? `Error HTTP ${respuesta.status}`;
    throw new Error(`API de Claude: ${msg}`);
  }

  const datos = await respuesta.json();
  const bloqueTexto = (datos.content as Array<{ type: string; text?: string }>).find(
    (b) => b.type === "text",
  );
  if (!bloqueTexto?.text) throw new Error("La respuesta del API no contiene texto");

  const acta = JSON.parse(bloqueTexto.text);
  return {
    fecha: acta.fecha || hoyISO(),
    lugar: acta.lugar || "",
    objeto: acta.objeto || "",
    asistentes: acta.asistentes ?? [],
    asuntos: acta.asuntos ?? [],
    proximaReunion: acta.proximaReunion || undefined,
    generadoCon: "ia",
  };
}

// ---------------------------------------------------------------------------
// Modo heurístico: análisis local del texto, sin conexión
// ---------------------------------------------------------------------------

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12",
};

function extraerFecha(texto: string): string {
  // dd-mm-aaaa o dd/mm/aaaa
  const num = texto.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/);
  if (num) {
    const [, d, m, a] = num;
    const anio = a.length === 2 ? `20${a}` : a;
    return `${anio}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // "18 de septiembre de 2025"
  const verbal = texto
    .toLowerCase()
    .match(/\b(\d{1,2})\s+de\s+([a-zñ]+)(?:\s+de\s+(\d{4}))?/);
  if (verbal && MESES[verbal[2]]) {
    const anio = verbal[3] ?? String(new Date().getFullYear());
    return `${anio}-${MESES[verbal[2]]}-${verbal[1].padStart(2, "0")}`;
  }
  return hoyISO();
}

function extraerLugar(texto: string): string {
  const linea = texto
    .split(/\n/)
    .find((l) => /^\s*lugar\s*[:\-]/i.test(l));
  if (linea) return linea.replace(/^\s*lugar\s*[:\-]\s*/i, "").trim();
  // Se permite el punto interior para expresiones tipo "P.K. 537+200"
  const en = texto.match(/\ben\s+(la\s+|las?\s+|el\s+)?(caseta de obra[^,\n]*|oficinas?[^,\n]*|demarcaci[oó]n[^,\n]*)/i);
  return en ? en[0].replace(/^en\s+/i, "").replace(/\.\s*$/, "").trim() : "";
}

function clasificarOrganizacion(texto: string): Organizacion {
  const t = texto.toLowerCase();
  if (/direcci[oó]n de obra|director|demarcaci[oó]n|\bdo\b/.test(t)) return "DO";
  if (/contratista|jefe de obra|constructora|\bcon\b/.test(t)) return "CON";
  if (/asistencia t[eé]cnica|\bat\b|consultor/.test(t)) return "AT";
  return "OTRO";
}

function extraerAsistentes(texto: string): Asistente[] {
  const lineas = texto.split(/\n/);
  const inicio = lineas.findIndex((l) => /asistentes|asisten|presentes/i.test(l));
  if (inicio < 0) return [];
  const resultado: Asistente[] = [];
  for (let i = inicio + 1; i < lineas.length; i++) {
    const l = lineas[i].trim();
    if (!l) break; // bloque terminado
    // Formatos admitidos: "Nombre Apellido (cargo)" o "Nombre Apellido, cargo"
    const m = l.match(/^[-•*]?\s*([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)+)\s*[\(,–-]\s*([^)\n]*)\)?/);
    if (m) {
      const cargo = m[2].trim();
      resultado.push({
        nombre: m[1].trim(),
        cargo,
        organizacion: clasificarOrganizacion(cargo + " " + l),
      });
    }
  }
  return resultado;
}

function extraerAcciones(texto: string): string[] {
  const acciones = new Set<string>();
  const t = texto.toLowerCase();
  if (/contratista (deber[aá]|presentar[aá]|entregar[aá]|ejecutar[aá]|incorporar[aá]|solicitar[aá])/.test(t)) acciones.add("CON");
  if (/(direcci[oó]n de obra|la do) (deber[aá]|comunicar[aá]|aprobar[aá]|emitir[aá]|realizar[aá])/.test(t)) acciones.add("DO");
  if (/(asistencia t[eé]cnica|la at) (deber[aá]|preparar[aá]|entregar[aá]|realizar[aá]|emitir[aá]|valorar[aá])/.test(t)) acciones.add("AT");
  return [...acciones];
}

export function generarHeuristico(texto: string): BorradorActa {
  const fecha = extraerFecha(texto);
  const lugar = extraerLugar(texto);
  const asistentes = extraerAsistentes(texto);

  // Asuntos: bloques de texto separados por línea en blanco,
  // descartando los bloques de cabecera (fecha, lugar, asistentes)
  const bloques = texto
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(
      (b) =>
        b.length > 60 &&
        !/^(lugar|fecha|asistentes|asisten|presentes|objeto|visita de obra|reuni[oó]n)/i.test(b) &&
        !/^\s*objeto\s*:/im.test(b),
    );

  const asuntos: Asunto[] = bloques.map((bloque) => {
    const primeraFrase = bloque.split(/[.\n]/)[0].trim();
    const titulo =
      primeraFrase.length > 70 ? `${primeraFrase.slice(0, 67)}...` : primeraFrase;
    return { titulo, desarrollo: bloque, accionPor: extraerAcciones(bloque) };
  });

  const lineaObjeto = texto.split(/\n/).find((l) => /^\s*objeto\s*[:\-]/i.test(l));
  const objeto = lineaObjeto
    ? lineaObjeto.replace(/^\s*objeto\s*[:\-]\s*/i, "").trim()
    : asuntos[0]?.titulo ?? "Visita de obra";

  return { fecha, lugar, objeto, asistentes, asuntos, generadoCon: "heuristico" };
}

// Punto de entrada único.
// - Con imágenes (notas manuscritas): requiere IA; el heurístico no puede leerlas.
// - Solo texto: IA si hay clave, con caída automática al heurístico.
export async function generarActa(
  texto: string,
  claveApi: string,
  adjuntos: Adjunto[] = [],
): Promise<{ borrador?: BorradorActa; aviso?: string }> {
  const clave = claveApi.trim();

  if (adjuntos.length > 0) {
    if (!clave) {
      return {
        aviso:
          "Para leer fotos o PDF de notas hace falta la clave de API de Claude. Configúrala en Configuración (o pasa las notas a texto).",
      };
    }
    try {
      return { borrador: await generarConIA(texto, clave, adjuntos) };
    } catch (e) {
      return { aviso: `No se pudieron procesar los adjuntos (${(e as Error).message}).` };
    }
  }

  if (clave) {
    try {
      return { borrador: await generarConIA(texto, clave) };
    } catch (e) {
      return {
        borrador: generarHeuristico(texto),
        aviso: `No se pudo usar la IA (${(e as Error).message}). Se ha generado con el modo básico.`,
      };
    }
  }
  return {
    borrador: generarHeuristico(texto),
    aviso: "Sin clave de API configurada: acta generada con el modo básico. Configura la clave en Configuración para mejor calidad.",
  };
}
