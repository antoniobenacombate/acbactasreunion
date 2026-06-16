import { useState } from "react";
import { KeyRound, Lock, Save } from "lucide-react";
import { guardarConfig, obtenerConfig } from "../servicios/bd";
import { cambiarContrasena, usarAuth } from "../servicios/autenticacion";

export default function Configuracion() {
  const { perfil } = usarAuth();
  const [config, setConfig] = useState(obtenerConfig());
  const [guardado, setGuardado] = useState(false);
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [avisoContrasena, setAvisoContrasena] = useState("");

  async function actualizarContrasena() {
    setAvisoContrasena("");
    try {
      await cambiarContrasena(contrasenaActual, contrasenaNueva);
      setContrasenaActual("");
      setContrasenaNueva("");
      setAvisoContrasena("Contraseña actualizada ✓");
    } catch (e) {
      setAvisoContrasena((e as Error).message);
    }
  }

  function guardar() {
    guardarConfig(config);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-tinta-suave">
          Ajustes de este dispositivo. Sesión: {perfil?.email}
        </p>
      </header>

      <div className="tarjeta space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <KeyRound size={16} className="text-primario" /> Generación con IA (Claude)
        </h2>
        <p className="text-xs text-tinta-suave">
          Con una clave de API de Anthropic las actas se generan con IA: lee fotos y PDF de notas
          manuscritas y redacta en registro formal. Sin clave funciona el modo básico solo con
          texto. La clave se guarda únicamente en este navegador.
        </p>
        <div>
          <label className="etiqueta">Clave de API (sk-ant-...)</label>
          <input
            type="password"
            className="campo font-mono"
            value={config.claveApiClaude}
            onChange={(e) => setConfig({ ...config, claveApiClaude: e.target.value })}
            placeholder="sk-ant-api03-..."
          />
        </div>
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <KeyRound size={16} className="text-acento" /> Alternativa gratis: OCR.space
        </h2>
        <p className="text-xs text-tinta-suave">
          Sin tarjeta de crédito: extrae el texto de fotos y PDF con OCR.space (cuota gratis,
          solo necesitas registrarte con tu email en{" "}
          <a
            href="https://ocr.space/ocrapi"
            target="_blank"
            rel="noreferrer"
            className="text-primario underline"
          >
            ocr.space/ocrapi
          </a>
          ). Se usa solo si no hay clave de Claude configurada arriba. La redacción del acta sale
          con el modo básico (sin IA), así que revisa el resultado antes de guardar.
        </p>
        <div>
          <label className="etiqueta">Clave de API de OCR.space</label>
          <input
            type="password"
            className="campo font-mono"
            value={config.claveApiOcrSpace}
            onChange={(e) => setConfig({ ...config, claveApiOcrSpace: e.target.value })}
            placeholder="K8...."
          />
        </div>
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-semibold">Datos por defecto</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="etiqueta">Tu nombre (Asistencia Técnica)</label>
            <input
              className="campo"
              value={config.nombreAT}
              onChange={(e) => setConfig({ ...config, nombreAT: e.target.value })}
            />
          </div>
          <div>
            <label className="etiqueta">Empresa / U.T.E.</label>
            <input
              className="campo"
              value={config.empresaAT}
              onChange={(e) => setConfig({ ...config, empresaAT: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="boton-primario" onClick={guardar}>
          <Save size={16} /> Guardar configuración
        </button>
        {guardado && <span className="text-sm text-verde font-medium">Guardado ✓</span>}
      </div>

      <div className="tarjeta space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Lock size={16} className="text-primario" /> Cambiar contraseña
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="etiqueta">Contraseña actual</label>
            <input
              type="password"
              className="campo"
              value={contrasenaActual}
              onChange={(e) => setContrasenaActual(e.target.value)}
            />
          </div>
          <div>
            <label className="etiqueta">Contraseña nueva (mín. 6)</label>
            <input
              type="password"
              className="campo"
              value={contrasenaNueva}
              onChange={(e) => setContrasenaNueva(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="boton-secundario"
            onClick={actualizarContrasena}
            disabled={!contrasenaActual || contrasenaNueva.length < 6}
          >
            Actualizar contraseña
          </button>
          {avisoContrasena && (
            <span className={`text-xs font-medium ${avisoContrasena.includes("✓") ? "text-verde" : "text-acento"}`}>
              {avisoContrasena}
            </span>
          )}
        </div>
      </div>

      <div className="tarjeta">
        <h2 className="font-semibold mb-1">Datos en la nube</h2>
        <p className="text-xs text-tinta-suave">
          Las obras y actas se guardan en una base de datos privada (Cloudflare D1) a la que solo
          accede la API del equipo, nunca el navegador. Se comparten entre todos los usuarios
          aprobados.
        </p>
      </div>
    </div>
  );
}
