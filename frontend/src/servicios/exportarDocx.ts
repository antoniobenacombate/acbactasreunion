// Exportación del acta a Word (.docx) siguiendo la plantilla
// "AAMMDD AR01 MODELO ACTA REUNION-E0g.docx" de samples\

import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  Footer,
} from "docx";
import type { Acta, Obra } from "../tipos";
import { ETIQUETA_ORGANIZACION, fechaAAMMDD, formatearFecha } from "../tipos";

const ANCHO_CONTENIDO = 9026; // A4 con márgenes de 1" (DXA)
const FUENTE = "Arial";

const bordeFino = { style: BorderStyle.SINGLE, size: 4, color: "404040" };
const bordes = { top: bordeFino, bottom: bordeFino, left: bordeFino, right: bordeFino };
const margenesCelda = { top: 80, bottom: 80, left: 120, right: 120 };

function txt(texto: string, opciones: { negrita?: boolean; tamano?: number } = {}) {
  return new TextRun({
    text: texto,
    font: FUENTE,
    bold: opciones.negrita ?? false,
    size: opciones.tamano ?? 20, // 10 pt
  });
}

function parrafo(texto: string, opciones: { negrita?: boolean; tamano?: number; centrado?: boolean } = {}) {
  return new Paragraph({
    alignment: opciones.centrado ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [txt(texto, opciones)],
  });
}

