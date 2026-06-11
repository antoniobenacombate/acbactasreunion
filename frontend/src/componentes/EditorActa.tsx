// Formulario de edición de un acta (usado en Nueva acta y en Detalle)

import { Plus, Trash2 } from "lucide-react";
import type { Asistente, Asunto, Organizacion } from "../tipos";
import { ETIQUETA_ORGANIZACION } from "../tipos";

export interface DatosEditables {
  fecha: string;
  lugar: string;
  objeto: string;
  asistentes: Asistente[];
  asuntos: Asunto[];
  proximaReunion?: string;
}

const ORGANIZACIONES = Object.keys(ETIQUETA_ORGANIZACION) as Organizacion[];

export default function EditorActa({
  datos,
  onCambio,
}: {
  datos: DatosEditables;
  onCambio: (d: DatosEditables) => void;
}) {
  const pon = (parcial: Partial<DatosEditables>) => onCambio({ ...datos, ...parcial });

  const ponAsistente = (i: number, parcial: Partial<Asistente>) => {
    const lista = datos.asistentes.map((a, j) => (j === i ? { ...a, ...parcial } : a));
    pon({ asistentes: lista });
  };

  const ponAsunto = (i: number, parcial: Partial<Asunto>) => {
    const lista = datos.asuntos.map((a, j) => (j === i ? { ...a, ...parcial } : a));
    pon({ asuntos: lista });
  };

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="etiqueta">Fecha</label>
          <input
            type="date"
            className="campo"
            value={datos.fecha}
            onChange={(e) => pon({ fecha: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="etiqueta">Lugar</label>
          <input
            className="campo"
            value={datos.lugar}
            onChange={(e) => pon({ lugar: e.target.value })}
            placeholder="Caseta de obra, oficinas..."
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="etiqueta">Objeto de la reunión</label>
          <input
            className="campo"
            value={datos.objeto}
            onChange={(e) => pon({ objeto: e.target.value })}
            placeholder="Seguimiento mensual, replanteo..."
          />
        </div>
        <div>
          <label className="etiqueta">Próxima reunión</label>
          <input
            type="date"
            className="campo"
            value={datos.proximaReunion ?? ""}
            onChange={(e) => pon({ proximaReunion: e.target.value || undefined })}
          />
        </div>
      </div>

      {/* Asistentes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="etiqueta mb-0">Asistentes</label>
          <button
            type="button"
            className="text-xs text-primario font-medium hover:underline inline-flex items-center gap-1"
            onClick={() =>
              pon({
                asistentes: [...datos.asistentes, { nombre: "", cargo: "", organizacion: "DO" }],
              })
            }
          >
            <Plus size={13} /> Añadir
          </button>
        </div>
        <div className="space-y-2">
          {datos.asistentes.map((a, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="campo flex-1"
                placeholder="Nombre"
                value={a.nombre}
                onChange={(e) => ponAsistente(i, { nombre: e.target.value })}
              />
              <input
                className="campo flex-1"
                placeholder="Cargo"
                value={a.cargo}
                onChange={(e) => ponAsistente(i, { cargo: e.target.value })}
              />
              <select
                className="campo w-44"
                value={a.organizacion}
                onChange={(e) => ponAsistente(i, { organizacion: e.target.value as Organizacion })}
              >
                {ORGANIZACIONES.map((o) => (
                  <option key={o} value={o}>
                    {o} — {ETIQUETA_ORGANIZACION[o]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="text-tinta-suave hover:text-acento p-1"
                onClick={() => pon({ asistentes: datos.asistentes.filter((_, j) => j !== i) })}
                title="Eliminar asistente"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {datos.asistentes.length === 0 && (
            <p className="text-xs text-tinta-suave italic">Sin asistentes. Añade al menos uno.</p>
          )}
        </div>
      </div>

      {/* Asuntos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="etiqueta mb-0">Asuntos tratados</label>
          <button
            type="button"
            className="text-xs text-primario font-medium hover:underline inline-flex items-center gap-1"
            onClick={() =>
              pon({ asuntos: [...datos.asuntos, { titulo: "", desarrollo: "", accionPor: [] }] })
            }
          >
            <Plus size={13} /> Añadir asunto
          </button>
        </div>
        <div className="space-y-3">
          {datos.asuntos.map((asunto, i) => (
            <div key={i} className="border border-borde rounded-acb p-4 bg-fondo/40 space-y-2">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-mono font-bold text-tinta-suave shrink-0">
                  {i + 1}.
                </span>
                <input
                  className="campo font-medium"
                  placeholder="Título del asunto"
                  value={asunto.titulo}
                  onChange={(e) => ponAsunto(i, { titulo: e.target.value })}
                />
                <button
                  type="button"
                  className="text-tinta-suave hover:text-acento p-1"
                  onClick={() => pon({ asuntos: datos.asuntos.filter((_, j) => j !== i) })}
                  title="Eliminar asunto"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <textarea
                className="campo min-h-20"
                placeholder="Desarrollo del asunto"
                value={asunto.desarrollo}
                onChange={(e) => ponAsunto(i, { desarrollo: e.target.value })}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-tinta-suave">Acción a realizar por:</span>
                {ORGANIZACIONES.map((o) => {
                  const activo = asunto.accionPor.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      className={`insignia border transition ${
                        activo
                          ? "bg-primario text-white border-primario"
                          : "bg-superficie text-tinta-suave border-borde hover:border-primario"
                      }`}
                      onClick={() =>
                        ponAsunto(i, {
                          accionPor: activo
                            ? asunto.accionPor.filter((x) => x !== o)
                            : [...asunto.accionPor, o],
                        })
                      }
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {datos.asuntos.length === 0 && (
            <p className="text-xs text-tinta-suave italic">Sin asuntos todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}
