import {
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Hash,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserRound,
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
  aprobarSolicitudRegistro,
  listarSolicitudesRegistro,
  rechazarSolicitudRegistro,
} from "../services/solicitudesRegistroService";

import type {
  EstadoSolicitudRegistro,
  Perfil,
} from "../types/database";

import "../styles/SolicitudesRegistro.css";

type FiltroEstado = EstadoSolicitudRegistro | "todas";

interface ResumenSolicitudes {
  todas: number;
  pendiente: number;
  aprobado: number;
  rechazado: number;
}

const nombresEstados: Record<
  EstadoSolicitudRegistro,
  string
> = {
  pendiente: "Pendiente",
  aprobado: "Aprobada",
  rechazado: "Rechazada",
};

function formatearFecha(fecha: string | null): string {
  if (!fecha) {
    return "Sin fecha";
  }

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
  }).format(fechaConvertida);
}

function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

export default function SolicitudesRegistro() {
  const [solicitudes, setSolicitudes] = useState<
    Perfil[]
  >([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<
    string | null
  >(null);
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [solicitudRechazo, setSolicitudRechazo] =
    useState<Perfil | null>(null);
  const [motivoRechazo, setMotivoRechazo] =
    useState("");

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await listarSolicitudesRegistro();
      setSolicitudes(datos);
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarSolicitudes();
  }, [cargarSolicitudes]);

  const resumen = useMemo<ResumenSolicitudes>(() => {
    return solicitudes.reduce<ResumenSolicitudes>(
      (acumulado, solicitud) => {
        acumulado.todas += 1;

        if (
          solicitud.estado_solicitud === "pendiente"
        ) {
          acumulado.pendiente += 1;
        }

        if (
          solicitud.estado_solicitud === "aprobado"
        ) {
          acumulado.aprobado += 1;
        }

        if (
          solicitud.estado_solicitud === "rechazado"
        ) {
          acumulado.rechazado += 1;
        }

        return acumulado;
      },
      {
        todas: 0,
        pendiente: 0,
        aprobado: 0,
        rechazado: 0,
      },
    );
  }, [solicitudes]);

  const solicitudesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return solicitudes.filter((solicitud) => {
      const coincideEstado =
        filtroEstado === "todas" ||
        solicitud.estado_solicitud === filtroEstado;

      if (!coincideEstado) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const contenido = [
        solicitud.nombre_completo,
        solicitud.dni,
        solicitud.correo,
        solicitud.telefono,
        solicitud.empresa,
        solicitud.cargo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [busqueda, filtroEstado, solicitudes]);

  const limpiarMensajes = () => {
    setError("");
    setMensaje("");
  };

  const manejarAprobacion = async (
    solicitud: Perfil,
  ) => {
    const confirmado = window.confirm(
      `¿Deseas aprobar el registro de ${solicitud.nombre_completo}?`,
    );

    if (!confirmado) {
      return;
    }

    limpiarMensajes();
    setProcesandoId(solicitud.id);

    try {
      await aprobarSolicitudRegistro(
        solicitud.id,
        "cliente",
      );

      setMensaje(
        `La solicitud de ${solicitud.nombre_completo} fue aprobada correctamente.`,
      );

      await cargarSolicitudes();
    } catch (errorAprobacion) {
      setError(obtenerMensajeError(errorAprobacion));
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirRechazo = (solicitud: Perfil) => {
    limpiarMensajes();
    setSolicitudRechazo(solicitud);
    setMotivoRechazo("");
  };

  const cerrarRechazo = () => {
    if (procesandoId) {
      return;
    }

    setSolicitudRechazo(null);
    setMotivoRechazo("");
  };

  const confirmarRechazo = async () => {
    if (!solicitudRechazo) {
      return;
    }

    const motivo = motivoRechazo.trim();

    if (motivo.length < 5) {
      setError(
        "El motivo del rechazo debe tener al menos 5 caracteres.",
      );
      return;
    }

    limpiarMensajes();
    setProcesandoId(solicitudRechazo.id);

    try {
      await rechazarSolicitudRegistro(
        solicitudRechazo.id,
        motivo,
      );

      setMensaje(
        `La solicitud de ${solicitudRechazo.nombre_completo} fue rechazada.`,
      );

      setSolicitudRechazo(null);
      setMotivoRechazo("");

      await cargarSolicitudes();
    } catch (errorRechazo) {
      setError(obtenerMensajeError(errorRechazo));
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section className="solicitudes-registro-pagina">
      <header className="solicitudes-registro-encabezado">
        <div>
          <span className="solicitudes-registro-etiqueta">
            Administración de accesos
          </span>

          <h1>Solicitudes de registro</h1>

          <p>
            Revisa los datos de los nuevos clientes antes
            de permitirles ingresar a IdeaTech.
          </p>
        </div>

        <button
          type="button"
          className="solicitudes-registro-actualizar"
          onClick={() => void cargarSolicitudes()}
          disabled={cargando}
        >
          <RefreshCw
            size={18}
            className={cargando ? "girando" : ""}
          />
          Actualizar
        </button>
      </header>

      <div className="solicitudes-registro-resumen">
        <article>
          <div className="solicitudes-resumen-icono total">
            <UserRound size={22} />
          </div>

          <div>
            <span>Total</span>
            <strong>{resumen.todas}</strong>
          </div>
        </article>

        <article>
          <div className="solicitudes-resumen-icono pendiente">
            <Clock3 size={22} />
          </div>

          <div>
            <span>Pendientes</span>
            <strong>{resumen.pendiente}</strong>
          </div>
        </article>

        <article>
          <div className="solicitudes-resumen-icono aprobado">
            <CheckCircle2 size={22} />
          </div>

          <div>
            <span>Aprobadas</span>
            <strong>{resumen.aprobado}</strong>
          </div>
        </article>

        <article>
          <div className="solicitudes-resumen-icono rechazado">
            <XCircle size={22} />
          </div>

          <div>
            <span>Rechazadas</span>
            <strong>{resumen.rechazado}</strong>
          </div>
        </article>
      </div>

      {mensaje && (
        <div className="solicitudes-registro-alerta exito">
          <CheckCircle2 size={20} />
          <span>{mensaje}</span>
          <button
            type="button"
            onClick={() => setMensaje("")}
            aria-label="Cerrar mensaje"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="solicitudes-registro-alerta error">
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

      <div className="solicitudes-registro-panel">
        <div className="solicitudes-registro-herramientas">
          <div className="solicitudes-registro-pestanas">
            <button
              type="button"
              className={
                filtroEstado === "pendiente"
                  ? "activo"
                  : ""
              }
              onClick={() =>
                setFiltroEstado("pendiente")
              }
            >
              Pendientes
              <span>{resumen.pendiente}</span>
            </button>

            <button
              type="button"
              className={
                filtroEstado === "aprobado"
                  ? "activo"
                  : ""
              }
              onClick={() =>
                setFiltroEstado("aprobado")
              }
            >
              Aprobadas
              <span>{resumen.aprobado}</span>
            </button>

            <button
              type="button"
              className={
                filtroEstado === "rechazado"
                  ? "activo"
                  : ""
              }
              onClick={() =>
                setFiltroEstado("rechazado")
              }
            >
              Rechazadas
              <span>{resumen.rechazado}</span>
            </button>

            <button
              type="button"
              className={
                filtroEstado === "todas"
                  ? "activo"
                  : ""
              }
              onClick={() => setFiltroEstado("todas")}
            >
              Todas
              <span>{resumen.todas}</span>
            </button>
          </div>

          <label className="solicitudes-registro-buscador">
            <Search size={19} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar por nombre, DNI, correo o empresa"
            />
          </label>
        </div>

        {cargando ? (
          <div className="solicitudes-registro-estado">
            <RefreshCw
              size={34}
              className="girando"
            />
            <p>Cargando solicitudes...</p>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="solicitudes-registro-estado">
            <ClipboardVacio />
            <h2>No se encontraron solicitudes</h2>
            <p>
              No existen registros que coincidan con el
              filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="solicitudes-registro-lista">
            {solicitudesFiltradas.map((solicitud) => {
              const procesando =
                procesandoId === solicitud.id;

              return (
                <article
                  className="solicitud-registro-tarjeta"
                  key={solicitud.id}
                >
                  <div className="solicitud-registro-superior">
                    <div className="solicitud-registro-persona">
                      <div className="solicitud-registro-avatar">
                        {solicitud.nombre_completo
                          ?.charAt(0)
                          .toUpperCase() || "U"}
                      </div>

                      <div>
                        <h2>
                          {solicitud.nombre_completo ||
                            "Usuario sin nombre"}
                        </h2>

                        <span>
                          Registrado el{" "}
                          {formatearFecha(
                            solicitud.fecha_registro,
                          )}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`solicitud-registro-estado ${solicitud.estado_solicitud}`}
                    >
                      {
                        nombresEstados[
                          solicitud.estado_solicitud
                        ]
                      }
                    </span>
                  </div>

                  <div className="solicitud-registro-datos">
                    <div>
                      <Hash size={18} />
                      <span>
                        <small>DNI</small>
                        {solicitud.dni ||
                          "No registrado"}
                      </span>
                    </div>

                    <div>
                      <Mail size={18} />
                      <span>
                        <small>Correo</small>
                        {solicitud.correo ||
                          "No registrado"}
                      </span>
                    </div>

                    <div>
                      <Phone size={18} />
                      <span>
                        <small>Teléfono</small>
                        {solicitud.telefono ||
                          "No registrado"}
                      </span>
                    </div>

                    <div>
                      <Building2 size={18} />
                      <span>
                        <small>Empresa</small>
                        {solicitud.empresa ||
                          "No registrada"}
                      </span>
                    </div>

                    <div>
                      <UserRound size={18} />
                      <span>
                        <small>Cargo</small>
                        {solicitud.cargo ||
                          "No registrado"}
                      </span>
                    </div>
                  </div>

                  <div className="solicitud-registro-motivo">
                    <strong>Motivo de la solicitud</strong>
                    <p>
                      {solicitud.motivo_solicitud ||
                        "El solicitante no indicó un motivo."}
                    </p>
                  </div>

                  {solicitud.estado_solicitud ===
                    "rechazado" && (
                    <div className="solicitud-registro-rechazo">
                      <strong>Motivo del rechazo</strong>
                      <p>
                        {solicitud.motivo_rechazo ||
                          "No se registró un motivo."}
                      </p>
                      <span>
                        Revisada:{" "}
                        {formatearFecha(
                          solicitud.fecha_revision,
                        )}
                      </span>
                    </div>
                  )}

                  {solicitud.estado_solicitud ===
                    "aprobado" && (
                    <div className="solicitud-registro-aprobacion">
                      <CheckCircle2 size={18} />
                      <span>
                        Aprobada el{" "}
                        {formatearFecha(
                          solicitud.fecha_revision,
                        )}
                      </span>
                    </div>
                  )}

                  {solicitud.estado_solicitud ===
                    "pendiente" && (
                    <div className="solicitud-registro-acciones">
                      <button
                        type="button"
                        className="boton-rechazar"
                        onClick={() =>
                          abrirRechazo(solicitud)
                        }
                        disabled={procesando}
                      >
                        <X size={18} />
                        Rechazar
                      </button>

                      <button
                        type="button"
                        className="boton-aprobar"
                        onClick={() =>
                          void manejarAprobacion(
                            solicitud,
                          )
                        }
                        disabled={procesando}
                      >
                        {procesando ? (
                          <RefreshCw
                            size={18}
                            className="girando"
                          />
                        ) : (
                          <Check size={18} />
                        )}
                        Aprobar como cliente
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {solicitudRechazo && (
        <div
          className="solicitudes-modal-fondo"
          role="presentation"
        >
          <div
            className="solicitudes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-rechazo"
          >
            <div className="solicitudes-modal-encabezado">
              <div>
                <span>Confirmación</span>
                <h2 id="titulo-modal-rechazo">
                  Rechazar solicitud
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarRechazo}
                disabled={Boolean(procesandoId)}
                aria-label="Cerrar ventana"
              >
                <X size={21} />
              </button>
            </div>

            <p>
              Indica por qué se rechazará la solicitud de{" "}
              <strong>
                {solicitudRechazo.nombre_completo}
              </strong>
              .
            </p>

            <label htmlFor="motivo-rechazo">
              Motivo del rechazo
            </label>

            <textarea
              id="motivo-rechazo"
              value={motivoRechazo}
              onChange={(evento) =>
                setMotivoRechazo(evento.target.value)
              }
              placeholder="Ejemplo: No fue posible verificar los datos de la empresa."
              rows={5}
              maxLength={500}
              autoFocus
            />

            <div className="solicitudes-modal-contador">
              {motivoRechazo.length}/500
            </div>

            <div className="solicitudes-modal-acciones">
              <button
                type="button"
                className="boton-cancelar"
                onClick={cerrarRechazo}
                disabled={Boolean(procesandoId)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="boton-confirmar-rechazo"
                onClick={() =>
                  void confirmarRechazo()
                }
                disabled={
                  Boolean(procesandoId) ||
                  motivoRechazo.trim().length < 5
                }
              >
                {procesandoId ? (
                  <RefreshCw
                    size={18}
                    className="girando"
                  />
                ) : (
                  <XCircle size={18} />
                )}
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ClipboardVacio() {
  return (
    <div className="solicitudes-registro-vacio-icono">
      <Clock3 size={32} />
    </div>
  );
}