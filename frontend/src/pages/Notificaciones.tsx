import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  CircleAlert,
  Info,
  MailPlus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../contexts/AuthContext";

import {
  crearNotificacion,
  detenerEscuchaNotificaciones,
  eliminarNotificacion,
  escucharNotificaciones,
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasComoLeidas,
} from "../services/notificacionesService";

import type {
  NuevaNotificacion,
  TipoNotificacion,
} from "../services/notificacionesService";

import {
  listarSolicitudesRegistro,
} from "../services/solicitudesRegistroService";

import type {
  Notificacion,
  Perfil,
} from "../types/database";

import "../styles/Notificaciones.css";

type FiltroLectura =
  | "todas"
  | "no_leidas"
  | "leidas";

const tiposNotificacion: {
  valor: TipoNotificacion;
  nombre: string;
}[] = [
  {
    valor: "informacion",
    nombre: "Información",
  },
  {
    valor: "exito",
    nombre: "Éxito",
  },
  {
    valor: "advertencia",
    nombre: "Advertencia",
  },
  {
    valor: "riesgo",
    nombre: "Riesgo",
  },
  {
    valor: "error",
    nombre: "Error",
  },
];

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
  }).format(fechaConvertida);
}

function obtenerIcono(
  tipo: Notificacion["tipo"],
) {
  if (tipo === "exito") {
    return CheckCircle2;
  }

  if (tipo === "advertencia") {
    return AlertTriangle;
  }

  if (tipo === "riesgo") {
    return ShieldAlert;
  }

  if (tipo === "error") {
    return CircleAlert;
  }

  return Info;
}

const formularioInicial: NuevaNotificacion = {
  usuario_id: "",
  titulo: "",
  mensaje: "",
  tipo: "informacion",
};

