import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Pencil, Save, Trash2, X } from "lucide-react";
import { eliminarActa, guardarActa, obtenerActa, obtenerObra, usarBD } from "../servicios/bd";
import { exportarActaDocx } from "../servicios/exportarDocx";
import EditorActa, { type DatosEditables } from "../componentes/EditorActa";
import { ETIQUETA_ORGANIZACION, ETIQUETA_ORIGEN, formatearFecha } from "../tipos";

export default function DetalleActa() {
  usarBD();
  const { id } = useParams();
  const navegar = useNavigate();
  const acta = id ? obtenerActa(id) : undefined;
  const obra = acta ? obtenerObra(acta.obraId) : undefined;

  const [editando, setEditando] = useState(false);
  const [edicion, setEdicion] = useState<DatosEditables | null>(null);
  const [exportando, setExportando] = useState(false);

  if (!acta || !obra) {
    return (
      <div className="tarjeta">
        <p>Acta no encontrada.</p>
        <Link to="/actas" className="text-primario hover:underline text-sm">
          ← Volver al índice
        </Link>
      </div>
    );
  }

  const numeroAR = `AR${String(acta.numero).padStart(2, "0")}`;

  async function exportar() {
    setExportando(true);
    try {
      await exportarActaDocx(acta!, obra!);
    } finally {
      setExportando(false);
    }
  }

  async function guardarCambios() {
    if (!edicion) return;
    try {
      await guardarActa({ ...acta!, ...edicion });
      setEditando(false);
    } catch (e) {
      alert(`No se pudo guardar: ${(e as Error).message}`);
    }
  }

  async function borrar() {
    if (confirm(`¿Eliminar el acta ${numeroAR} — ${acta!.objeto}?`)) {
      try {
        await eliminarActa(acta!.id);
        navegar("/actas");
      } catch (e) {
        alert(`No se pudo eliminar: ${(e as Error).message}`);
      }
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link to="/actas" className="text-xs text-tinta-suave hover:text-primario inline-flex items-center gap-1 mb-2">
            <ArrowLeft size={13} /> Índice de actas
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="font-mono text-primario">{numeroAR}</span>
            {acta.objeto}
          </h1>
          <p className="text-sm text-tinta-suave mt-1">
            {obra.nombre} · {obra.cliente}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!editando ? (
            <>
              <button className="boton-secundario" onClick={() => { setEdicion({ ...acta }); setEditando(true); }}>
                <Pencil size={15} /> Editar
              </button>
              <button className="boton-primario" onClick={exportar} disabled={exportando}>
                <FileDown size={15} /> {exportando ? "Exportando..." : "Exportar Word"}
              </button>
              <button className="boton-peligro" onClick={borrar} title="Eliminar acta">
                <Trash2 size={15} />
              </button>
            </>
          ) : (
            <>
              <button className="boton-secundario" onClick={() => setEditando(false)}>
                <X size={15} /> Cancelar
              </button>
              <button className="boton-primario" onClick={guardarCambios}>
                <Save size={15} /> Guardar
              </button>
            </>
          )}
        </div>
      </header>

      {editando && edicion ? (
        <div className="tarjeta">
          <EditorActa datos={edicion} onCambio={setEdicion} />
        </div>
      ) : (
        <>
          {/* Vista del acta, con aspecto similar a la plantilla */}
          <div className="tarjeta space-y-5">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="md:col-span-2">
                <p className="etiqueta">Lugar</p>
                <p>{acta.lugar || "—"}</p>
              </div>
              <div>
                <p className="etiqueta">Fecha</p>
                <p>{formatearFecha(acta.fecha)}</p>
              </div>
            </div>

            <div>
              <p className="etiqueta">Asistentes</p>
              <ul className="text-sm space-y-1">
                {acta.asistentes.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="insignia bg-fondo border border-borde w-12 justify-center">{a.organizacion}</span>
                    <span className="font-medium">{a.nombre}</span>
                    <span className="text-tinta-suave">— {a.cargo}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="tarjeta p-0 overflow-hidden">
            <div className="flex justify-between items-center bg-fondo/60 border-b border-borde px-5 py-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide">Asuntos tratados</h2>
              <span className="text-xs font-semibold text-tinta-suave uppercase tracking-wide">Acción por</span>
            </div>
            <ul className="divide-y divide-borde">
              {acta.asuntos.map((asunto, i) => (
                <li key={i} className="px-5 py-4 flex gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1">
                      Asunto {i + 1}. {asunto.titulo}
                    </p>
                    <p className="text-sm text-tinta/90 whitespace-pre-line">{asunto.desarrollo}</p>
                  </div>
                  <div className="shrink-0 flex flex-col gap-1 items-end">
                    {asunto.accionPor.map((o) => (
                      <span
                        key={o}
                        className="insignia bg-primario-suave text-primario"
                        title={ETIQUETA_ORGANIZACION[o as keyof typeof ETIQUETA_ORGANIZACION] ?? o}
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-tinta-suave">
            <span>Origen: <strong>{ETIQUETA_ORIGEN[acta.origen]}</strong></span>
            {acta.proximaReunion && (
              <span>Próxima reunión: <strong>{formatearFecha(acta.proximaReunion)}</strong></span>
            )}
            <span>Creada: {new Date(acta.creadoEl).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</span>
          </div>

          {acta.textoOriginal && (
            <details className="tarjeta">
              <summary className="cursor-pointer text-sm font-medium text-tinta-suave hover:text-tinta">
                Ver texto original volcado
              </summary>
              <pre className="mt-3 text-xs whitespace-pre-wrap font-mono text-tinta-suave bg-fondo rounded-acb p-4">
                {acta.textoOriginal}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
