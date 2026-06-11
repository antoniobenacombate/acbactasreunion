import { NavLink, Outlet } from "react-router-dom";
import { Building2, FilePlus2, FileText, LayoutDashboard, Settings } from "lucide-react";

const enlaces = [
  { a: "/", texto: "Dashboard", icono: LayoutDashboard },
  { a: "/actas", texto: "Actas", icono: FileText },
  { a: "/nueva", texto: "Nueva acta", icono: FilePlus2 },
  { a: "/obras", texto: "Obras y clientes", icono: Building2 },
  { a: "/configuracion", texto: "Configuración", icono: Settings },
];

export default function Disposicion() {
  return (
    <div className="min-h-screen flex">
      {/* Barra lateral */}
      <aside className="w-56 shrink-0 bg-superficie border-r border-borde flex flex-col">
        <div className="px-5 py-6 border-b border-borde">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-acb bg-primario text-white flex items-center justify-center font-bold text-sm">
              AR
            </div>
            <div>
              <p className="font-bold leading-tight">ACB Actas</p>
              <p className="text-xs text-tinta-suave leading-tight">Visitas de obra</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {enlaces.map(({ a, texto, icono: Icono }) => (
            <NavLink
              key={a}
              to={a}
              end={a === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-acb text-sm font-medium transition ${
                  isActive
                    ? "bg-primario-suave text-primario"
                    : "text-tinta-suave hover:bg-fondo hover:text-tinta"
                }`
              }
            >
              <Icono size={17} />
              {texto}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-[11px] text-tinta-suave border-t border-borde">
          ACB · Actas de Reunión v1.0
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
