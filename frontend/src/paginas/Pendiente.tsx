import { useNavigate } from "react-router-dom";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { refrescarPerfil, salir, usarAuth } from "../servicios/autenticacion";

export default function Pendiente() {
  const navegar = useNavigate();
  const { perfil } = usarAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-fondo p-4">
      <div className="w-full max-w-sm tarjeta text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-ambar-suave text-ambar flex items-center justify-center mx-auto">
          <Clock size={22} />
        </div>
        <div>
          <h1 className="font-bold text-lg">Cuenta pendiente de aprobación</h1>
          <p className="text-sm text-tinta-suave mt-1">
            {perfil?.email} — el administrador debe aprobar tu cuenta antes de poder usar la
            aplicación.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <button
            className="boton-secundario"
            onClick={async () => {
              await refrescarPerfil();
              navegar("/");
            }}
          >
            <RefreshCw size={15} /> Comprobar de nuevo
          </button>
          <button
            className="boton-secundario"
            onClick={async () => {
              await salir();
              navegar("/acceso");
            }}
          >
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>
    </div>
  );
}
