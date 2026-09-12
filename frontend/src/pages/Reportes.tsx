import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Download,
  FileBarChart,
  FileText,
  Mail,
  MessageCircle,
  MessageSquareText,
  Percent,
  RefreshCw,
  Share2,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  obtenerReporteGeneral,
} from "../services/reportesService";

import type {
  ReporteGeneral,
} from "../services/reportesService";

import "../styles/Reportes.css";

const COLORES_RIESGO = [
  "#16a34a",
  "#f59e0b",
  "#dc2626",
];

const COLORES_PLAN = [
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
];

const COLORES_SENTIMIENTO = [
  "#16a34a",
  "#64748b",
  "#dc2626",
];

function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

function formatearPorcentaje(
  valor: number
): string {
  return `${(Number(valor) * 100).toFixed(1)} %`;
}

function formatearFecha(fecha: string): string {
  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fechaConvertida);
}

function obtenerFechaArchivo(): string {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function escaparCsv(
  valor: string | number
): string {
  const texto = String(valor);

  if (
    texto.includes(",") ||
    texto.includes('"') ||
    texto.includes("\n")
  ) {
    return `"${texto.replaceAll('"', '""')}"`;
  }

  return texto;
}

export default function Reportes() {
  const reporteRef =
    useRef<HTMLElement | null>(null);

  const [reporte, setReporte] =
    useState<ReporteGeneral | null>(null);

  const [cargando, setCargando] = useState(true);
  const [exportandoPdf, setExportandoPdf] =
    useState(false);

  const [menuExportar, setMenuExportar] =
    useState(false);

  const [menuCompartir, setMenuCompartir] =
    useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarReporte = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos =
        await obtenerReporteGeneral();

      setReporte(datos);
    } catch (errorCarga) {
      setError(
        obtenerMensajeError(errorCarga)
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarReporte();
  }, [cargarReporte]);

  const evolucionGrafico = useMemo(() => {
    if (!reporte) {
      return [];
    }

    return reporte.evolucion.map((registro) => ({
      ...registro,
      probabilidad_porcentaje: Number(
        (
          registro.probabilidad_promedio * 100
        ).toFixed(1)
      ),
    }));
  }, [reporte]);

  const riesgoDominante = useMemo(() => {
    if (!reporte || reporte.riesgos.length === 0) {
      return null;
    }

    return [...reporte.riesgos].sort(
      (primero, segundo) =>
        segundo.valor - primero.valor
    )[0];
  }, [reporte]);

  const cerrarMenus = () => {
    setMenuExportar(false);
    setMenuCompartir(false);
  };

  const exportarCsv = () => {
    if (!reporte) {
      return;
    }

    const filas: (string | number)[][] = [
      ["REPORTE GENERAL DE IDEATECH"],
      [
        "Fecha de generación",
        formatearFecha(reporte.generado_en),
      ],
      [],
      ["INDICADORES"],
      ["Indicador", "Valor"],
      [
        "Total de clientes",
        reporte.indicadores.total_clientes,
      ],
      [
        "Clientes activos",
        reporte.indicadores.clientes_activos,
      ],
      [
        "Empresas verificadas",
        reporte.indicadores.empresas_verificadas,
      ],
      [
        "Total de predicciones",
        reporte.indicadores.total_predicciones,
      ],
      [
        "Probabilidad promedio",
        formatearPorcentaje(
          reporte.indicadores
            .probabilidad_promedio
        ),
      ],
      [
        "Comentarios procesados",
        reporte.indicadores
          .comentarios_procesados,
      ],
      [],
      ["DISTRIBUCIÓN DE RIESGOS"],
      ["Nivel", "Cantidad"],
      ...reporte.riesgos.map((dato) => [
        dato.nombre,
        dato.valor,
      ]),
      [],
      ["CLIENTES POR PLAN"],
      ["Plan", "Cantidad"],
      ...reporte.planes.map((dato) => [
        dato.nombre,
        dato.valor,
      ]),
      [],
      ["SENTIMIENTOS"],
      ["Sentimiento", "Cantidad"],
      ...reporte.sentimientos.map((dato) => [
        dato.nombre,
        dato.valor,
      ]),
      [],
      ["EVOLUCIÓN MENSUAL"],
      [
        "Mes",
        "Predicciones",
        "Probabilidad promedio",
      ],
      ...reporte.evolucion.map((dato) => [
        dato.mes,
        dato.predicciones,
        formatearPorcentaje(
          dato.probabilidad_promedio
        ),
      ]),
    ];

    const contenido = filas
      .map((fila) =>
        fila.map(escaparCsv).join(",")
      )
      .join("\n");

    const archivo = new Blob(
      [`\uFEFF${contenido}`],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download =
      `reporte-ideatech-${obtenerFechaArchivo()}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);

    cerrarMenus();

    setMensaje(
      "El reporte CSV fue exportado correctamente."
    );
  };

  const crearDocumentoPdf =
    async (): Promise<jsPDF> => {
      if (!reporteRef.current) {
        throw new Error(
          "No se encontró el contenido del reporte."
        );
      }

      const lienzo = await html2canvas(
        reporteRef.current,
        {
          scale: 2,
          useCORS: true,
          backgroundColor: "#f4f7fb",
          logging: false,
          ignoreElements: (
            elemento: Element
          ) =>
            elemento.classList.contains(
              "reportes-no-exportar"
            ),
        }
      );

      const documento = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const margen = 8;

      const anchoPagina =
        documento.internal.pageSize.getWidth();

      const altoPagina =
        documento.internal.pageSize.getHeight();

      const anchoImagen =
        anchoPagina - margen * 2;

      const altoImagen =
        (lienzo.height * anchoImagen) /
        lienzo.width;

      const imagen = lienzo.toDataURL(
        "image/jpeg",
        0.92
      );

      let posicionVertical = margen;
      let alturaRestante = altoImagen;

      documento.addImage(
        imagen,
        "JPEG",
        margen,
        posicionVertical,
        anchoImagen,
        altoImagen,
        undefined,
        "FAST"
      );

      alturaRestante -= altoPagina - margen * 2;

      while (alturaRestante > 0) {
        posicionVertical -=
          altoPagina - margen * 2;

        documento.addPage();

        documento.addImage(
          imagen,
          "JPEG",
          margen,
          posicionVertical,
          anchoImagen,
          altoImagen,
          undefined,
          "FAST"
        );

        alturaRestante -=
          altoPagina - margen * 2;
      }

      return documento;
    };

  const exportarPdf = async () => {
    if (!reporte) {
      return;
    }

    setExportandoPdf(true);
    setError("");
    setMensaje("");
    cerrarMenus();

    try {
      const documento =
        await crearDocumentoPdf();

      documento.save(
        `reporte-ideatech-${obtenerFechaArchivo()}.pdf`
      );

      setMensaje(
        "El reporte PDF fue exportado correctamente."
      );
    } catch (errorPdf) {
      setError(
        "No se pudo crear el PDF: " +
          obtenerMensajeError(errorPdf)
      );
    } finally {
      setExportandoPdf(false);
    }
  };

  const obtenerTextoCompartir = (): string => {
    if (!reporte) {
      return "";
    }

    return [
      "Reporte empresarial de IdeaTech",
      "",
      `Clientes: ${
        reporte.indicadores.total_clientes
      }`,
      `Empresas verificadas: ${
        reporte.indicadores.empresas_verificadas
      }`,
      `Predicciones: ${
        reporte.indicadores.total_predicciones
      }`,
      `Riesgo promedio: ${formatearPorcentaje(
        reporte.indicadores.probabilidad_promedio
      )}`,
      "",
      `Consulta el sistema: ${window.location.origin}`,
    ].join("\n");
  };

  const compartirWhatsApp = () => {
    if (!reporte) {
      return;
    }

    const texto = encodeURIComponent(
      obtenerTextoCompartir()
    );

    window.open(
      `https://wa.me/?text=${texto}`,
      "_blank",
      "noopener,noreferrer"
    );

    cerrarMenus();
  };

  const compartirGmail = () => {
    if (!reporte) {
      return;
    }

    const asunto = encodeURIComponent(
      "Reporte empresarial de IdeaTech"
    );

    const cuerpo = encodeURIComponent(
      obtenerTextoCompartir()
    );

    window.open(
      "https://mail.google.com/mail/" +
        `?view=cm&fs=1&su=${asunto}&body=${cuerpo}`,
      "_blank",
      "noopener,noreferrer"
    );

    cerrarMenus();
  };

  const compartirOtrasAplicaciones =
    async () => {
      if (!reporte) {
        return;
      }

      cerrarMenus();
      setExportandoPdf(true);
      setError("");
      setMensaje("");

      try {
        const documento =
          await crearDocumentoPdf();

        const archivoPdf = new File(
          [
            documento.output(
              "blob"
            ),
          ],
          `reporte-ideatech-${obtenerFechaArchivo()}.pdf`,
          {
            type: "application/pdf",
          }
        );

        if (!navigator.share) {
          documento.save(archivoPdf.name);

          throw new Error(
            "Este navegador no permite compartir " +
              "directamente. El PDF fue descargado " +
              "para que puedas enviarlo manualmente."
          );
        }

        const datosCompartir: ShareData = {
          title:
            "Reporte empresarial de IdeaTech",
          text:
            "Reporte de clientes, predicciones " +
            "y análisis empresarial.",
          url: window.location.origin,
        };

        if (
          navigator.canShare?.({
            files: [archivoPdf],
          })
        ) {
          datosCompartir.files = [archivoPdf];
        }

        await navigator.share(datosCompartir);

        setMensaje(
          "El reporte fue compartido correctamente."
        );
      } catch (errorCompartir) {
        if (
          errorCompartir instanceof DOMException &&
          errorCompartir.name === "AbortError"
        ) {
          return;
        }

        setError(
          obtenerMensajeError(errorCompartir)
        );
      } finally {
        setExportandoPdf(false);
      }
    };

  if (cargando && !reporte) {
    return (
      <section className="reportes-cargando">
        <RefreshCw
          size={40}
          className="girando"
        />

        <h2>Generando reporte</h2>

        <p>
          Consultando información de Supabase...
        </p>
      </section>
    );
  }

  return (
    <section
      className="reportes-pagina"
      ref={reporteRef}
    >
      <header className="reportes-encabezado">
        <div>
          <span className="reportes-etiqueta">
            Inteligencia empresarial
          </span>

          <h1>Reportes y analítica</h1>

          <p>
            Consulta los indicadores de clientes,
            predicciones y comentarios de IdeaTech.
          </p>
        </div>

        <div className="reportes-acciones reportes-no-exportar">
          <button
            type="button"
            className="reportes-boton-secundario"
            onClick={() => void cargarReporte()}
            disabled={cargando || exportandoPdf}
          >
            <RefreshCw
              size={18}
              className={
                cargando ? "girando" : ""
              }
            />

            Actualizar
          </button>

          <div className="reportes-menu-contenedor">
            <button
              type="button"
              className="reportes-boton-principal"
              onClick={() => {
                setMenuExportar(
                  (estado) => !estado
                );
                setMenuCompartir(false);
              }}
              disabled={!reporte || exportandoPdf}
            >
              {exportandoPdf ? (
                <RefreshCw
                  size={18}
                  className="girando"
                />
              ) : (
                <Download size={18} />
              )}

              Exportar
              <ChevronDown size={16} />
            </button>

            {menuExportar && (
              <div className="reportes-menu">
                <button
                  type="button"
                  onClick={exportarCsv}
                >
                  <FileBarChart size={18} />

                  <span>
                    <strong>Archivo CSV</strong>
                    <small>
                      Datos para Excel
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void exportarPdf()
                  }
                >
                  <FileText size={18} />

                  <span>
                    <strong>Documento PDF</strong>
                    <small>
                      Indicadores y gráficos
                    </small>
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="reportes-menu-contenedor">
            <button
              type="button"
              className="reportes-boton-compartir"
              onClick={() => {
                setMenuCompartir(
                  (estado) => !estado
                );
                setMenuExportar(false);
              }}
              disabled={!reporte || exportandoPdf}
            >
              <Share2 size={18} />
              Compartir
              <ChevronDown size={16} />
            </button>

            {menuCompartir && (
              <div className="reportes-menu compartir">
                <button
                  type="button"
                  onClick={compartirWhatsApp}
                >
                  <MessageCircle size={18} />

                  <span>
                    <strong>WhatsApp</strong>
                    <small>
                      Compartir resumen
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={compartirGmail}
                >
                  <Mail size={18} />

                  <span>
                    <strong>Gmail</strong>
                    <small>
                      Redactar un correo
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void compartirOtrasAplicaciones()
                  }
                >
                  <Share2 size={18} />

                  <span>
                    <strong>Otras aplicaciones</strong>
                    <small>
                      Compartir PDF o enlace
                    </small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="reportes-alerta error reportes-no-exportar">
          <XCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {mensaje && (
        <div className="reportes-alerta exito reportes-no-exportar">
          <CheckCircle2 size={20} />
          <span>{mensaje}</span>

          <button
            type="button"
            onClick={() => setMensaje("")}
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      {reporte && (
        <>
          <div className="reportes-indicadores">
            <article>
              <div className="reportes-icono azul">
                <Users size={23} />
              </div>

              <div>
                <span>Total de clientes</span>
                <strong>
                  {reporte.indicadores.total_clientes}
                </strong>
                <small>
                  {reporte.indicadores.clientes_activos}{" "}
                  clientes activos
                </small>
              </div>
            </article>

            <article>
              <div className="reportes-icono verde">
                <ShieldCheck size={23} />
              </div>

              <div>
                <span>Empresas verificadas</span>
                <strong>
                  {
                    reporte.indicadores
                      .empresas_verificadas
                  }
                </strong>
                <small>
                  Habilitadas para análisis
                </small>
              </div>
            </article>

            <article>
              <div className="reportes-icono morado">
                <BrainCircuit size={23} />
              </div>

              <div>
                <span>Predicciones</span>
                <strong>
                  {
                    reporte.indicadores
                      .total_predicciones
                  }
                </strong>
                <small>
                  Resultados almacenados
                </small>
              </div>
            </article>

            <article>
              <div className="reportes-icono naranja">
                <Percent size={23} />
              </div>

              <div>
                <span>Riesgo promedio</span>
                <strong>
                  {formatearPorcentaje(
                    reporte.indicadores
                      .probabilidad_promedio
                  )}
                </strong>
                <small>
                  Probabilidad de cancelación
                </small>
              </div>
            </article>

            <article>
              <div className="reportes-icono celeste">
                <MessageSquareText size={23} />
              </div>

              <div>
                <span>Comentarios analizados</span>
                <strong>
                  {
                    reporte.indicadores
                      .comentarios_procesados
                  }
                </strong>
                <small>
                  Procesados mediante NLP
                </small>
              </div>
            </article>
          </div>

          <div className="reportes-grid">
            <article className="reportes-panel">
              <div className="reportes-panel-header">
                <div>
                  <span>Machine Learning</span>
                  <h2>Distribución de riesgos</h2>
                </div>

                <BrainCircuit size={22} />
              </div>

              {reporte.indicadores
                .total_predicciones === 0 ? (
                <div className="reportes-vacio">
                  <FileBarChart size={34} />
                  <p>
                    Todavía no existen predicciones.
                  </p>
                </div>
              ) : (
                <div className="reportes-grafico">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={reporte.riesgos}
                        dataKey="valor"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={4}
                        label
                      >
                        {reporte.riesgos.map(
                          (dato, indice) => (
                            <Cell
                              key={dato.nombre}
                              fill={
                                COLORES_RIESGO[
                                  indice %
                                    COLORES_RIESGO.length
                                ]
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            <article className="reportes-panel">
              <div className="reportes-panel-header">
                <div>
                  <span>Clientes</span>
                  <h2>Distribución por plan</h2>
                </div>

                <BarChart3 size={22} />
              </div>

              <div className="reportes-grafico">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={reporte.planes}
                    margin={{
                      top: 15,
                      right: 10,
                      bottom: 5,
                      left: -20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="nombre"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="valor"
                      name="Clientes"
                      radius={[8, 8, 0, 0]}
                    >
                      {reporte.planes.map(
                        (dato, indice) => (
                          <Cell
                            key={dato.nombre}
                            fill={
                              COLORES_PLAN[
                                indice %
                                  COLORES_PLAN.length
                              ]
                            }
                          />
                        )
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="reportes-panel">
              <div className="reportes-panel-header">
                <div>
                  <span>Procesamiento NLP</span>
                  <h2>Sentimiento de clientes</h2>
                </div>

                <MessageSquareText size={22} />
              </div>

              {reporte.indicadores
                .comentarios_procesados === 0 ? (
                <div className="reportes-vacio">
                  <MessageSquareText size={34} />
                  <p>
                    No existen comentarios analizados.
                  </p>
                </div>
              ) : (
                <div className="reportes-grafico">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={reporte.sentimientos}
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 20,
                        bottom: 5,
                        left: 15,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={75}
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip />

                      <Bar
                        dataKey="valor"
                        name="Comentarios"
                        radius={[0, 8, 8, 0]}
                      >
                        {reporte.sentimientos.map(
                          (dato, indice) => (
                            <Cell
                              key={dato.nombre}
                              fill={
                                COLORES_SENTIMIENTO[
                                  indice %
                                    COLORES_SENTIMIENTO.length
                                ]
                              }
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            <article className="reportes-panel">
              <div className="reportes-panel-header">
                <div>
                  <span>Últimos seis meses</span>
                  <h2>Evolución de predicciones</h2>
                </div>

                <FileBarChart size={22} />
              </div>

              <div className="reportes-grafico">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={evolucionGrafico}
                    margin={{
                      top: 15,
                      right: 15,
                      bottom: 5,
                      left: -15,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      yAxisId="cantidad"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      yAxisId="porcentaje"
                      orientation="right"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />
                    <Legend />

                    <Line
                      yAxisId="cantidad"
                      type="monotone"
                      dataKey="predicciones"
                      name="Predicciones"
                      stroke="#2563eb"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />

                    <Line
                      yAxisId="porcentaje"
                      type="monotone"
                      dataKey="probabilidad_porcentaje"
                      name="Riesgo promedio (%)"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>

          <article className="reportes-conclusion">
            <div>
              <AlertTriangle size={24} />
            </div>

            <section>
              <span>Resumen automático</span>
              <h2>Lectura general del reporte</h2>

              {reporte.indicadores
                .total_predicciones === 0 ? (
                <p>
                  Todavía no existen suficientes
                  predicciones para elaborar una
                  conclusión de riesgo.
                </p>
              ) : (
                <p>
                  El nivel con más resultados es{" "}
                  <strong>
                    {riesgoDominante?.nombre}
                  </strong>
                  , con{" "}
                  <strong>
                    {riesgoDominante?.valor}
                  </strong>{" "}
                  predicciones. La probabilidad promedio
                  de cancelación es{" "}
                  <strong>
                    {formatearPorcentaje(
                      reporte.indicadores
                        .probabilidad_promedio
                    )}
                  </strong>
                  .
                </p>
              )}

              <small>
                Reporte generado el{" "}
                {formatearFecha(
                  reporte.generado_en
                )}
              </small>
            </section>
          </article>
        </>
      )}
    </section>
  );
}