import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Trash2, XCircle } from "lucide-react";
import {
  aprobarUsuario,
  eliminarUsuario,
  hacerAdmin,
  listarPerfiles,
  usarAuth,
  type Perfil,
} from "../servicios/autenticacion";

export default function Usuarios() {
  const { perfil: yo } = usarAuth();
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      setPerfiles(await listarPerfiles());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  if (!yo?.esAdmin) {
    return (
      <div className="tarjeta max-w-xl">
        <p className="text-sm">Solo el administrador puede gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-tinta-suave">
          Aprueba las cuentas nuevas para darles acceso a las actas. Los administradores pueden
          además gestionar usuarios.
        </p>
      </header>

      {error && <p className="text-sm text-acento">{error}</p>}

      <div className="tarjeta p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-tinta-suave uppercase tracking-wide border-b border-borde bg-fondo/50">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {perfiles.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{p.nombre || "—"}</p>
                  <p className="text-xs text-tinta-suave">{p.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {p.esAdmin && (
                      <span className="insignia bg-primario-suave text-primario">
                        <ShieldCheck size={11} className="mr-1" /> Admin
                      </span>
                    )}
                    {p.aprobado ? (
                      <span className="insignia bg-verde-suave text-verde">Aprobado</span>
                    ) : (
                      <span className="insignia bg-ambar-suave text-ambar">Pendiente</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.id !== yo.id && (
                    <div className="inline-flex gap-2">
                      <button
                        className={p.aprobado ? "boton-secundario !px-3" : "boton-primario !px-3"}
                        title={p.aprobado ? "Retirar aprobación" : "Aprobar usuario"}
                        onClick={async () => {
                          await aprobarUsuario(p.id, !p.aprobado);
                          void cargar();
                        }}
                      >
                        {p.aprobado ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                      </button>
                      <button
                        className="boton-secundario !px-3"
                        title={p.esAdmin ? "Quitar admin" : "Hacer admin"}
                        onClick={async () => {
                          await hacerAdmin(p.id, !p.esAdmin);
                          void cargar();
                        }}
                      >
                        <ShieldCheck size={15} className={p.esAdmin ? "text-primario" : ""} />
                      </button>
                      <button
                        className="boton-secundario !px-3 text-acento hover:bg-acento hover:text-white"
                        title="Eliminar usuario"
                        onClick={async () => {
                          if (!window.confirm(`¿Eliminar a ${p.nombre || p.email} de forma permanente?`)) return;
                          await eliminarUsuario(p.id);
                          void cargar();
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!cargando && perfiles.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-tinta-suave">
                  Sin usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
