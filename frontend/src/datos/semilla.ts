import type { Acta, Obra } from "../tipos";

// Datos de ejemplo para ver la aplicación en funcionamiento.
// Se cargan la primera vez; después todo se guarda en el navegador.

export const OBRAS_SEMILLA: Obra[] = [
  {
    id: "obra-a7",
    codigo: "A-7 VG",
    nombre: "Autovía del Mediterráneo A-7. Tramo Vera–Garrucha",
    cliente: "Ministerio de Transportes y Movilidad Sostenible",
  },
  {
    id: "obra-cv300",
    codigo: "CV-300",
    nombre: "Variante de Beniaján CV-300",
    cliente: "Consejería de Fomento e Infraestructuras",
  },
  {
    id: "obra-n340",
    codigo: "N-340",
    nombre: "Rehabilitación de firme N-340. P.K. 580 a 595",
    cliente: "Demarcación de Carreteras del Estado en Murcia",
  },
];

const ASISTENTES_A7 = [
  { nombre: "Vicente Ferrer", cargo: "Ingeniero Director", organizacion: "DO" as const },
  { nombre: "Alfonso Nidávila", cargo: "Jefe de Obra", organizacion: "CON" as const },
  { nombre: "Antonio Benavides", cargo: "U.T.E. Ing63 Grusamar Cainur", organizacion: "AT" as const },
];

