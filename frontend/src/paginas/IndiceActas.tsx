import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, Search } from "lucide-react";
import { listarActas, listarObras, usarBD } from "../servicios/bd";
import { ETIQUETA_ORIGEN, formatearFecha, type OrigenActa } from "../tipos";

export default function IndiceActas() {
  usarBD();
  const actas = listarActas();
  const obras = listarObras();

  const [busqueda, setBusqueda] = useState("");
  const [filtroObra, setFiltroObra] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");

  const clientes = [...new Set(obras.map((o) => o.cliente))];

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return actas.filter((a) => {
      const obra = obras.find((o) => o.id === a.obraId);
      if (filtroObra && a.obraId !== filtroObra) return false;
      if (filtroCliente && obra?.cliente !== filtroCliente) return false;
      if (filtroOrigen && a.origen !== filtroOrigen) return false;
      if (!q) return true;
      const pajar = [
        a.objeto,
        a.lugar,
        obra?.nombre,
        obra?.codigo,
        ...a.asuntos.map((x) => `${x.titulo} ${x.desarrollo}`),
        ...a.asistentes.map((x) => x.nombre),
      ]
        .join(" ")
        .toLowerCase();
      return pajar.includes(q);
    });
  }, [actas, obras, busqueda, filtroObra, filtroCliente, filtroOrigen]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Índice de actas</h1>
          <p className="text-sm text-tinta-suave">
            {filtradas.length} de {actas.length} actas
          </p>
        </div>
        <Link to="/nueva" className="boton-primario">
          <FilePlus2 size={16} /> Nueva acta
        </Link>
      </header>

      {/* Filtros */}
      <div className="tarjeta grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-1">
          <Search size={15} className="absolute left-3 top-2.5 text-tinta-suave" />
          <input
            className="campo pl-9"
            placeholder="Buscar en actas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select className="campo" value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
          <option value="">Todas las obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.codigo} — {o.nombre}
            </option>
          ))}
        </select>
        <select className="campo" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="campo" value={filtroOrigen} onChange={(e) => setFiltroOrigen(e.target.value)}>
          <option value="">Cualquier origen</option>
          {(Object.keys(ETIQUETA_ORIGEN) as OrigenActa[]).map((k) => (
            <option key={k} value={k}>
              {ETIQUETA_ORIGEN[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="tarjeta p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-tinta-suave uppercase tracking-wide border-b border-borde bg-fondo/50">
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Obra</th>
              <th className="px-4 py-3">Objeto</th>
              <th className="px-4 py-3 text-center">Asuntos</th>
              <th className="px-4 py-3">Origen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {filtradas.map((a) => {
              const obra = obras.find((o) => o.id === a.obraId);
              return (
                <tr key={a.id} className="hover:bg-primario-suave/40 transition">
                  <td className="px-4 py-3">
                    <Link to={`/actas/${a.id}`} className="font-mono font-semibold text-primario">
                      AR{String(a.numero).padStart(2, "0")}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatearFecha(a.fecha)}</td>
                  <td className="px-4 py-3">
                    <span className="insignia bg-fondo border border-borde">{obra?.codigo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/actas/${a.id}`} className="font-medium hover:text-primario hover:underline">
                      {a.objeto}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">{a.asuntos.length}</td>
                  <td className="px-4 py-3">
                    <span className="insignia bg-primario-suave text-primario">
                      {ETIQUETA_ORIGEN[a.origen]}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-tinta-suave">
                  No hay actas que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
