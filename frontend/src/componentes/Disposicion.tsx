import { useEffect } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { salir, usarAuth } from "../servicios/autenticacion";
import { cargarBD, estadoBD, usarBD } from "../servicios/bd";

const enlaces = [
  { a: "/", texto: "Dashboard", icono: LayoutDashboard },
  { a: "/actas", texto: "Actas", icono: FileText },
  { a: "/nueva", texto: "Nueva acta", icono: FilePlus2 },
  { a: "/obras", texto: "Obras y clientes", icono: Building2 },
  { a: "/configuracion", texto: "Configuración", icono: Settings },
];

export default function Disposicion() {
  const navegar = useNavigate();
  const { cargado, perfil } = usarAuth();
  const { estado, mensajeError } = usarBD();

  const autorizado = !!perfil && (perfil.aprobado || perfil.esAdmin);

  useEffect(() => {
    if (autorizado && estadoBD() === "inactivo") {
      void cargarBD(perfil?.obraPreferenteId);
    }
  }, [autorizado, perfil?.obraPreferenteId]);

  if (!cargado) {
    return (
      <div className="min-h-screen flex items-center justify-center text-tinta-suave">
        <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
      </div>
    );
  }
  if (!perfil) return <Navigate to="/acceso" replace />;
  if (!autorizado) return <Navigate to="/pendiente" replace />;

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
          {perfil.esAdmin && (
            <NavLink
              to="/usuarios"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-acb text-sm font-medium transition ${
                  isActive
                    ? "bg-primario-suave text-primario"
                    : "text-tinta-suave hover:bg-fondo hover:text-tinta"
                }`
              }
            >
              <Users size={17} />
              Usuarios
            </NavLink>
          )}
        </nav>
        <div className="p-3 border-t border-borde space-y-2">
          <p className="px-2 text-[11px] text-tinta-suave truncate" title={perfil.email}>
            {perfil.nombre || perfil.email}
          </p>
          <button
            className="flex items-center gap-2 px-2 py-1 text-xs text-tinta-suave hover:text-acento transition w-full"
            onClick={async () => {
              await salir();
              navegar("/acceso");
            }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-8 max-w-6xl">
        {estado === "cargando" || estado === "inactivo" ? (
          <div className="flex items-center gap-2 text-tinta-suave mt-10">
            <Loader2 className="animate-spin" size={18} /> Cargando datos...
          </div>
        ) : estado === "error" ? (
          <div className="tarjeta border-acento/40 max-w-xl">
            <p className="font-semibold text-acento">Error al cargar los datos</p>
            <p className="text-sm text-tinta-suave mt-1">{mensajeError}</p>
            <button className="boton-secundario mt-3" onClick={() => void cargarBD()}>
              Reintentar
            </button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