export default function Notificaciones() {
  const { perfil } = useAuth();

  const esAdministrador =
    perfil?.rol === "administrador";

  const [notificaciones, setNotificaciones] =
    useState<Notificacion[]>([]);
  const [destinatarios, setDestinatarios] =
    useState<Perfil[]>([]);
  const [formulario, setFormulario] =
    useState<NuevaNotificacion>(
      formularioInicial,
    );
  const [filtro, setFiltro] =
    useState<FiltroLectura>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<
    number | null
  >(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarNotificaciones =
    useCallback(async () => {
      setCargando(true);

      try {
        const datos = await listarNotificaciones();
        setNotificaciones(datos);
      } catch (errorCarga) {
        setError(obtenerMensajeError(errorCarga));
      } finally {
        setCargando(false);
      }
    }, []);

  const cargarDestinatarios =
    useCallback(async () => {
      if (!esAdministrador) {
        return;
      }

      try {
        const perfiles =
          await listarSolicitudesRegistro();

        setDestinatarios(
          perfiles.filter(
            (destinatario) =>
              destinatario.activo &&
              destinatario.estado_solicitud ===
                "aprobado",
          ),
        );
      } catch (errorCarga) {
        setError(obtenerMensajeError(errorCarga));
      }
    }, [esAdministrador]);

  useEffect(() => {
    void cargarNotificaciones();
    void cargarDestinatarios();
  }, [
    cargarDestinatarios,
    cargarNotificaciones,
  ]);

  useEffect(() => {
    if (!perfil?.id) {
      return;
    }

    const canal = escucharNotificaciones(
      perfil.id,
      esAdministrador,
      () => {
        void cargarNotificaciones();
      },
    );

    return () => {
      void detenerEscuchaNotificaciones(canal);
    };
  }, [
    cargarNotificaciones,
    esAdministrador,
    perfil?.id,
  ]);

  const resumen = useMemo(() => {
    const noLeidas = notificaciones.filter(
      (notificacion) => !notificacion.leida,
    ).length;

    return {
      total: notificaciones.length,
      noLeidas,
      leidas: notificaciones.length - noLeidas,
    };
  }, [notificaciones]);

  const nombresDestinatarios = useMemo(() => {
    return new Map(
      destinatarios.map((destinatario) => [
        destinatario.id,
        destinatario.nombre_completo,
      ]),
    );
  }, [destinatarios]);

  const notificacionesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return notificaciones.filter(
      (notificacion) => {
        const coincideLectura =
          filtro === "todas" ||
          (filtro === "no_leidas" &&
            !notificacion.leida) ||
          (filtro === "leidas" &&
            notificacion.leida);

        if (!coincideLectura) {
          return false;
        }

        if (!texto) {
          return true;
        }

        const contenidoBuscable = [
          notificacion.titulo,
          notificacion.mensaje,
          notificacion.tipo,
          nombresDestinatarios.get(
            notificacion.usuario_id,
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return contenidoBuscable.includes(texto);
      },
    );
  }, [
    busqueda,
    filtro,
    nombresDestinatarios,
    notificaciones,
  ]);

  const cambiarFormulario = (
    campo: keyof NuevaNotificacion,
    valor: string,
  ) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const manejarCreacion = async (
    evento: React.FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    setEnviando(true);
    setError("");
    setMensaje("");

    try {
      await crearNotificacion(formulario);

      setFormulario(formularioInicial);

      await cargarNotificaciones();

      setMensaje(
        "La notificación fue enviada correctamente.",
      );
    } catch (errorCreacion) {
      setError(obtenerMensajeError(errorCreacion));
    } finally {
      setEnviando(false);
    }
  };

  const manejarLectura = async (
    notificacion: Notificacion,
  ) => {
    if (
      notificacion.leida ||
      notificacion.usuario_id !== perfil?.id
    ) {
      return;
    }

    setProcesandoId(notificacion.id);
    setError("");

    try {
      await marcarNotificacionLeida(
        notificacion.id,
      );

      await cargarNotificaciones();
    } catch (errorLectura) {
      setError(obtenerMensajeError(errorLectura));
    } finally {
      setProcesandoId(null);
    }
  };

  const manejarTodasLeidas = async () => {
    setError("");
    setMensaje("");

    try {
      await marcarTodasComoLeidas();
      await cargarNotificaciones();

      setMensaje(
        "Todas tus notificaciones fueron marcadas como leídas.",
      );
    } catch (errorLectura) {
      setError(obtenerMensajeError(errorLectura));
    }
  };

  const manejarEliminacion = async (
    notificacion: Notificacion,
  ) => {
    const confirmado = window.confirm(
      `¿Deseas eliminar la notificación "${notificacion.titulo}"?`,
    );

    if (!confirmado) {
      return;
    }

    setProcesandoId(notificacion.id);
    setError("");
    setMensaje("");

    try {
      await eliminarNotificacion(
        notificacion.id,
      );

      await cargarNotificaciones();

      setMensaje(
        "La notificación fue eliminada.",
      );
    } catch (errorEliminacion) {
      setError(
        obtenerMensajeError(errorEliminacion),
      );
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section className="notificaciones-pagina">
      <header className="notificaciones-encabezado">
        <div>
          <span className="notificaciones-etiqueta">
            Supabase Realtime
          </span>

          <h1>Notificaciones</h1>

          <p>
            Recibe avisos de IdeaTech en tiempo real sin
            recargar la página.
          </p>
        </div>

        <button
          type="button"
          className="notificaciones-actualizar"
          onClick={() =>
            void cargarNotificaciones()
          }
          disabled={cargando}
        >
          <RefreshCw
            size={18}
            className={cargando ? "girando" : ""}
          />
          Actualizar
        </button>
      </header>

      {mensaje && (
        <div className="notificaciones-alerta exito">
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
        <div className="notificaciones-alerta error">
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

      {esAdministrador && (
        <form
          className="notificaciones-formulario"
          onSubmit={manejarCreacion}
        >
          <div className="notificaciones-formulario-titulo">
            <div>
              <MailPlus size={23} />
            </div>

            <span>
              <strong>Enviar notificación</strong>
              <small>
                El destinatario la recibirá en tiempo real.
              </small>
            </span>
          </div>

          <div className="notificaciones-formulario-grid">
            <label>
              Destinatario

              <select
                value={formulario.usuario_id}
                onChange={(evento) =>
                  cambiarFormulario(
                    "usuario_id",
                    evento.target.value,
                  )
                }
                disabled={enviando}
                required
              >
                <option value="">
                  Seleccionar usuario
                </option>

                {destinatarios.map(
                  (destinatario) => (
                    <option
                      key={destinatario.id}
                      value={destinatario.id}
                    >
                      {destinatario.nombre_completo} —{" "}
                      {destinatario.rol}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Tipo

              <select
                value={formulario.tipo}
                onChange={(evento) =>
                  cambiarFormulario(
                    "tipo",
                    evento.target
                      .value as TipoNotificacion,
                  )
                }
                disabled={enviando}
              >
                {tiposNotificacion.map((tipo) => (
                  <option
                    key={tipo.valor}
                    value={tipo.valor}
                  >
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo-completo">
              Título

              <input
                type="text"
                value={formulario.titulo}
                onChange={(evento) =>
                  cambiarFormulario(
                    "titulo",
                    evento.target.value,
                  )
                }
                minLength={3}
                maxLength={120}
                disabled={enviando}
                required
              />
            </label>

            <label className="campo-completo">
              Mensaje

              <textarea
                value={formulario.mensaje}
                onChange={(evento) =>
                  cambiarFormulario(
                    "mensaje",
                    evento.target.value,
                  )
                }
                rows={4}
                minLength={5}
                maxLength={1000}
                disabled={enviando}
                required
              />
            </label>
          </div>

          <div className="notificaciones-formulario-pie">
            <span>
              {formulario.mensaje.length}/1000
            </span>

            <button
              type="submit"
              disabled={
                enviando ||
                !formulario.usuario_id ||
                formulario.titulo.trim().length < 3 ||
                formulario.mensaje.trim().length < 5
              }
            >
              {enviando ? (
                <RefreshCw
                  size={18}
                  className="girando"
                />
              ) : (
                <BellRing size={18} />
              )}

              {enviando
                ? "Enviando..."
                : "Enviar notificación"}
            </button>
          </div>
        </form>
      )}

      <div className="notificaciones-resumen">
        <article>
          <Bell size={22} />
          <span>
            <small>Total</small>
            <strong>{resumen.total}</strong>
          </span>
        </article>

        <article>
          <BellRing size={22} />
          <span>
            <small>No leídas</small>
            <strong>{resumen.noLeidas}</strong>
          </span>
        </article>

        <article>
          <CheckCircle2 size={22} />
          <span>
            <small>Leídas</small>
            <strong>{resumen.leidas}</strong>
          </span>
        </article>
      </div>

      <div className="notificaciones-panel">
        <div className="notificaciones-herramientas">
          <div className="notificaciones-filtros">
            <button
              type="button"
              className={
                filtro === "todas" ? "activo" : ""
              }
              onClick={() => setFiltro("todas")}
            >
              Todas
            </button>

            <button
              type="button"
              className={
                filtro === "no_leidas"
                  ? "activo"
                  : ""
              }
              onClick={() =>
                setFiltro("no_leidas")
              }
            >
              No leídas
            </button>

            <button
              type="button"
              className={
                filtro === "leidas" ? "activo" : ""
              }
              onClick={() => setFiltro("leidas")}
            >
              Leídas
            </button>
          </div>

          <div className="notificaciones-opciones">
            {resumen.noLeidas > 0 && (
              <button
                type="button"
                className="notificaciones-leer-todas"
                onClick={() =>
                  void manejarTodasLeidas()
                }
              >
                <Check size={17} />
                Marcar mis avisos como leídos
              </button>
            )}

            <label className="notificaciones-buscador">
              <Search size={18} />

              <input
                type="search"
                value={busqueda}
                onChange={(evento) =>
                  setBusqueda(evento.target.value)
                }
                placeholder="Buscar notificación"
              />
            </label>
          </div>
        </div>

        {cargando ? (
          <div className="notificaciones-vacio">
            <RefreshCw
              size={34}
              className="girando"
            />
            <p>Cargando notificaciones...</p>
          </div>
        ) : notificacionesFiltradas.length === 0 ? (
          <div className="notificaciones-vacio">
            <div>
              <Bell size={32} />
            </div>

            <h2>No hay notificaciones</h2>
            <p>No existen avisos para este filtro.</p>
          </div>
        ) : (
          <div className="notificaciones-lista">
            {notificacionesFiltradas.map(
              (notificacion) => {
                const Icono = obtenerIcono(
                  notificacion.tipo,
                );

                const procesando =
                  procesandoId === notificacion.id;

                const esPropia =
                  notificacion.usuario_id ===
                  perfil?.id;

                return (
                  <article
                    key={notificacion.id}
                    className={`notificacion-tarjeta ${
                      notificacion.leida
                        ? "leida"
                        : "no-leida"
                    }`}
                  >
                    <div
                      className={`notificacion-icono ${notificacion.tipo}`}
                    >
                      <Icono size={21} />
                    </div>

                    <div className="notificacion-contenido">
                      <div>
                        <h3>{notificacion.titulo}</h3>

                        {!notificacion.leida && (
                          <span>Nuevo</span>
                        )}
                      </div>

                      <p>{notificacion.mensaje}</p>

                      <small>
                        {formatearFecha(
                          notificacion.fecha_registro,
                        )}

                        {esAdministrador && (
                          <>
                            {" · Destinatario: "}
                            {nombresDestinatarios.get(
                              notificacion.usuario_id,
                            ) ||
                              notificacion.usuario_id}
                          </>
                        )}
                      </small>
                    </div>

                    <div className="notificacion-acciones">
                      {esPropia &&
                        !notificacion.leida && (
                          <button
                            type="button"
                            className="notificacion-leer"
                            onClick={() =>
                              void manejarLectura(
                                notificacion,
                              )
                            }
                            disabled={procesando}
                            title="Marcar como leída"
                          >
                            <Check size={18} />
                          </button>
                        )}

                      {(esPropia ||
                        esAdministrador) && (
                        <button
                          type="button"
                          className="notificacion-eliminar"
                          onClick={() =>
                            void manejarEliminacion(
                              notificacion,
                            )
                          }
                          disabled={procesando}
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </div>
    </section>
  );
}