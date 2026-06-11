import { useState, useSyncExternalStore } from "react";
import { Check, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import {
  actualizarObra,
  crearObra,
  eliminarCliente,
  eliminarObra,
  listarActas,
  listarClientes,
  listarObras,
  obtenerObraPreferenteId,
  ponerObraPreferente,
  renombrarCliente,
  suscribir,
} from "../servicios/bd";
import type { Obra } from "../tipos";

export default function Obras() {
  useSyncExternalStore(suscribir, () => localStorage.getItem("acb_actas_bd_v1"));
  const obras = listarObras();
  const actas = listarActas();
  const clientes = listarClientes();
  const preferenteId = obtenerObraPreferenteId();

  // Edición de obra
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Obra | null>(null);

  // Alta de obra
  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState({ nombre: "", codigo: "", cliente: "" });

  // Edición de cliente
  const [clienteEditando, setClienteEditando] = useState<string | null>(null);
  const [clienteNuevoNombre, setClienteNuevoNombre] = useState("");

  function numActas(obraId: string) {
    return actas.filter((a) => a.obraId === obraId).length;
  }

  function guardarEdicion() {
    if (!borrador) return;
    if (!borrador.nombre.trim()) return;
    actualizarObra({
      ...borrador,
      nombre: borrador.nombre.trim(),
      codigo: borrador.codigo.trim() || borrador.nombre.trim().slice(0, 8).toUpperCase(),
      cliente: borrador.cliente.trim() || "Sin cliente",
    });
    setEditandoId(null);
    setBorrador(null);
  }

  function borrarObra(obra: Obra) {
    const n = numActas(obra.id);
    const mensaje =
      n > 0
        ? `¿Eliminar la obra "${obra.nombre}" y sus ${n} actas asociadas?\n\nEsta acción no se puede deshacer.`
        : `¿Eliminar la obra "${obra.nombre}"?`;
    if (confirm(mensaje)) eliminarObra(obra.id);
  }

  function crear() {
    if (!nueva.nombre.trim()) return;
    crearObra({
      nombre: nueva.nombre.trim(),
      codigo: nueva.codigo.trim() || nueva.nombre.trim().slice(0, 8).toUpperCase(),
      cliente: nueva.cliente.trim() || "Sin cliente",
    });
    setNueva({ nombre: "", codigo: "", cliente: "" });
    setCreando(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Obras y clientes</h1>
          <p className="text-sm text-tinta-suave">
            Edita o elimina obras (con sus actas) y clientes. La estrella marca la obra preferente.
          </p>
        </div>
        <button className="boton-primario" onClick={() => setCreando(true)}>
          <Plus size={16} /> Nueva obra
        </button>
      </header>

      {/* Alta de obra */}
      {creando && (
        <div className="tarjeta space-y-3 border-primario/40">
          <h2 className="font-semibold">Nueva obra</h2>
          <input
            className="campo"
            placeholder="Nombre de la obra"
            value={nueva.nombre}
            onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
          />
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="campo"
              placeholder="Código corto (p. ej. A-7)"
              value={nueva.codigo}
              onChange={(e) => setNueva({ ...nueva, codigo: e.target.value })}
            />
            <input
              className="campo"
              placeholder="Cliente"
              list="lista-clientes"
              value={nueva.cliente}
              onChange={(e) => setNueva({ ...nueva, cliente: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button className="boton-primario" onClick={crear}>
              <Check size={15} /> Crear
            </button>
            <button className="boton-secundario" onClick={() => setCreando(false)}>
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de obras */}
      <div className="space-y-3">
        {obras.map((obra) => {
          const enEdicion = editandoId === obra.id && borrador;
          const esPreferente = preferenteId === obra.id;
          return (
            <div key={obra.id} className={`tarjeta ${esPreferente ? "border-ambar/60" : ""}`}>
              {enEdicion ? (
                <div className="space-y-3">
                  <input
                    className="campo font-medium"
                    value={borrador.nombre}
                    onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                    placeholder="Nombre de la obra"
                  />
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      className="campo"
                      value={borrador.codigo}
                      onChange={(e) => setBorrador({ ...borrador, codigo: e.target.value })}
                      placeholder="Código corto"
                    />
                    <input
                      className="campo"
                      value={borrador.cliente}
                      onChange={(e) => setBorrador({ ...borrador, cliente: e.target.value })}
                      placeholder="Cliente"
                      list="lista-clientes"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="boton-primario" onClick={guardarEdicion}>
                      <Check size={15} /> Guardar
                    </button>
                    <button
                      className="boton-secundario"
                      onClick={() => {
                        setEditandoId(null);
                        setBorrador(null);
                      }}
                    >
                      <X size={15} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    title={esPreferente ? "Obra preferente" : "Marcar como preferente"}
                    onClick={() => ponerObraPreferente(esPreferente ? undefined : obra.id)}
                    className={`shrink-0 transition ${
                      esPreferente ? "text-ambar" : "text-borde hover:text-ambar"
                    }`}
                  >
                    <Star size={20} fill={esPreferente ? "currentColor" : "none"} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      <span className="insignia bg-fondo border border-borde mr-2">{obra.codigo}</span>
                      {obra.nombre}
                    </p>
                    <p className="text-xs text-tinta-suave mt-0.5">
                      {obra.cliente} · {numActas(obra.id)} actas
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="boton-secundario !px-3"
                      title="Editar obra"
                      onClick={() => {
                        setEditandoId(obra.id);
                        setBorrador({ ...obra });
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="boton-peligro !px-3"
                      title="Eliminar obra y sus actas"
                      onClick={() => borrarObra(obra)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {obras.length === 0 && (
          <div className="tarjeta text-center text-tinta-suave text-sm">
            No hay obras. Crea la primera con "Nueva obra".
          </div>
        )}
      </div>

      {/* Clientes */}
      <div className="tarjeta">
        <h2 className="font-semibold mb-1">Clientes</h2>
        <p className="text-xs text-tinta-suave mb-4">
          Los clientes se definen en las obras. Renombrar un cliente lo actualiza en todas sus
          obras; eliminarlo deja sus obras como "Sin cliente".
        </p>
        <ul className="divide-y divide-borde">
          {clientes.map((c) => {
            const nObras = obras.filter((o) => o.cliente === c).length;
            const enEdicion = clienteEditando === c;
            return (
              <li key={c} className="py-2.5 flex items-center gap-3">
                {enEdicion ? (
                  <>
                    <input
                      className="campo flex-1"
                      value={clienteNuevoNombre}
                      onChange={(e) => setClienteNuevoNombre(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="boton-primario !px-3"
                      title="Guardar"
                      onClick={() => {
                        if (clienteNuevoNombre.trim() && clienteNuevoNombre.trim() !== c) {
                          renombrarCliente(c, clienteNuevoNombre.trim());
                        }
                        setClienteEditando(null);
                      }}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      className="boton-secundario !px-3"
                      title="Cancelar"
                      onClick={() => setClienteEditando(null)}
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium truncate">{c}</span>
                    <span className="text-xs text-tinta-suave shrink-0">
                      {nObras} {nObras === 1 ? "obra" : "obras"}
                    </span>
                    <button
                      className="boton-secundario !px-3"
                      title="Renombrar cliente"
                      onClick={() => {
                        setClienteEditando(c);
                        setClienteNuevoNombre(c);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="boton-peligro !px-3"
                      title="Eliminar cliente"
                      onClick={() => {
                        if (
                          confirm(
                            `¿Eliminar el cliente "${c}"? Sus ${nObras} obra(s) pasarán a "Sin cliente".`,
                          )
                        )
                          eliminarCliente(c);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
          {clientes.length === 0 && (
            <li className="py-3 text-sm text-tinta-suave">Sin clientes.</li>
          )}
        </ul>
      </div>

      {/* Sugerencias de cliente para los campos de alta/edición */}
      <datalist id="lista-clientes">
        {clientes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}
