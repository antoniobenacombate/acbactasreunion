import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { entrar, registrar } from "../servicios/autenticacion";

export default function Acceso() {
  const navegar = useNavigate();
  const [modo, setModo] = useState<"entrar" | "registro">("entrar");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombre, setNombre] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError("");
    try {
      if (modo === "entrar") {
        await entrar(email, contrasena);
      } else {
        await registrar(email, contrasena, nombre);
      }
      navegar("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-fondo p-4">
      <div className="w-full max-w-sm tarjeta">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-acb bg-primario text-white flex items-center justify-center font-bold text-sm">
            AR
          </div>
          <div>
            <p className="font-bold leading-tight">ACB Actas</p>
            <p className="text-xs text-tinta-suave leading-tight">Actas de visitas de obra</p>
          </div>
        </div>

        <div className="flex gap-1 rounded-acb bg-fondo p-1 text-xs mb-4">
          {(["entrar", "registro"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`flex-1 rounded py-1.5 font-medium transition ${
                modo === m ? "bg-superficie shadow-acb text-tinta" : "text-tinta-suave"
              }`}
            >
              {m === "entrar" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          ))}
        </div>

        <form onSubmit={enviar} className="space-y-3">
          {modo === "registro" && (
            <div>
              <label className="etiqueta">Nombre completo</label>
              <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
          )}
          <div>
            <label className="etiqueta">Email</label>
            <input
              type="email"
              required
              className="campo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="etiqueta">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              className="campo"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-acento font-medium">{error}</p>}

          <button className="boton-primario w-full justify-center" disabled={ocupado}>
            {ocupado && <Loader2 size={15} className="animate-spin" />}
            {modo === "entrar" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        {modo === "registro" && (
          <p className="text-[11px] text-tinta-suave mt-3">
            Las cuentas nuevas quedan pendientes hasta que el administrador las apruebe.
          </p>
        )}
      </div>
    </div>
  );
}
