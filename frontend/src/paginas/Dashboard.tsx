import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ClipboardList, FileText, Users } from "lucide-react";
import { listarActas, listarObras, usarBD } from "../servicios/bd";
import { BarrasHorizontales, ColumnasMensuales, Donut } from "../componentes/Graficas";
import { ETIQUETA_ORIGEN, formatearFecha } from "../tipos";

export default function Dashboard() {
  usarBD();
  const todasLasActas = listarActas();
  const obras = listarObras();

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const actas = useMemo(
    () => todasLasActas.filter((a) => (!desde || a.fecha >= desde) && (!hasta || a.fecha <= hasta)),
    [todasLasActas, desde, hasta],
  );

  const datos = useMemo(() => {
    const porObra = obras.map((o) => ({
      etiqueta: o.codigo,
      valor: actas.filter((a) => a.obraId === o.id).length,
    }));

    const clientes = [...new Set(obras.map((o) => o.cliente))];
    const porCliente = clientes.map((c) => ({
      etiqueta: c,
      valor: actas.filter((a) => obras.find((o) => o.id === a.obraId)?.cliente === c).length,
    }));

    const porOrigen = (Object.keys(ETIQUETA_ORIGEN) as Array<keyof typeof ETIQUETA_ORIGEN>)
      .map((k) => ({
        etiqueta: ETIQUETA_ORIGEN[k],
        valor: actas.filter((a) => a.origen === k).length,
      }))
      .filter((d) => d.valor > 0);

    // Últimos 9 meses
    const meses: { etiqueta: string; valor: number }[] = [];
    const ahora = new Date();
    for (let i = 8; i >= 0; i--) {
      const f = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
      meses.push({
        etiqueta: f.toLocaleDateString("es-ES", { month: "short" }),
        valor: actas.filter((a) => a.fecha.startsWith(clave)).length,
      });
    }

    const accionesPendientes = actas.reduce(
      (s, a) => s + a.asuntos.filter((x) => x.accionPor.length > 0).length,
      0,
    );

    return { porObra, porCliente, porOrigen, meses, clientes, accionesPendientes };
  }, [actas, obras]);

  const kpis = [
    { texto: "Actas totales", valor: actas.length, icono: FileText, color: "text-primario bg-primario-suave" },
    { texto: "Obras / proyectos", valor: obras.length, icono: Building2, color: "text-ambar bg-ambar-suave" },
    { texto: "Clientes", valor: datos.clientes.length, icono: Users, color: "text-verde bg-verde-suave" },
    { texto: "Asuntos con acción", valor: datos.accionesPendientes, icono: ClipboardList, color: "text-acento bg-acento-suave" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-tinta-suave">Resumen de actas de visitas de obra y reuniones</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="etiqueta" htmlFor="dash-desde">Desde</label>
            <input
              id="dash-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="campo"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="dash-hasta">Hasta</label>
            <input
              id="dash-hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="campo"
            />
          </div>
          {(desde || hasta) && (
            <button
              type="button"
              onClick={() => { setDesde(""); setHasta(""); }}
              className="text-xs text-primario font-medium hover:underline pb-2"
            >
              Quitar filtro
            </button>
          )}
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ texto, valor, icono: Icono, color }) => (
          <div key={texto} className="tarjeta flex items-center gap-4">
            <div className={`w-11 h-11 rounded-acb flex items-center justify-center ${color}`}>
              <Icono size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{valor}</p>
              <p className="text-xs text-tinta-suave mt-1">{texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="tarjeta">
          <h2 className="font-semibold mb-4">Actas por obra</h2>
          <BarrasHorizontales datos={datos.porObra} />
        </div>
        <div className="tarjeta">
          <h2 className="font-semibold mb-4">Actas por cliente</h2>
          <Donut datos={datos.porCliente} />
        </div>
        <div className="tarjeta">
          <h2 className="font-semibold mb-4">Actividad mensual</h2>
          <ColumnasMensuales datos={datos.meses} />
        </div>
        <div className="tarjeta">
          <h2 className="font-semibold mb-4">Origen de las actas</h2>
          <BarrasHorizontales datos={datos.porOrigen} />
        </div>
      </div>

      {/* Últimas actas */}
      <div className="tarjeta">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Últimas actas</h2>
          <Link to="/actas" className="text-sm text-primario font-medium hover:underline">
            Ver todas →
          </Link>
        </div>
        <ul className="divide-y divide-borde">
          {actas.slice(0, 5).map((a) => {
            const obra = obras.find((o) => o.id === a.obraId);
            return (
              <li key={a.id}>
                <Link
                  to={`/actas/${a.id}`}
                  className="flex items-center gap-4 py-2.5 hover:bg-fondo rounded px-2 -mx-2 transition"
                >
                  <span className="text-xs font-mono font-semibold text-primario bg-primario-suave rounded px-2 py-1">
                    AR{String(a.numero).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.objeto}</p>
                    <p className="text-xs text-tinta-suave truncate">{obra?.nombre}</p>
                  </div>
                  <span className="text-xs text-tinta-suave shrink-0">{formatearFecha(a.fecha)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
