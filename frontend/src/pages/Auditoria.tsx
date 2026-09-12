import {
  Activity,
  Braces,
  CalendarDays,
  Database,
  Download,
  Eye,
  FileClock,
  Filter,
  PencilLine,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  calcularResumenAuditoria,
  listarAuditoria,
  obtenerNombreAccion,
  obtenerNombreTabla,
} from "../services/auditoriaService";

import type {
  AuditoriaConUsuario,
} from "../services/auditoriaService";

import "../styles/Auditoria.css";

function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

function formatearFecha(fecha: string): string {
  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(fechaConvertida);
}

function formatearJson(
  datos: Record<string, unknown> | null
): string {
  if (!datos) {
    return "No hay información disponible.";
  }

  return JSON.stringify(datos, null, 2);
}

function obtenerInicial(
  nombre: string
): string {
  return (
    nombre.trim().charAt(0).toUpperCase() ||
    "S"
  );
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

export default function Auditoria() {
  const [registros, setRegistros] = useState<
    AuditoriaConUsuario[]
  >([]);

  const [registroSeleccionado, setRegistroSeleccionado] =
    useState<AuditoriaConUsuario | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroAccion, setFiltroAccion] =
    useState("todas");
  const [filtroTabla, setFiltroTabla] =
    useState("todas");
  const [filtroFecha, setFiltroFecha] =
    useState("");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarRegistros = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await listarAuditoria();
      setRegistros(datos);
    } catch (errorCarga) {
      setError(
        obtenerMensajeError(errorCarga)
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarRegistros();
  }, [cargarRegistros]);

  const resumen = useMemo(
    () => calcularResumenAuditoria(registros),
    [registros]
  );

  const tablasDisponibles = useMemo(() => {
    return [
      ...new Set(
        registros
          .map(
            (registro) =>
              registro.tabla_afectada
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    return registros.filter((registro) => {
      const contenido = [
        registro.usuario?.nombre_completo,
        registro.usuario?.correo,
        registro.usuario?.rol,
        registro.tabla_afectada,
        registro.registro_id,
        registro.accion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const coincideBusqueda =
        !texto || contenido.includes(texto);

      const coincideAccion =
        filtroAccion === "todas" ||
        registro.accion === filtroAccion;

      const coincideTabla =
        filtroTabla === "todas" ||
        registro.tabla_afectada ===
          filtroTabla;

      const coincideFecha =
        !filtroFecha ||
        registro.fecha_accion.startsWith(
          filtroFecha
        );

      return (
        coincideBusqueda &&
        coincideAccion &&
        coincideTabla &&
        coincideFecha
      );
    });
  }, [
    busqueda,
    filtroAccion,
    filtroFecha,
    filtroTabla,
    registros,
  ]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroAccion("todas");
    setFiltroTabla("todas");
    setFiltroFecha("");
  };

  const exportarCsv = () => {
    const filas: (string | number)[][] = [
      [
        "ID",
        "Fecha",
        "Usuario",
        "Correo",
        "Rol",
        "Tabla",
        "Registro",
        "Acción",
        "Datos anteriores",
        "Datos nuevos",
      ],
      ...registrosFiltrados.map((registro) => [
        registro.id,
        formatearFecha(
          registro.fecha_accion
        ),
        registro.usuario?.nombre_completo ??
          "Sistema",
        registro.usuario?.correo ?? "",
        registro.usuario?.rol ?? "",
        obtenerNombreTabla(
          registro.tabla_afectada
        ),
        registro.registro_id ?? "",
        registro.accion,
        registro.datos_anteriores
          ? JSON.stringify(
              registro.datos_anteriores
            )
          : "",
        registro.datos_nuevos
          ? JSON.stringify(
              registro.datos_nuevos
            )
          : "",
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
      `auditoria-ideatech-${
        new Date().toISOString().split("T")[0]
      }.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <section className="auditoria-pagina">
      <header className="auditoria-encabezado">
        <div>
          <span className="auditoria-etiqueta">
            Seguridad y trazabilidad
          </span>

          <h1>Auditoría del sistema</h1>

          <p>
            Consulta las operaciones realizadas sobre
            los datos empresariales de IdeaTech.
          </p>
        </div>

        <div className="auditoria-acciones-superiores">
          <button
            type="button"
            className="auditoria-actualizar"
            onClick={() =>
              void cargarRegistros()
            }
            disabled={cargando}
          >
            <RefreshCw
              size={18}
              className={
                cargando ? "girando" : ""
              }
            />

            Actualizar
          </button>

          <button
            type="button"
            className="auditoria-exportar"
            onClick={exportarCsv}
            disabled={
              cargando ||
              registrosFiltrados.length === 0
            }
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="auditoria-alerta error">
          <XCircle size={20} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Cerrar error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="auditoria-resumen">
        <article>
          <div className="azul">
            <FileClock size={22} />
          </div>

          <span>Total de operaciones</span>
          <strong>{resumen.total}</strong>
        </article>

        <article>
          <div className="verde">
            <PlusCircle size={22} />
          </div>

          <span>Registros creados</span>
          <strong>{resumen.inserciones}</strong>
        </article>

        <article>
          <div className="naranja">
            <PencilLine size={22} />
          </div>

          <span>Actualizaciones</span>
          <strong>
            {resumen.actualizaciones}
          </strong>
        </article>

        <article>
          <div className="rojo">
            <Trash2 size={22} />
          </div>

          <span>Eliminaciones</span>
          <strong>{resumen.eliminaciones}</strong>
        </article>

        <article>
          <div className="morado">
            <UsersRound size={22} />
          </div>

          <span>Usuarios participantes</span>
          <strong>
            {resumen.usuariosParticipantes}
          </strong>
        </article>
      </div>

      <div className="auditoria-panel">
        <div className="auditoria-herramientas">
          <label className="auditoria-buscador">
            <Search size={18} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar usuario, tabla o registro"
            />
          </label>

          <div className="auditoria-filtros">
            <label>
              <Filter size={16} />

              <select
                value={filtroAccion}
                onChange={(evento) =>
                  setFiltroAccion(
                    evento.target.value
                  )
                }
                aria-label="Filtrar por acción"
              >
                <option value="todas">
                  Todas las acciones
                </option>
                <option value="INSERT">
                  Registros creados
                </option>
                <option value="UPDATE">
                  Actualizaciones
                </option>
                <option value="DELETE">
                  Eliminaciones
                </option>
              </select>
            </label>

            <select
              value={filtroTabla}
              onChange={(evento) =>
                setFiltroTabla(
                  evento.target.value
                )
              }
              aria-label="Filtrar por tabla"
            >
              <option value="todas">
                Todas las tablas
              </option>

              {tablasDisponibles.map((tabla) => (
                <option
                  key={tabla}
                  value={tabla}
                >
                  {obtenerNombreTabla(tabla)}
                </option>
              ))}
            </select>

            <label className="auditoria-fecha-filtro">
              <CalendarDays size={16} />

              <input
                type="date"
                value={filtroFecha}
                onChange={(evento) =>
                  setFiltroFecha(
                    evento.target.value
                  )
                }
                aria-label="Filtrar por fecha"
              />
            </label>

            <button
              type="button"
              className="auditoria-limpiar"
              onClick={limpiarFiltros}
            >
              Limpiar
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="auditoria-vacio">
            <RefreshCw
              size={36}
              className="girando"
            />

            <p>
              Consultando registros de auditoría...
            </p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="auditoria-vacio">
            <Database size={38} />

            <h2>No hay registros</h2>

            <p>
              No existen operaciones que coincidan con
              los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="auditoria-tabla-scroll">
            <table className="auditoria-tabla">
              <thead>
                <tr>
                  <th>Operación</th>
                  <th>Usuario</th>
                  <th>Tabla</th>
                  <th>Registro</th>
                  <th>Fecha y hora</th>
                  <th>Detalle</th>
                </tr>
              </thead>

              <tbody>
                {registrosFiltrados.map(
                  (registro) => (
                    <tr key={registro.id}>
                      <td>
                        <span
                          className={
                            `auditoria-accion ` +
                            registro.accion.toLowerCase()
                          }
                        >
                          {registro.accion ===
                          "INSERT" ? (
                            <PlusCircle size={15} />
                          ) : registro.accion ===
                            "UPDATE" ? (
                            <PencilLine size={15} />
                          ) : (
                            <Trash2 size={15} />
                          )}

                          {obtenerNombreAccion(
                            registro.accion
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="auditoria-usuario">
                          <div>
                            {obtenerInicial(
                              registro.usuario
                                ?.nombre_completo ??
                                "Sistema"
                            )}
                          </div>

                          <span>
                            <strong>
                              {registro.usuario
                                ?.nombre_completo ??
                                "Operación del sistema"}
                            </strong>

                            <small>
                              {registro.usuario
                                ?.correo ??
                                "Sin usuario asociado"}
                            </small>
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="auditoria-tabla-nombre">
                          <Database size={15} />

                          {obtenerNombreTabla(
                            registro.tabla_afectada
                          )}
                        </span>
                      </td>

                      <td>
                        <code>
                          {registro.registro_id ??
                            "N/D"}
                        </code>
                      </td>

                      <td>
                        <span className="auditoria-fecha">
                          {formatearFecha(
                            registro.fecha_accion
                          )}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="auditoria-ver"
                          onClick={() =>
                            setRegistroSeleccionado(
                              registro
                            )
                          }
                          aria-label="Ver detalle"
                          title="Ver datos de la operación"
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer className="auditoria-panel-footer">
          <span>
            Mostrando {registrosFiltrados.length} de{" "}
            {registros.length} operaciones
          </span>

          <span>
            <ShieldCheck size={15} />
            Acceso exclusivo del administrador
          </span>
        </footer>
      </div>

      {registroSeleccionado && (
        <div className="auditoria-modal-fondo">
          <article className="auditoria-modal">
            <header>
              <div>
                <span>Detalle de operación</span>

                <h2>
                  {obtenerNombreAccion(
                    registroSeleccionado.accion
                  )}
                </h2>

                <p>
                  Registro de auditoría #
                  {registroSeleccionado.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRegistroSeleccionado(null)
                }
                aria-label="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </header>

            <div className="auditoria-modal-resumen">
              <div>
                <Database size={18} />

                <span>
                  <small>Tabla</small>
                  <strong>
                    {obtenerNombreTabla(
                      registroSeleccionado
                        .tabla_afectada
                    )}
                  </strong>
                </span>
              </div>

              <div>
                <Activity size={18} />

                <span>
                  <small>Registro</small>
                  <strong>
                    {registroSeleccionado
                      .registro_id ?? "N/D"}
                  </strong>
                </span>
              </div>

              <div>
                <UserRound size={18} />

                <span>
                  <small>Usuario</small>
                  <strong>
                    {registroSeleccionado.usuario
                      ?.nombre_completo ??
                      "Sistema"}
                  </strong>
                </span>
              </div>

              <div>
                <CalendarDays size={18} />

                <span>
                  <small>Fecha</small>
                  <strong>
                    {formatearFecha(
                      registroSeleccionado
                        .fecha_accion
                    )}
                  </strong>
                </span>
              </div>
            </div>

            <div className="auditoria-json-grid">
              <section>
                <header>
                  <Braces size={18} />
                  <h3>Datos anteriores</h3>
                </header>

                <pre>
                  {formatearJson(
                    registroSeleccionado
                      .datos_anteriores
                  )}
                </pre>
              </section>

              <section>
                <header>
                  <Braces size={18} />
                  <h3>Datos nuevos</h3>
                </header>

                <pre>
                  {formatearJson(
                    registroSeleccionado
                      .datos_nuevos
                  )}
                </pre>
              </section>
            </div>

            <footer>
              <button
                type="button"
                onClick={() =>
                  setRegistroSeleccionado(null)
                }
              >
                Cerrar
              </button>
            </footer>
          </article>
        </div>
      )}
    </section>
  );
}