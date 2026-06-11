import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, Save, Sparkles, Wand2, X } from "lucide-react";
import {
  crearObra,
  guardarActa,
  listarObras,
  obtenerConfig,
  obtenerObraPreferenteId,
  siguienteNumero,
} from "../servicios/bd";
import {
  generarActa,
  prepararImagen,
  type BorradorActa,
  type ImagenEntrada,
} from "../servicios/generador";
import EditorActa, { type DatosEditables } from "../componentes/EditorActa";
import type { Acta, OrigenActa } from "../tipos";
import { ETIQUETA_ORIGEN } from "../tipos";

interface FotoNotas {
  nombre: string;
  miniatura: string; // dataURL para previsualizar
  imagen: ImagenEntrada;
}

export default function NuevaActa() {
  const navegar = useNavigate();
  const obras = listarObras();
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<FotoNotas[]>([]);
  // Por defecto, la obra preferente (estrella en "Obras y clientes")
  const [obraId, setObraId] = useState(obtenerObraPreferenteId() ?? obras[0]?.id ?? "");
  const [origen, setOrigen] = useState<OrigenActa>("manuscrito");
  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [borrador, setBorrador] = useState<DatosEditables | null>(null);
  const [conIA, setConIA] = useState(false);

  // Alta rápida de obra nueva
  const [nuevaObra, setNuevaObra] = useState(false);
  const [obraNombre, setObraNombre] = useState("");
  const [obraCodigo, setObraCodigo] = useState("");
  const [obraCliente, setObraCliente] = useState("");

  async function anadirFotos(archivos: FileList | File[]) {
    setAviso("");
    const lista = [...archivos].filter((f) => f.type.startsWith("image/"));
    for (const archivo of lista) {
      try {
        const imagen = await prepararImagen(archivo);
        setFotos((previas) => [
          ...previas,
          {
            nombre: archivo.name,
            miniatura: `data:${imagen.mediaType};base64,${imagen.datosBase64}`,
            imagen,
          },
        ]);
      } catch (e) {
        setAviso((e as Error).message);
      }
    }
    // Si suben fotos, el origen por defecto es notas a mano
    if (lista.length) setOrigen("manuscrito");
  }

  async function generar() {
    if (!texto.trim() && fotos.length === 0) return;
    setGenerando(true);
    setAviso("");
    try {
      const config = obtenerConfig();
      const { borrador: b, aviso: av } = await generarActa(
        texto,
        config.claveApiClaude,
        fotos.map((f) => f.imagen),
      );
      if (b) aplicarBorrador(b);
      if (av) setAviso(av);
    } finally {
      setGenerando(false);
    }
  }

  function aplicarBorrador(b: BorradorActa) {
    setConIA(b.generadoCon === "ia");
    setBorrador({
      fecha: b.fecha,
      lugar: b.lugar,
      objeto: b.objeto,
      asistentes: b.asistentes,
      asuntos: b.asuntos,
      proximaReunion: b.proximaReunion,
    });
  }

  function guardar() {
    if (!borrador) return;
    let idObra = obraId;
    if (nuevaObra) {
      if (!obraNombre.trim()) {
        setAviso("Indica el nombre de la obra nueva.");
        return;
      }
      idObra = crearObra({
        nombre: obraNombre.trim(),
        codigo: obraCodigo.trim() || obraNombre.trim().slice(0, 8).toUpperCase(),
        cliente: obraCliente.trim() || "Sin cliente",
      }).id;
    }
    if (!idObra) {
      setAviso("Selecciona una obra o crea una nueva.");
      return;
    }
    const acta: Acta = {
      id: `acta-${Date.now()}`,
      numero: siguienteNumero(idObra),
      obraId: idObra,
      ...borrador,
      origen,
      textoOriginal:
        texto ||
        (fotos.length ? `[${fotos.length} foto(s) de notas manuscritas: ${fotos.map((f) => f.nombre).join(", ")}]` : undefined),
      creadoEl: new Date().toISOString(),
    };
    guardarActa(acta);
    navegar(`/actas/${acta.id}`);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold">Nueva acta</h1>
        <p className="text-sm text-tinta-suave">
          Sube las fotos de tus notas a mano de la reunión —o pega una transcripción o nota— y genera el acta automáticamente.
        </p>
      </header>

      {/* Paso 1: entrada */}
      <div className="tarjeta space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="etiqueta">Origen</label>
            <select className="campo" value={origen} onChange={(e) => setOrigen(e.target.value as OrigenActa)}>
              {(Object.keys(ETIQUETA_ORIGEN) as OrigenActa[]).map((k) => (
                <option key={k} value={k}>
                  {ETIQUETA_ORIGEN[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Obra / proyecto</label>
            {!nuevaObra ? (
              <div className="flex gap-2">
                <select className="campo" value={obraId} onChange={(e) => setObraId(e.target.value)}>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.codigo} — {o.nombre}
                    </option>
                  ))}
                </select>
                <button type="button" className="boton-secundario whitespace-nowrap" onClick={() => setNuevaObra(true)}>
                  + Obra
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input className="campo" placeholder="Nombre de la obra" value={obraNombre} onChange={(e) => setObraNombre(e.target.value)} />
                <div className="flex gap-2">
                  <input className="campo" placeholder="Código corto (p. ej. A-7)" value={obraCodigo} onChange={(e) => setObraCodigo(e.target.value)} />
                  <input className="campo" placeholder="Cliente" value={obraCliente} onChange={(e) => setObraCliente(e.target.value)} />
                </div>
                <button type="button" className="text-xs text-tinta-suave hover:underline" onClick={() => setNuevaObra(false)}>
                  ← Usar obra existente
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fotos de notas manuscritas */}
        <div>
          <label className="etiqueta">Fotos de las notas a mano</label>
          <div
            className="border-2 border-dashed border-borde rounded-acb p-5 text-center cursor-pointer hover:border-primario hover:bg-primario-suave/30 transition"
            onClick={() => entradaArchivo.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              anadirFotos(e.dataTransfer.files);
            }}
          >
            <Camera size={22} className="mx-auto text-tinta-suave mb-2" />
            <p className="text-sm font-medium">Haz clic o arrastra aquí las fotos de tus notas</p>
            <p className="text-xs text-tinta-suave mt-1">
              JPG, PNG o HEIC convertido · varias páginas admitidas · se procesan con IA
            </p>
            <input
              ref={entradaArchivo}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) anadirFotos(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {fotos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {fotos.map((f, i) => (
                <div key={i} className="relative group">
                  <img
                    src={f.miniatura}
                    alt={f.nombre}
                    className="h-24 w-auto rounded-acb border border-borde shadow-acb object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-acento text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                    title="Quitar foto"
                  >
                    <X size={13} />
                  </button>
                  <p className="text-[10px] text-tinta-suave truncate w-24 mt-0.5">{f.nombre}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="etiqueta">
            {fotos.length ? "Texto adicional (opcional)" : "Transcripción o nota"}
          </label>
          <textarea
            className="campo min-h-36 font-mono text-xs leading-relaxed"
            placeholder={
              fotos.length
                ? "Contexto extra para la IA: obra, asistentes que no estén en las notas, aclaraciones..."
                : "Pega aquí la transcripción de la grabación o escribe tu nota.\n\nEjemplo:\nVisita de obra del 10 de junio de 2026 en la caseta de obra.\nAsistentes:\nVicente Ferrer (Director de Obra)\nAlfonso Nidávila (Jefe de Obra)\n\nSe revisó el avance del movimiento de tierras..."
            }
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            className="boton-primario"
            onClick={generar}
            disabled={generando || (!texto.trim() && fotos.length === 0)}
          >
            {generando ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {generando ? "Generando..." : "Generar acta"}
          </button>
          {aviso && <p className="text-xs text-ambar font-medium">{aviso}</p>}
        </div>
      </div>

      {/* Paso 2: borrador editable */}
      {borrador && (
        <div className="tarjeta space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              Borrador del acta
              {conIA && (
                <span className="insignia bg-verde-suave text-verde">
                  <Sparkles size={11} className="mr-1" /> Generado con IA
                </span>
              )}
            </h2>
            <button className="boton-primario" onClick={guardar}>
              <Save size={16} /> Guardar acta
            </button>
          </div>
          <EditorActa datos={borrador} onCambio={setBorrador} />
        </div>
      )}
    </div>
  );
}
