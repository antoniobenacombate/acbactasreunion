// Gráficas ligeras en SVG/CSS, sin librerías externas

interface DatoBarra {
  etiqueta: string;
  valor: number;
  color?: string;
}

const PALETA = [
  "hsl(220 76% 43%)",
  "hsl(32 91% 44%)",
  "hsl(145 64% 35%)",
  "hsl(0 73% 47%)",
  "hsl(260 50% 50%)",
  "hsl(190 70% 38%)",
];

export function BarrasHorizontales({ datos }: { datos: DatoBarra[] }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="space-y-3">
      {datos.map((d, i) => (
        <div key={d.etiqueta}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium truncate pr-2">{d.etiqueta}</span>
            <span className="text-tinta-suave font-semibold">{d.valor}</span>
          </div>
          <div className="h-2.5 bg-fondo rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(d.valor / max) * 100}%`,
                background: d.color ?? PALETA[i % PALETA.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ datos }: { datos: DatoBarra[] }) {
  const total = datos.reduce((s, d) => s + d.valor, 0) || 1;
  const radio = 42;
  const circ = 2 * Math.PI * radio;
  let acumulado = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 110 110" className="w-32 h-32 shrink-0">
        <circle cx="55" cy="55" r={radio} fill="none" stroke="hsl(240 12% 92%)" strokeWidth="14" />
        {datos.map((d, i) => {
          const frac = d.valor / total;
          const desfase = circ * (1 - acumulado);
          acumulado += frac;
          return (
            <circle
              key={d.etiqueta}
              cx="55"
              cy="55"
              r={radio}
              fill="none"
              stroke={d.color ?? PALETA[i % PALETA.length]}
              strokeWidth="14"
              strokeDasharray={`${circ * frac} ${circ * (1 - frac)}`}
              strokeDashoffset={desfase}
              transform="rotate(-90 55 55)"
            />
          );
        })}
        <text x="55" y="60" textAnchor="middle" className="font-bold" fontSize="20" fill="hsl(230 30% 14%)">
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs">
        {datos.map((d, i) => (
          <li key={d.etiqueta} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: d.color ?? PALETA[i % PALETA.length] }}
            />
            <span className="truncate">{d.etiqueta}</span>
            <span className="text-tinta-suave font-semibold ml-auto pl-2">{d.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ColumnasMensuales({ datos }: { datos: DatoBarra[] }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {datos.map((d) => (
        <div key={d.etiqueta} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-tinta-suave">{d.valor || ""}</span>
          <div
            className="w-full rounded-t bg-primario/80 hover:bg-primario transition-all"
            style={{ height: `${(d.valor / max) * 100}%`, minHeight: d.valor ? 6 : 2 }}
          />
          <span className="text-[10px] text-tinta-suave">{d.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}
