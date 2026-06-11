import { useState } from "react";
import { KeyRound, RotateCcw, Save } from "lucide-react";
import { guardarConfig, obtenerConfig, restablecerEjemplos } from "../servicios/bd";

export default function Configuracion() {
  const [config, setConfig] = useState(obtenerConfig());
  const [guardado, setGuardado] = useState(false);

  function guardar() {
    guardarConfig(config);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-tinta-suave">Ajustes de la aplicación y del generador con IA</p>
      </header>

      <div className="tarjeta space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <KeyRound size={16} className="text-primario" /> Generación con IA (Claude)
        </h2>
        <p className="text-xs text-tinta-suave">
          Con una clave de API de Anthropic las actas se generan con IA: redacción formal,
          asuntos bien separados y asignación de acciones. Sin clave funciona el modo básico local.
          La clave se guarda solo en este navegador.
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

      <div className="tarjeta border-acento/30 space-y-3">
        <h2 className="font-semibold text-acento">Zona de mantenimiento</h2>
        <p className="text-xs text-tinta-suave">
          Restablece la base de datos local a los 6 ejemplos iniciales. Se perderán las actas creadas.
        </p>
        <button
          className="boton-peligro"
          onClick={() => {
            if (confirm("¿Restablecer la base de datos a los ejemplos iniciales?")) restablecerEjemplos();
          }}
        >
          <RotateCcw size={15} /> Restablecer ejemplos
        </button>
      </div>
    </div>
  );
}
