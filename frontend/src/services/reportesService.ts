import { supabase } from "../lib/supabase";

export interface IndicadoresReporte {
  total_clientes: number;
  clientes_activos: number;
  empresas_verificadas: number;
  total_predicciones: number;
  probabilidad_promedio: number;
  comentarios_procesados: number;
}

export interface DatoGrafico {
  nombre: string;
  valor: number;
}

export interface DatoEvolucion {
  clave: string;
  mes: string;
  predicciones: number;
  probabilidad_promedio: number;
}

export interface ReporteGeneral {
  indicadores: IndicadoresReporte;
  riesgos: DatoGrafico[];
  planes: DatoGrafico[];
  sentimientos: DatoGrafico[];
  evolucion: DatoEvolucion[];
  generado_en: string;
}

interface ClienteReporte {
  id: number;
  tipo_plan: string;
  estado: string;
  estado_datos: string;
}

interface ComentarioReporte {
  sentimiento:
    | "positivo"
    | "neutral"
    | "negativo"
    | null;
  procesado: boolean;
}

interface PrediccionReporte {
  nivel_riesgo: "bajo" | "medio" | "alto";
  probabilidad_cancelacion: number | string;
  fecha_prediccion: string;
}

function capitalizar(texto: string): string {
  if (!texto) {
    return "Sin definir";
  }

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1).replaceAll("_", " ")
  );
}

function crearDistribucion(
  valores: string[],
  opciones: string[]
): DatoGrafico[] {
  return opciones.map((opcion) => ({
    nombre: capitalizar(opcion),
    valor: valores.filter(
      (valor) => valor === opcion
    ).length,
  }));
}

function obtenerUltimosMeses(
  cantidad: number
): {
  clave: string;
  etiqueta: string;
}[] {
  const meses: {
    clave: string;
    etiqueta: string;
  }[] = [];

  const fechaActual = new Date();

  for (
    let desplazamiento = cantidad - 1;
    desplazamiento >= 0;
    desplazamiento -= 1
  ) {
    const fecha = new Date(
      fechaActual.getFullYear(),
      fechaActual.getMonth() - desplazamiento,
      1
    );

    const clave = [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(
        2,
        "0"
      ),
    ].join("-");

    const etiqueta = new Intl.DateTimeFormat(
      "es-PE",
      {
        month: "short",
        year: "2-digit",
      }
    )
      .format(fecha)
      .replace(".", "");

    meses.push({
      clave,
      etiqueta,
    });
  }

  return meses;
}

function calcularEvolucion(
  predicciones: PrediccionReporte[]
): DatoEvolucion[] {
  const meses = obtenerUltimosMeses(6);

  return meses.map(({ clave, etiqueta }) => {
    const prediccionesMes = predicciones.filter(
      (prediccion) => {
        const fecha = new Date(
          prediccion.fecha_prediccion
        );

        if (Number.isNaN(fecha.getTime())) {
          return false;
        }

        const clavePrediccion = [
          fecha.getFullYear(),
          String(fecha.getMonth() + 1).padStart(
            2,
            "0"
          ),
        ].join("-");

        return clavePrediccion === clave;
      }
    );

    const sumaProbabilidades =
      prediccionesMes.reduce(
        (acumulado, prediccion) =>
          acumulado +
          Number(
            prediccion.probabilidad_cancelacion
          ),
        0
      );

    const probabilidadPromedio =
      prediccionesMes.length > 0
        ? sumaProbabilidades /
          prediccionesMes.length
        : 0;

    return {
      clave,
      mes: capitalizar(etiqueta),
      predicciones: prediccionesMes.length,
      probabilidad_promedio:
        probabilidadPromedio,
    };
  });
}

export async function obtenerReporteGeneral(): Promise<ReporteGeneral> {
  const [
    respuestaClientes,
    respuestaComentarios,
    respuestaPredicciones,
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, tipo_plan, estado, estado_datos"
      ),

    supabase
      .from("comentarios")
      .select("sentimiento, procesado"),

    supabase
      .from("predicciones")
      .select(
        "nivel_riesgo, probabilidad_cancelacion, fecha_prediccion"
      )
      .order("fecha_prediccion", {
        ascending: true,
      }),
  ]);

  const primerError =
    respuestaClientes.error ||
    respuestaComentarios.error ||
    respuestaPredicciones.error;

  if (primerError) {
    throw new Error(
      "No se pudo generar el reporte: " +
        primerError.message
    );
  }

  const clientes =
    (respuestaClientes.data ??
      []) as ClienteReporte[];

  const comentarios =
    (respuestaComentarios.data ??
      []) as ComentarioReporte[];

  const predicciones =
    (respuestaPredicciones.data ??
      []) as PrediccionReporte[];

  const clientesActivos = clientes.filter(
    (cliente) => cliente.estado === "activo"
  ).length;

  const empresasVerificadas = clientes.filter(
    (cliente) =>
      cliente.estado_datos === "verificado"
  ).length;

  const comentariosProcesados =
    comentarios.filter(
      (comentario) => comentario.procesado
    ).length;

  const sumaProbabilidades =
    predicciones.reduce(
      (acumulado, prediccion) =>
        acumulado +
        Number(
          prediccion.probabilidad_cancelacion
        ),
      0
    );

  const probabilidadPromedio =
    predicciones.length > 0
      ? sumaProbabilidades /
        predicciones.length
      : 0;

  const riesgos = crearDistribucion(
    predicciones.map(
      (prediccion) => prediccion.nivel_riesgo
    ),
    ["bajo", "medio", "alto"]
  );

  const planesDisponibles = [
    "basico",
    "profesional",
    "empresarial",
    "personalizado",
  ];

  const planes = crearDistribucion(
    clientes.map(
      (cliente) => cliente.tipo_plan
    ),
    planesDisponibles
  );

  const sentimientos = crearDistribucion(
    comentarios
      .filter(
        (comentario) =>
          comentario.procesado &&
          comentario.sentimiento !== null
      )
      .map(
        (comentario) =>
          comentario.sentimiento as string
      ),
    ["positivo", "neutral", "negativo"]
  );

  return {
    indicadores: {
      total_clientes: clientes.length,
      clientes_activos: clientesActivos,
      empresas_verificadas:
        empresasVerificadas,
      total_predicciones:
        predicciones.length,
      probabilidad_promedio:
        probabilidadPromedio,
      comentarios_procesados:
        comentariosProcesados,
    },
    riesgos,
    planes,
    sentimientos,
    evolucion:
      calcularEvolucion(predicciones),
    generado_en: new Date().toISOString(),
  };
}