export const ACTAS_SEMILLA: Acta[] = [
  {
    id: "acta-001",
    numero: 1,
    obraId: "obra-a7",
    fecha: "2025-09-18",
    lugar: "Demarcación de Carreteras del Estado en Andalucía Oriental",
    objeto: "Planificación de obra",
    asistentes: ASISTENTES_A7,
    asuntos: [
      {
        titulo: "Plan de obra y programa de trabajos",
        desarrollo:
          "El contratista presenta el programa de trabajos actualizado. Se detecta retraso de 3 semanas en el inicio del movimiento de tierras por la falta de disponibilidad de los terrenos del enlace 2. La DO solicita propuesta de recuperación de plazo antes del 30 de septiembre.",
        accionPor: ["CON"],
      },
      {
        titulo: "Expropiaciones pendientes",
        desarrollo:
          "Quedan pendientes 4 fincas en el término municipal de Antas. La Demarcación informa de que el acta previa está prevista para la primera semana de octubre. La AT preparará el plano de fincas afectadas actualizado.",
        accionPor: ["DO", "AT"],
      },
      {
        titulo: "Plan de aseguramiento de la calidad",
        desarrollo:
          "Se aprueba el PAC presentado con observaciones menores. El contratista entregará la versión corregida en una semana.",
        accionPor: ["CON"],
      },
    ],
    proximaReunion: "2025-10-16",
    origen: "transcripcion",
    creadoEl: "2025-09-18T12:30:00",
  },
  {
    id: "acta-002",
    numero: 2,
    obraId: "obra-a7",
    fecha: "2025-10-16",
    lugar: "Caseta de obra. P.K. 537+200",
    objeto: "Seguimiento mensual. Movimiento de tierras",
    asistentes: ASISTENTES_A7,
    asuntos: [
      {
        titulo: "Avance del movimiento de tierras",
        desarrollo:
          "Ejecutado el 18% del desmonte D-3. El rendimiento actual es de 4.500 m³/día, inferior al previsto. El contratista incorpora un segundo equipo de carga a partir del lunes.",
        accionPor: ["CON"],
      },
      {
        titulo: "Resultados de ensayos de compactación",
        desarrollo:
          "La AT presenta el informe mensual de ensayos. Dos lotes del terraplén T-2 no alcanzan el 98% del Próctor de referencia. Se ordena el recompactado y nuevo ensayo de ambos lotes.",
        accionPor: ["AT", "CON"],
      },
      {
        titulo: "Desvío provisional del camino de servicio",
        desarrollo:
          "Se aprueba el desvío propuesto con señalización conforme a la 8.3-IC. La DO comunicará la afección al Ayuntamiento de Vera.",
        accionPor: ["DO"],
      },
    ],
    proximaReunion: "2025-11-20",
    origen: "audio",
    creadoEl: "2025-10-16T13:05:00",
  },
  {
    id: "acta-003",
    numero: 3,
    obraId: "obra-a7",
    fecha: "2025-11-20",
    lugar: "Caseta de obra. P.K. 537+200",
    objeto: "Estructuras: viaducto sobre el río Antas",
    asistentes: [
      ...ASISTENTES_A7,
      { nombre: "Lucía Marín", cargo: "Calculista de estructuras", organizacion: "CON" as const },
    ],
    asuntos: [
      {
        titulo: "Cimentación de pilas P-3 y P-4",
        desarrollo:
          "Los resultados de los ensayos de integridad de pilotes (CSL) son correctos en P-3. En P-4 se detecta una anomalía en el pilote 2; se realizará extracción de testigo para verificación.",
        accionPor: ["CON", "AT"],
      },
      {
        titulo: "Procedimiento de cimbra del tablero",
        desarrollo:
          "El contratista presenta el proyecto de cimbra autoportante. La DO solicita el visado del proyecto y el plan de montaje firmado por técnico competente antes de autorizar el inicio.",
        accionPor: ["CON"],
      },
      {
        titulo: "Control geométrico",
        desarrollo:
          "La AT establecerá las bases de replanteo auxiliares en ambos estribos y entregará la red observada antes del hormigonado del estribo E-1.",
        accionPor: ["AT"],
      },
    ],
    proximaReunion: "2025-12-18",
    origen: "transcripcion",
    creadoEl: "2025-11-20T14:00:00",
  },
  {
    id: "acta-004",
    numero: 1,
    obraId: "obra-cv300",
    fecha: "2026-01-12",
    lugar: "Oficinas de la Consejería. Murcia",
    objeto: "Acta de replanteo y arranque de obra",
    asistentes: [
      { nombre: "Carmen Soler", cargo: "Directora de Obra", organizacion: "DO" },
      { nombre: "Javier Peñalver", cargo: "Jefe de Obra", organizacion: "CON" },
      { nombre: "Antonio Benavides", cargo: "Asistencia Técnica", organizacion: "AT" },
    ],
    asuntos: [
      {
        titulo: "Comprobación del replanteo",
        desarrollo:
          "Se firma el acta de comprobación de replanteo sin reservas. El plazo de ejecución (14 meses) comienza a contar desde el día de hoy.",
        accionPor: ["DO"],
      },
      {
        titulo: "Servicios afectados",
        desarrollo:
          "Identificada una línea de media tensión de Iberdrola no recogida en proyecto, en el cruce con el camino del Reguerón. El contratista solicitará el desvío y la AT valorará la afección al programa.",
        accionPor: ["CON", "AT"],
      },
      {
        titulo: "Plan de seguridad y salud",
        desarrollo:
          "Aprobado por el coordinador de seguridad y salud con fecha 09-01-2026. Se entrega copia al contratista y se abre el libro de incidencias.",
        accionPor: ["CON"],
      },
    ],
    proximaReunion: "2026-02-09",
    origen: "manuscrito",
    creadoEl: "2026-01-12T11:20:00",
  },
  {
    id: "acta-005",
    numero: 2,
    obraId: "obra-cv300",
    fecha: "2026-02-09",
    lugar: "Caseta de obra. Beniaján",
    objeto: "Seguimiento: desvíos provisionales y servicios afectados",
    asistentes: [
      { nombre: "Carmen Soler", cargo: "Directora de Obra", organizacion: "DO" },
      { nombre: "Javier Peñalver", cargo: "Jefe de Obra", organizacion: "CON" },
      { nombre: "Antonio Benavides", cargo: "Asistencia Técnica", organizacion: "AT" },
    ],
    asuntos: [
      {
        titulo: "Desvío de tráfico fase 1",
        desarrollo:
          "Se aprueba el desvío de la fase 1 con puesta en servicio el 17 de febrero. El contratista presentará el aviso a los vecinos y la cartelería con 5 días de antelación.",
        accionPor: ["CON"],
      },
      {
        titulo: "Línea de media tensión",
        desarrollo:
          "Iberdrola estima 10 semanas para el desvío. Se reordena el programa para adelantar la obra de drenaje transversal ODT-3, no afectada por la línea.",
        accionPor: ["CON", "DO"],
      },
      {
        titulo: "Certificación nº 1",
        desarrollo:
          "Revisada la relación valorada de enero. La AT emite informe favorable con una corrección en la medición del desbroce.",
        accionPor: ["AT"],
      },
    ],
    proximaReunion: "2026-03-09",
    origen: "transcripcion",
    creadoEl: "2026-02-09T12:45:00",
  },
  {
    id: "acta-006",
    numero: 1,
    obraId: "obra-n340",
    fecha: "2026-05-05",
    lugar: "Demarcación de Carreteras del Estado en Murcia",
    objeto: "Coordinación de fresado y extendido nocturno",
    asistentes: [
      { nombre: "Rafael Ortuño", cargo: "Director de Obra", organizacion: "DO" },
      { nombre: "Sergio Ballesta", cargo: "Jefe de Obra", organizacion: "CON" },
      { nombre: "David López", cargo: "Asistencia Técnica", organizacion: "AT" },
    ],
    asuntos: [
      {
        titulo: "Plan de trabajos nocturnos",
        desarrollo:
          "Los trabajos de fresado y extendido se realizarán en horario nocturno de 22:00 a 06:00, de domingo a jueves. El contratista presenta el plan de fases por carriles que se aprueba sin observaciones.",
        accionPor: ["CON"],
      },
      {
        titulo: "Fórmula de trabajo de la mezcla AC22",
        desarrollo:
          "Aprobada la fórmula de trabajo de la AC22 bin S con betún 50/70. La AT realizará el control de temperatura y densidades en cada jornada de extendido.",
        accionPor: ["AT"],
      },
      {
        titulo: "Señalización de obras",
        desarrollo:
          "Se recuerda la obligación de retirar la señalización provisional al finalizar cada jornada. La DO realizará inspecciones aleatorias de madrugada.",
        accionPor: ["CON", "DO"],
      },
    ],
    proximaReunion: "2026-06-02",
    origen: "audio",
    creadoEl: "2026-05-05T10:10:00",
  },
];