async function cargarLogo(ruta: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(ruta);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

function celda(
  contenido: Paragraph[],
  opciones: { ancho: number; span?: number; sombreado?: boolean } = { ancho: 3000 },
) {
  return new TableCell({
    borders: bordes,
    width: { size: opciones.ancho, type: WidthType.DXA },
    columnSpan: opciones.span,
    margins: margenesCelda,
    verticalAlign: VerticalAlign.TOP,
    shading: opciones.sombreado
      ? { fill: "E8EDF7", type: ShadingType.CLEAR }
      : undefined,
    children: contenido,
  });
}

export async function exportarActaDocx(acta: Acta, obra: Obra) {
  // BASE_URL hace que funcione tanto en local como desplegado bajo subruta
  const [logoMinisterio, logoEmpresa] = await Promise.all([
    cargarLogo(`${import.meta.env.BASE_URL}image1.png`),
    cargarLogo(`${import.meta.env.BASE_URL}image2.png`),
  ]);

  // --- Cabecera: logos + obra + ACTA DE REUNIÓN ---
  const celdasCabecera: TableCell[] = [
    new TableCell({
      borders: bordes,
      width: { size: 2400, type: WidthType.DXA },
      margins: margenesCelda,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        logoMinisterio
          ? new Paragraph({
              children: [
                new ImageRun({
                  type: "png",
                  data: logoMinisterio,
                  transformation: { width: 140, height: 42 },
                  altText: { title: "Logo", description: "Logotipo cliente", name: "logo1" },
                }),
              ],
            })
          : parrafo(obra.cliente, { tamano: 14 }),
      ],
    }),
    new TableCell({
      borders: bordes,
      width: { size: 4226, type: WidthType.DXA },
      margins: margenesCelda,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        parrafo(`OBRAS: ${obra.nombre.toUpperCase()}`, { negrita: true, tamano: 16, centrado: true }),
        parrafo(obra.cliente.toUpperCase(), { tamano: 14, centrado: true }),
      ],
    }),
    new TableCell({
      borders: bordes,
      width: { size: 2400, type: WidthType.DXA },
      margins: margenesCelda,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        logoEmpresa
          ? new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new ImageRun({
                  type: "png",
                  data: logoEmpresa,
                  transformation: { width: 140, height: 32 },
                  altText: { title: "Logo", description: "Logotipo AT", name: "logo2" },
                }),
              ],
            })
          : parrafo("", {}),
      ],
    }),
  ];

  const tablaCabecera = new Table({
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    columnWidths: [2400, 4226, 2400],
    rows: [
      new TableRow({ children: celdasCabecera }),
      new TableRow({
        children: [
          celda([parrafo("ACTA DE REUNIÓN", { negrita: true, tamano: 24, centrado: true })], {
            ancho: ANCHO_CONTENIDO,
            span: 3,
            sombreado: true,
          }),
        ],
      }),
    ],
  });

  // --- Tabla de datos: lugar, fecha, objeto, asistentes y firmas ---
  const tercio = Math.floor(ANCHO_CONTENIDO / 3);

  const listaAsistentes = acta.asistentes.map(
    (a) => new Paragraph({
      children: [
        txt(`${a.nombre}`, { negrita: true }),
        txt(` — ${a.cargo} (${a.organizacion})`),
      ],
    }),
  );

  const bloqueFirma = (org: "AT" | "DO" | "CON") => {
    const personas = acta.asistentes.filter((a) => a.organizacion === org);
    return celda(
      [
        parrafo(ETIQUETA_ORGANIZACION[org].toUpperCase(), { negrita: true }),
        parrafo(""),
        parrafo(""),
        parrafo(""),
        ...personas.map((p) => parrafo(p.nombre)),
        ...personas.map((p) => parrafo(p.cargo, { tamano: 16 })),
      ],
      { ancho: tercio },
    );
  };

  const tablaDatos = new Table({
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    columnWidths: [tercio, tercio, ANCHO_CONTENIDO - 2 * tercio],
    rows: [
      new TableRow({
        children: [
          celda(
            [new Paragraph({ children: [txt("LUGAR: ", { negrita: true }), txt(acta.lugar)] })],
            { ancho: tercio * 2, span: 2 },
          ),
          celda(
            [new Paragraph({ children: [txt("FECHA: ", { negrita: true }), txt(formatearFecha(acta.fecha))] })],
            { ancho: ANCHO_CONTENIDO - 2 * tercio },
          ),
        ],
      }),
      new TableRow({
        children: [
          celda(
            [new Paragraph({ children: [txt("OBJETO DE REUNIÓN: ", { negrita: true }), txt(acta.objeto.toUpperCase())] })],
            { ancho: ANCHO_CONTENIDO, span: 3 },
          ),
        ],
      }),
      new TableRow({
        children: [
          celda(
            [parrafo("ASISTENTES:", { negrita: true }), ...listaAsistentes],
            { ancho: ANCHO_CONTENIDO, span: 3 },
          ),
        ],
      }),
      new TableRow({
        children: [bloqueFirma("AT"), bloqueFirma("DO"), bloqueFirma("CON")],
      }),
    ],
  });

  // --- Tabla de asuntos tratados ---
  const anchoAccion = 1700;
  const anchoAsunto = ANCHO_CONTENIDO - anchoAccion;

  const filasAsuntos = acta.asuntos.map(
    (asunto, i) =>
      new TableRow({
        children: [
          celda(
            [
              parrafo(`Asunto ${i + 1}. ${asunto.titulo}`, { negrita: true }),
              parrafo(""),
              parrafo(asunto.desarrollo),
            ],
            { ancho: anchoAsunto },
          ),
          celda([parrafo(asunto.accionPor.join(", "), { centrado: true })], { ancho: anchoAccion }),
        ],
      }),
  );

  const tablaAsuntos = new Table({
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    columnWidths: [anchoAsunto, anchoAccion],
    rows: [
      new TableRow({
        children: [
          celda([parrafo("ASUNTOS TRATADOS:", { negrita: true })], { ancho: anchoAsunto, sombreado: true }),
          celda([parrafo("Acción a realizar por:", { negrita: true, centrado: true })], {
            ancho: anchoAccion,
            sombreado: true,
          }),
        ],
      }),
      ...filasAsuntos,
    ],
  });

  const numeroAR = `AR${String(acta.numero).padStart(2, "0")}`;
  const nombreArchivo = `${fechaAAMMDD(acta.fecha)} ${numeroAR} ACTA REUNION ${obra.codigo}-E0.docx`;

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FUENTE, size: 20 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [txt(nombreArchivo.replace(".docx", "").toUpperCase(), { tamano: 14 })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  txt("Página ", { tamano: 14 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: 14 }),
                  txt(" de ", { tamano: 14 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FUENTE, size: 14 }),
                ],
              }),
            ],
          }),
        },
        children: [
          tablaCabecera,
          new Paragraph({ children: [] }),
          tablaDatos,
          new Paragraph({ children: [] }),
          tablaAsuntos,
          new Paragraph({ children: [] }),
          ...(acta.proximaReunion
            ? [
                new Paragraph({
                  children: [
                    txt("PRÓXIMA REUNIÓN: ", { negrita: true }),
                    txt(formatearFecha(acta.proximaReunion)),
                  ],
                }),
              ]
            : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
