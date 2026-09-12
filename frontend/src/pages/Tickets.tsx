import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  Headphones,
  MessageSquareReply,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
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
  crearTicket,
  eliminarTicket,
  listarClientesParaTickets,
  listarTickets,
  obtenerNombreEstadoTicket,
  obtenerNombrePrioridad,
  responderTicket,
  tomarTicket,
} from "../services/ticketsService";

import type {
  TicketConRelaciones,
} from "../services/ticketsService";

import type {
  Cliente,
  EstadoTicket,
  PrioridadTicket,
} from "../types/database";

import "../styles/Tickets.css";

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

interface FormularioTicket {
  cliente_id: string;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadTicket;
}

const formularioInicial: FormularioTicket = {
  cliente_id: "",
  titulo: "",
  descripcion: "",
  prioridad: "media",
};

export default function Tickets() {
  const { perfil } = useAuth();

  const [tickets, setTickets] = useState<
    TicketConRelaciones[]
  >([]);

  const [clientes, setClientes] = useState<
    Cliente[]
  >([]);

  const [formulario, setFormulario] =
    useState<FormularioTicket>(
      formularioInicial
    );

  const [ticketDetalle, setTicketDetalle] =
    useState<TicketConRelaciones | null>(
      null
    );

  const [ticketRespuesta, setTicketRespuesta] =
    useState<TicketConRelaciones | null>(
      null
    );

  const [ticketEliminar, setTicketEliminar] =
    useState<TicketConRelaciones | null>(
      null
    );

  const [respuesta, setRespuesta] =
    useState("");

  const [estadoRespuesta, setEstadoRespuesta] =
    useState<
      Exclude<EstadoTicket, "pendiente">
    >("resuelta");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] =
    useState("todas");

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] =
    useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const rol = perfil?.rol;

  const puedeCrear =
    rol === "cliente" ||
    rol === "administrador";

  const puedeGestionar =
    rol === "administrador" ||
    rol === "operador";

  const esAdministrador =
    rol === "administrador";

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [datosTickets, datosClientes] =
        await Promise.all([
          listarTickets(),
          listarClientesParaTickets(),
        ]);

      setTickets(datosTickets);
      setClientes(datosClientes);

      if (
        perfil?.rol === "cliente" &&
        datosClientes.length === 1
      ) {
        setFormulario(
          (formularioActual) => ({
            ...formularioActual,
            cliente_id: String(
              datosClientes[0].id
            ),
          })
        );
      }
    } catch (errorCarga) {
      setError(
        obtenerMensajeError(errorCarga)
      );
    } finally {
      setCargando(false);
    }
  }, [perfil?.rol]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const resumen = useMemo(() => {
    return {
      total: tickets.length,

      pendientes: tickets.filter(
        (ticket) =>
          ticket.estado === "pendiente"
      ).length,

      enProceso: tickets.filter(
        (ticket) =>
          ticket.estado === "en_proceso"
      ).length,

      resueltos: tickets.filter(
        (ticket) =>
          ticket.estado === "resuelta"
      ).length,
    };
  }, [tickets]);

  const ticketsFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    return tickets.filter((ticket) => {
      const contenido = [
        ticket.titulo,
        ticket.descripcion,
        ticket.cliente?.nombre,
        ticket.cliente?.empresa,
        ticket.operador?.nombre_completo,
        ticket.estado,
        ticket.prioridad,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const coincideBusqueda =
        !texto || contenido.includes(texto);

      const coincideEstado =
        filtroEstado === "todos" ||
        ticket.estado === filtroEstado;

      const coincidePrioridad =
        filtroPrioridad === "todas" ||
        ticket.prioridad ===
          filtroPrioridad;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincidePrioridad
      );
    });
  }, [
    busqueda,
    filtroEstado,
    filtroPrioridad,
    tickets,
  ]);

  const abrirFormulario = () => {
    const clienteInicial =
      perfil?.rol === "cliente" &&
      clientes.length === 1
        ? String(clientes[0].id)
        : "";

    setFormulario({
      ...formularioInicial,
      cliente_id: clienteInicial,
    });

    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  };

  const registrarTicket = async () => {
    const clienteId = Number(
      formulario.cliente_id
    );

    if (!clienteId) {
      setError(
        "Selecciona el cliente relacionado con el ticket."
      );
      return;
    }

    if (formulario.titulo.trim().length < 5) {
      setError(
        "El título debe tener al menos 5 caracteres."
      );
      return;
    }

    if (
      formulario.descripcion.trim().length <
      10
    ) {
      setError(
        "La descripción debe tener al menos 10 caracteres."
      );
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await crearTicket({
        cliente_id: clienteId,
        titulo: formulario.titulo,
        descripcion:
          formulario.descripcion,
        prioridad: formulario.prioridad,
      });

      setMostrarFormulario(false);

      setMensaje(
        "El ticket fue registrado correctamente."
      );

      await cargarDatos();
    } catch (errorRegistro) {
      setError(
        obtenerMensajeError(errorRegistro)
      );
    } finally {
      setProcesando(false);
    }
  };

  const asignarmeTicket = async (
    ticket: TicketConRelaciones
  ) => {
    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await tomarTicket(ticket.id);

      setMensaje(
        `El ticket #${ticket.id} fue asignado correctamente.`
      );

      await cargarDatos();
    } catch (errorAsignacion) {
      setError(
        obtenerMensajeError(errorAsignacion)
      );
    } finally {
      setProcesando(false);
    }
  };

  const abrirRespuesta = (
    ticket: TicketConRelaciones
  ) => {
    setTicketRespuesta(ticket);
    setRespuesta(ticket.respuesta ?? "");

    setEstadoRespuesta(
      ticket.estado === "cancelada"
        ? "cancelada"
        : ticket.estado === "en_proceso"
          ? "en_proceso"
          : "resuelta"
    );

    setError("");
    setMensaje("");
  };

  const guardarRespuesta = async () => {
    if (!ticketRespuesta) {
      return;
    }

    if (respuesta.trim().length < 5) {
      setError(
        "La respuesta debe tener al menos 5 caracteres."
      );
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await responderTicket(
        ticketRespuesta.id,
        respuesta,
        estadoRespuesta
      );

      setTicketRespuesta(null);

      setMensaje(
        `El ticket #${ticketRespuesta.id} fue actualizado correctamente.`
      );

      await cargarDatos();
    } catch (errorRespuesta) {
      setError(
        obtenerMensajeError(errorRespuesta)
      );
    } finally {
      setProcesando(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!ticketEliminar) {
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    try {
      await eliminarTicket(
        ticketEliminar.id
      );

      setMensaje(
        `El ticket #${ticketEliminar.id} fue eliminado correctamente.`
      );

      setTicketEliminar(null);

      await cargarDatos();
    } catch (errorEliminacion) {
      setError(
        obtenerMensajeError(
          errorEliminacion
        )
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <section className="tickets-pagina">
      <header className="tickets-encabezado">
        <div>
          <span className="tickets-etiqueta">
            Atención empresarial
          </span>

          <h1>Tickets de soporte</h1>

          <p>
            Registra, consulta y gestiona solicitudes de
            atención de los clientes de IdeaTech.
          </p>
        </div>

        <div className="tickets-acciones-superiores">
          <button
            type="button"
            className="tickets-actualizar"
            onClick={() => void cargarDatos()}
            disabled={cargando || procesando}
          >
            <RefreshCw
              size={18}
              className={
                cargando ? "girando" : ""
              }
            />

            Actualizar
          </button>

          {puedeCrear && (
            <button
              type="button"
              className="tickets-nuevo"
              onClick={abrirFormulario}
            >
              <Plus size={18} />
              Nuevo ticket
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="tickets-alerta error">
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

      {mensaje && (
        <div className="tickets-alerta exito">
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

      <div className="tickets-resumen">
        <article>
          <div className="azul">
            <Headphones size={22} />
          </div>

          <span>Total de tickets</span>
          <strong>{resumen.total}</strong>
        </article>

        <article>
          <div className="naranja">
            <Clock3 size={22} />
          </div>

          <span>Pendientes</span>
          <strong>{resumen.pendientes}</strong>
        </article>

        <article>
          <div className="morado">
            <UserCheck size={22} />
          </div>

          <span>En proceso</span>
          <strong>{resumen.enProceso}</strong>
        </article>

        <article>
          <div className="verde">
            <CheckCircle2 size={22} />
          </div>

          <span>Resueltos</span>
          <strong>{resumen.resueltos}</strong>
        </article>
      </div>

      <div className="tickets-panel">
        <div className="tickets-herramientas">
          <label className="tickets-buscador">
            <Search size={18} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar ticket, cliente o empresa"
            />
          </label>

          <div className="tickets-filtros">
            <label>
              <Filter size={16} />

              <select
                value={filtroEstado}
                onChange={(evento) =>
                  setFiltroEstado(
                    evento.target.value
                  )
                }
              >
                <option value="todos">
                  Todos los estados
                </option>
                <option value="pendiente">
                  Pendientes
                </option>
                <option value="en_proceso">
                  En proceso
                </option>
                <option value="resuelta">
                  Resueltos
                </option>
                <option value="cancelada">
                  Cancelados
                </option>
              </select>
            </label>

            <select
              value={filtroPrioridad}
              onChange={(evento) =>
                setFiltroPrioridad(
                  evento.target.value
                )
              }
            >
              <option value="todas">
                Todas las prioridades
              </option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">
                Crítica
              </option>
            </select>
          </div>
        </div>

        {cargando ? (
          <div className="tickets-vacio">
            <RefreshCw
              size={36}
              className="girando"
            />

            <p>Cargando tickets...</p>
          </div>
        ) : ticketsFiltrados.length === 0 ? (
          <div className="tickets-vacio">
            <Headphones size={40} />

            <h2>No hay tickets</h2>

            <p>
              No existen solicitudes de soporte para
              los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="tickets-lista">
            {ticketsFiltrados.map((ticket) => (
              <article
                className="ticket-tarjeta"
                key={ticket.id}
              >
                <div
                  className={
                    `ticket-prioridad-indicador ` +
                    ticket.prioridad
                  }
                />

                <div className="ticket-contenido">
                  <div className="ticket-titulo">
                    <div>
                      <small>
                        Ticket #{ticket.id}
                      </small>

                      <h2>{ticket.titulo}</h2>
                    </div>

                    <div className="ticket-etiquetas">
                      <span
                        className={
                          `ticket-prioridad ` +
                          ticket.prioridad
                        }
                      >
                        {obtenerNombrePrioridad(
                          ticket.prioridad
                        )}
                      </span>

                      <span
                        className={
                          `ticket-estado ` +
                          ticket.estado
                        }
                      >
                        {obtenerNombreEstadoTicket(
                          ticket.estado
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="ticket-descripcion">
                    {ticket.descripcion}
                  </p>

                  <div className="ticket-informacion">
                    <span>
                      <strong>Cliente:</strong>{" "}
                      {ticket.cliente?.nombre ??
                        `Cliente ${ticket.cliente_id}`}
                    </span>

                    <span>
                      <strong>Empresa:</strong>{" "}
                      {ticket.cliente?.empresa ??
                        "No disponible"}
                    </span>

                    <span>
                      <strong>Operador:</strong>{" "}
                      {ticket.operador
                        ?.nombre_completo ??
                        "Sin asignar"}
                    </span>

                    <span>
                      <strong>Creado:</strong>{" "}
                      {formatearFecha(
                        ticket.fecha_inicio
                      )}
                    </span>
                  </div>

                  {ticket.respuesta && (
                    <div className="ticket-respuesta">
                      <MessageSquareReply size={19} />

                      <div>
                        <strong>
                          Respuesta de IdeaTech
                        </strong>

                        <p>{ticket.respuesta}</p>

                        {ticket.fecha_respuesta && (
                          <small>
                            {formatearFecha(
                              ticket.fecha_respuesta
                            )}
                          </small>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="ticket-acciones">
                    <button
                      type="button"
                      className="ver"
                      onClick={() =>
                        setTicketDetalle(ticket)
                      }
                    >
                      Ver detalle
                    </button>

                    {puedeGestionar &&
                      ticket.estado ===
                        "pendiente" &&
                      !ticket.operador_asignado_id && (
                        <button
                          type="button"
                          className="tomar"
                          onClick={() =>
                            void asignarmeTicket(
                              ticket
                            )
                          }
                          disabled={procesando}
                        >
                          <UserCheck size={16} />
                          Tomar ticket
                        </button>
                      )}

                    {puedeGestionar &&
                      (
                        esAdministrador ||
                        ticket.operador_asignado_id ===
                          perfil?.id
                      ) &&
                      ticket.estado !==
                        "cancelada" && (
                        <button
                          type="button"
                          className="responder"
                          onClick={() =>
                            abrirRespuesta(ticket)
                          }
                        >
                          <Send size={16} />
                          Responder
                        </button>
                      )}

                    {esAdministrador && (
                      <button
                        type="button"
                        className="eliminar"
                        onClick={() =>
                          setTicketEliminar(ticket)
                        }
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {mostrarFormulario && (
        <div className="tickets-modal-fondo">
          <article className="tickets-modal">
            <header>
              <div>
                <span>Nueva atención</span>
                <h2>Registrar ticket</h2>
                <p>
                  Describe el problema o solicitud de
                  manera clara.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarFormulario(false)
                }
                disabled={procesando}
              >
                <X size={20} />
              </button>
            </header>

            <div className="tickets-formulario">
              <label>
                <span>Cliente</span>

                <select
                  value={formulario.cliente_id}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      cliente_id:
                        evento.target.value,
                    })
                  }
                  disabled={
                    procesando ||
                    (
                      rol === "cliente" &&
                      clientes.length === 1
                    )
                  }
                >
                  <option value="">
                    Seleccionar cliente
                  </option>

                  {clientes.map((cliente) => (
                    <option
                      key={cliente.id}
                      value={cliente.id}
                    >
                      {cliente.nombre} —{" "}
                      {cliente.empresa}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Título</span>

                <input
                  type="text"
                  value={formulario.titulo}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      titulo:
                        evento.target.value,
                    })
                  }
                  placeholder="Ejemplo: Problema con acceso a la API"
                  maxLength={120}
                  disabled={procesando}
                />
              </label>

              <label>
                <span>Prioridad</span>

                <select
                  value={formulario.prioridad}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      prioridad:
                        evento.target
                          .value as PrioridadTicket,
                    })
                  }
                  disabled={procesando}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">
                    Crítica
                  </option>
                </select>
              </label>

              <label className="campo-completo">
                <span>Descripción</span>

                <textarea
                  value={formulario.descripcion}
                  onChange={(evento) =>
                    setFormulario({
                      ...formulario,
                      descripcion:
                        evento.target.value,
                    })
                  }
                  placeholder="Explica detalladamente la solicitud..."
                  maxLength={2000}
                  disabled={procesando}
                />
              </label>
            </div>

            <footer>
              <button
                type="button"
                className="cancelar"
                onClick={() =>
                  setMostrarFormulario(false)
                }
                disabled={procesando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="guardar"
                onClick={() =>
                  void registrarTicket()
                }
                disabled={procesando}
              >
                {procesando ? (
                  <RefreshCw
                    size={18}
                    className="girando"
                  />
                ) : (
                  <Send size={18} />
                )}

                {procesando
                  ? "Registrando..."
                  : "Registrar ticket"}
              </button>
            </footer>
          </article>
        </div>
      )}

      {ticketRespuesta && (
        <div className="tickets-modal-fondo">
          <article className="tickets-modal">
            <header>
              <div>
                <span>
                  Responder ticket #
                  {ticketRespuesta.id}
                </span>

                <h2>{ticketRespuesta.titulo}</h2>

                <p>
                  {ticketRespuesta.cliente?.nombre ??
                    "Cliente"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setTicketRespuesta(null)
                }
                disabled={procesando}
              >
                <X size={20} />
              </button>
            </header>

            <div className="tickets-formulario">
              <div className="tickets-aviso">
                <ShieldCheck size={21} />

                <p>
                  La respuesta se enviará al cliente
                  mediante una notificación.
                </p>
              </div>

              <label className="campo-completo">
                <span>Respuesta</span>

                <textarea
                  value={respuesta}
                  onChange={(evento) =>
                    setRespuesta(
                      evento.target.value
                    )
                  }
                  placeholder="Escribe la respuesta para el cliente..."
                  maxLength={3000}
                  disabled={procesando}
                />
              </label>

              <label>
                <span>Nuevo estado</span>

                <select
                  value={estadoRespuesta}
                  onChange={(evento) =>
                    setEstadoRespuesta(
                      evento.target
                        .value as Exclude<
                        EstadoTicket,
                        "pendiente"
                      >
                    )
                  }
                  disabled={procesando}
                >
                  <option value="en_proceso">
                    En proceso
                  </option>
                  <option value="resuelta">
                    Resuelta
                  </option>
                  <option value="cancelada">
                    Cancelada
                  </option>
                </select>
              </label>
            </div>

            <footer>
              <button
                type="button"
                className="cancelar"
                onClick={() =>
                  setTicketRespuesta(null)
                }
                disabled={procesando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="guardar"
                onClick={() =>
                  void guardarRespuesta()
                }
                disabled={procesando}
              >
                <Send size={18} />

                {procesando
                  ? "Enviando..."
                  : "Enviar respuesta"}
              </button>
            </footer>
          </article>
        </div>
      )}

      {ticketDetalle && (
        <div className="tickets-modal-fondo">
          <article className="tickets-modal">
            <header>
              <div>
                <span>
                  Ticket #{ticketDetalle.id}
                </span>

                <h2>{ticketDetalle.titulo}</h2>

                <p>
                  Creado el{" "}
                  {formatearFecha(
                    ticketDetalle.fecha_inicio
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setTicketDetalle(null)
                }
              >
                <X size={20} />
              </button>
            </header>

            <div className="ticket-detalle">
              <div className="ticket-detalle-etiquetas">
                <span
                  className={
                    `ticket-prioridad ` +
                    ticketDetalle.prioridad
                  }
                >
                  {obtenerNombrePrioridad(
                    ticketDetalle.prioridad
                  )}
                </span>

                <span
                  className={
                    `ticket-estado ` +
                    ticketDetalle.estado
                  }
                >
                  {obtenerNombreEstadoTicket(
                    ticketDetalle.estado
                  )}
                </span>
              </div>

              <section>
                <h3>Descripción</h3>
                <p>
                  {ticketDetalle.descripcion}
                </p>
              </section>

              <section>
                <h3>Cliente</h3>
                <p>
                  {ticketDetalle.cliente?.nombre ??
                    `Cliente ${ticketDetalle.cliente_id}`}
                  {" — "}
                  {ticketDetalle.cliente?.empresa ??
                    "Empresa no disponible"}
                </p>
              </section>

              <section>
                <h3>Operador asignado</h3>
                <p>
                  {ticketDetalle.operador
                    ?.nombre_completo ??
                    "Sin operador asignado"}
                </p>
              </section>

              {ticketDetalle.respuesta && (
                <section>
                  <h3>Respuesta</h3>
                  <p>
                    {ticketDetalle.respuesta}
                  </p>
                </section>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="guardar"
                onClick={() =>
                  setTicketDetalle(null)
                }
              >
                Cerrar
              </button>
            </footer>
          </article>
        </div>
      )}

      {ticketEliminar && (
        <div className="tickets-modal-fondo">
          <article className="tickets-modal tickets-confirmacion">
            <div className="tickets-confirmacion-icono">
              <AlertCircle size={32} />
            </div>

            <h2>Eliminar ticket</h2>

            <p>
              ¿Estás seguro de que deseas eliminar el
              ticket #{ticketEliminar.id}? Esta acción
              quedará registrada en Auditoría.
            </p>

            <div>
              <button
                type="button"
                className="cancelar"
                onClick={() =>
                  setTicketEliminar(null)
                }
                disabled={procesando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="eliminar-confirmacion"
                onClick={() =>
                  void confirmarEliminacion()
                }
                disabled={procesando}
              >
                <Trash2 size={17} />

                {procesando
                  ? "Eliminando..."
                  : "Eliminar"}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}