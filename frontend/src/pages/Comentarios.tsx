import {
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  Filter,
  Mail,
  MessageSquarePlus,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  Smile,
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

import { useAuth } from "../contexts/AuthContext";

import {
  analizarComentarioGuardado,
} from "../services/analisisComentariosService";

import {
  crearComentario,
  listarComentarios,
} from "../services/comentariosService";

import type {
  ComentarioConCliente,
} from "../services/comentariosService";

import "../styles/Comentarios.css";

type FiltroProcesamiento =
  | "todos"
  | "procesados"
  | "pendientes";

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

function obtenerNombreSentimiento(
  sentimiento: string | null,
): string {
  if (!sentimiento) {
    return "Sin analizar";
  }

  return (
    sentimiento.charAt(0).toUpperCase() +
    sentimiento.slice(1)
  );
}

export default function Comentarios() {
  const { perfil } = useAuth();

  const esCliente = perfil?.rol === "cliente";

  const puedeAnalizar =
    perfil?.rol === "administrador" ||
    perfil?.rol === "analista";

  const [comentarios, setComentarios] = useState<
    ComentarioConCliente[]
  >([]);
  const [contenido, setContenido] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] =
    useState<FiltroProcesamiento>("todos");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<
    number | null
  >(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarComentarios = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await listarComentarios();
      setComentarios(datos);
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarComentarios();
  }, [cargarComentarios]);

  const resumen = useMemo(() => {
    const procesados = comentarios.filter(
      (comentario) => comentario.procesado,
    ).length;

    return {
      total: comentarios.length,
      procesados,
      pendientes: comentarios.length - procesados,
    };
  }, [comentarios]);

  const comentariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return comentarios.filter((comentario) => {
      const coincideProcesamiento =
        filtro === "todos" ||
        (filtro === "procesados" &&
          comentario.procesado) ||
        (filtro === "pendientes" &&
          !comentario.procesado);

      if (!coincideProcesamiento) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const contenidoBuscable = [
        comentario.contenido,
        comentario.categoria,
        comentario.sentimiento,
        comentario.cliente?.nombre,
        comentario.cliente?.correo,
        comentario.cliente?.empresa,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenidoBuscable.includes(texto);
    });
  }, [busqueda, comentarios, filtro]);

  const manejarEnvio = async (
    evento: React.FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    const comentarioLimpio = contenido.trim();

    if (comentarioLimpio.length < 5) {
      setError(
        "El comentario debe tener al menos 5 caracteres.",
      );
      return;
    }

    setEnviando(true);
    setError("");
    setMensaje("");

    try {
      const comentarioCreado =
        await crearComentario({
          contenido: comentarioLimpio,
          canal: "web",
        });

      setContenido("");

      try {
        const resultado =
          await analizarComentarioGuardado(
            comentarioCreado.id,
          );

        await cargarComentarios();

        setMensaje(
          `Comentario registrado y analizado. Sentimiento: ${obtenerNombreSentimiento(
            resultado.sentimiento,
          )}. Categoría: ${resultado.categoria}.`,
        );
      } catch (errorAnalisis) {
        await cargarComentarios();

        setMensaje(
          "El comentario fue registrado correctamente y quedó pendiente de análisis.",
        );

        setError(
          obtenerMensajeError(errorAnalisis),
        );
      }
    } catch (errorEnvio) {
      setError(obtenerMensajeError(errorEnvio));
    } finally {
      setEnviando(false);
    }
  };

  const manejarAnalisisPendiente = async (
    comentario: ComentarioConCliente,
  ) => {
    setProcesandoId(comentario.id);
    setError("");
    setMensaje("");

    try {
      const resultado =
        await analizarComentarioGuardado(
          comentario.id,
        );

      await cargarComentarios();

      setMensaje(
        `Comentario de ${
          comentario.cliente?.nombre || "cliente"
        } analizado correctamente. Sentimiento: ${obtenerNombreSentimiento(
          resultado.sentimiento,
        )}.`,
      );
    } catch (errorAnalisis) {
      setError(obtenerMensajeError(errorAnalisis));
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section className="comentarios-pagina">
      <header className="comentarios-encabezado">
        <div>
          <span className="comentarios-etiqueta">
            {esCliente
              ? "Comunicación con IdeaTech"
              : "Opiniones de clientes"}
          </span>

          <h1>
            {esCliente
              ? "Mis comentarios"
              : "Gestión de comentarios"}
          </h1>

          <p>
            {esCliente
              ? "Envíanos tus opiniones, consultas o sugerencias sobre nuestros servicios."
              : "Consulta las opiniones recibidas y procesa su categoría y sentimiento mediante NLP."}
          </p>
        </div>

        <button
          type="button"
          className="comentarios-actualizar"
          onClick={() => void cargarComentarios()}
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
        <div className="comentarios-alerta exito">
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
        <div className="comentarios-alerta error">
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

      {esCliente && (
        <form
          className="comentarios-formulario"
          onSubmit={manejarEnvio}
        >
          <div className="comentarios-formulario-icono">
            <MessageSquarePlus size={25} />
          </div>

          <div className="comentarios-formulario-contenido">
            <div>
              <h2>Enviar un comentario</h2>
              <p>
                Tu mensaje será analizado y revisado por el
                equipo de IdeaTech.
              </p>
            </div>

            <label htmlFor="contenido-comentario">
              Comentario
            </label>

            <textarea
              id="contenido-comentario"
              value={contenido}
              onChange={(evento) =>
                setContenido(evento.target.value)
              }
              placeholder="Escribe aquí tu opinión, consulta o sugerencia..."
              rows={5}
              minLength={5}
              maxLength={2000}
              disabled={enviando}
              required
            />

            <div className="comentarios-formulario-pie">
              <span>{contenido.length}/2000</span>

              <button
                type="submit"
                disabled={
                  enviando ||
                  contenido.trim().length < 5
                }
              >
                {enviando ? (
                  <RefreshCw
                    size={18}
                    className="girando"
                  />
                ) : (
                  <Send size={18} />
                )}

                {enviando
                  ? "Registrando y analizando..."
                  : "Enviar comentario"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="comentarios-resumen">
        <article>
          <div className="comentarios-resumen-icono total">
            <MessageSquareText size={22} />
          </div>

          <div>
            <span>Total</span>
            <strong>{resumen.total}</strong>
          </div>
        </article>

        <article>
          <div className="comentarios-resumen-icono pendiente">
            <Clock3 size={22} />
          </div>

          <div>
            <span>Pendientes</span>
            <strong>{resumen.pendientes}</strong>
          </div>
        </article>

        <article>
          <div className="comentarios-resumen-icono procesado">
            <Smile size={22} />
          </div>

          <div>
            <span>Procesados</span>
            <strong>{resumen.procesados}</strong>
          </div>
        </article>
      </div>

      <div className="comentarios-panel">
        <div className="comentarios-herramientas">
          <div className="comentarios-filtros">
            <Filter size={18} />

            <button
              type="button"
              className={
                filtro === "todos" ? "activo" : ""
              }
              onClick={() => setFiltro("todos")}
            >
              Todos
            </button>

            <button
              type="button"
              className={
                filtro === "pendientes"
                  ? "activo"
                  : ""
              }
              onClick={() => setFiltro("pendientes")}
            >
              Pendientes
            </button>

            <button
              type="button"
              className={
                filtro === "procesados"
                  ? "activo"
                  : ""
              }
              onClick={() => setFiltro("procesados")}
            >
              Procesados
            </button>
          </div>

          <label className="comentarios-buscador">
            <Search size={18} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar comentario"
            />
          </label>
        </div>

        {cargando ? (
          <div className="comentarios-vacio">
            <RefreshCw
              size={34}
              className="girando"
            />

            <p>Cargando comentarios...</p>
          </div>
        ) : comentariosFiltrados.length === 0 ? (
          <div className="comentarios-vacio">
            <div>
              <MessageSquareText size={32} />
            </div>

            <h2>No hay comentarios</h2>

            <p>
              {esCliente
                ? "Todavía no has enviado ningún comentario."
                : "No se encontraron comentarios con el filtro seleccionado."}
            </p>
          </div>
        ) : (
          <div className="comentarios-lista">
            {comentariosFiltrados.map(
              (comentario) => {
                const procesando =
                  procesandoId === comentario.id;

                return (
                  <article
                    className="comentario-tarjeta"
                    key={comentario.id}
                  >
                    <div className="comentario-superior">
                      <div className="comentario-cliente">
                        <div className="comentario-avatar">
                          {comentario.cliente?.nombre
                            ?.charAt(0)
                            .toUpperCase() || "C"}
                        </div>

                        <div>
                          <h2>
                            {comentario.cliente?.nombre ||
                              perfil?.nombre_completo ||
                              "Cliente"}
                          </h2>

                          <span>
                            {formatearFecha(
                              comentario.fecha_registro,
                            )}
                          </span>
                        </div>
                      </div>

                      <span
                        className={
                          comentario.procesado
                            ? "comentario-estado procesado"
                            : "comentario-estado pendiente"
                        }
                      >
                        {comentario.procesado
                          ? "Procesado"
                          : "Pendiente"}
                      </span>
                    </div>

                    {!esCliente &&
                      comentario.cliente && (
                        <div className="comentario-datos-cliente">
                          <span>
                            <Building2 size={16} />
                            {
                              comentario.cliente
                                .empresa
                            }
                          </span>

                          <span>
                            <Mail size={16} />
                            {
                              comentario.cliente
                                .correo
                            }
                          </span>

                          <span>
                            <UserRound size={16} />
                            ID cliente:{" "}
                            {comentario.cliente.id}
                          </span>
                        </div>
                      )}

                    <p className="comentario-contenido">
                      {comentario.contenido}
                    </p>

                    <div className="comentario-informacion">
                      <span>
                        Canal: {comentario.canal}
                      </span>

                      <span>
                        Categoría:{" "}
                        {comentario.categoria ||
                          "Sin analizar"}
                      </span>

                      <span
                        className={`comentario-sentimiento ${
                          comentario.sentimiento ||
                          "sin-analizar"
                        }`}
                      >
                        Sentimiento:{" "}
                        {obtenerNombreSentimiento(
                          comentario.sentimiento,
                        )}
                      </span>

                      {comentario.polaridad !== null && (
                        <span>
                          Polaridad:{" "}
                          {Number(
                            comentario.polaridad,
                          ).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {puedeAnalizar &&
                      !comentario.procesado && (
                        <div className="comentario-acciones">
                          <button
                            type="button"
                            className="comentario-analizar-boton"
                            onClick={() =>
                              void manejarAnalisisPendiente(
                                comentario,
                              )
                            }
                            disabled={
                              procesandoId !== null
                            }
                          >
                            {procesando ? (
                              <RefreshCw
                                size={18}
                                className="girando"
                              />
                            ) : (
                              <BrainCircuit size={18} />
                            )}

                            {procesando
                              ? "Analizando..."
                              : "Analizar comentario"}
                          </button>
                        </div>
                      )}
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