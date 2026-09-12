import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
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
  generarPrediccion,
  listarClientesParaPrediccion,
  listarPredicciones,
  obtenerInformacionModelo,
} from "../services/prediccionesService";

import type {
  InformacionModelo,
  PrediccionConCliente,
} from "../services/prediccionesService";

import type { Cliente } from "../types/database";

import "../styles/Predicciones.css";

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

function formatearDinero(valor: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(Number(valor));
}

function formatearPorcentaje(valor: number): string {
  return `${(Number(valor) * 100).toFixed(1)} %`;
}

function obtenerEstadoDatos(cliente: Cliente): string {
  if (cliente.estado !== "activo") {
    return "Inactivo";
  }

  if (cliente.estado_datos === "verificado") {
    return "Verificado";
  }

  if (
    cliente.estado_datos ===
    "pendiente_verificacion"
  ) {
    return "Pendiente de verificación";
  }

  return "Datos incompletos";
}

export default function Predicciones() {
  const [clientes, setClientes] = useState<Cliente[]>(
    []
  );

  const [predicciones, setPredicciones] = useState<
    PrediccionConCliente[]
  >([]);

  const [modelo, setModelo] =
    useState<InformacionModelo | null>(null);

  const [clienteSeleccionado, setClienteSeleccionado] =
    useState("");

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [
        datosClientes,
        datosPredicciones,
        datosModelo,
      ] = await Promise.all([
        listarClientesParaPrediccion(),
        listarPredicciones(),
        obtenerInformacionModelo(),
      ]);

      setClientes(datosClientes);
      setPredicciones(datosPredicciones);
      setModelo(datosModelo);
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const clienteActual = useMemo(() => {
    const identificador = Number(
      clienteSeleccionado
    );

    return (
      clientes.find(
        (cliente) => cliente.id === identificador
      ) ?? null
    );
  }, [clienteSeleccionado, clientes]);

  const clienteAptoParaPrediccion = Boolean(
    clienteActual &&
      clienteActual.estado === "activo" &&
      clienteActual.estado_datos === "verificado"
  );

  const mensajeEstadoCliente = useMemo(() => {
    if (!clienteActual) {
      return "";
    }

    if (clienteActual.estado !== "activo") {
      return (
        "Este cliente está inactivo. Debe activarse " +
        "antes de generar una predicción."
      );
    }

    if (
      clienteActual.estado_datos === "incompletos"
    ) {
      return (
        "Los datos empresariales están incompletos. " +
        "El cliente debe completar la sección Mi empresa."
      );
    }

    if (
      clienteActual.estado_datos ===
      "pendiente_verificacion"
    ) {
      return (
        "Los datos empresariales están pendientes de " +
        "verificación por un administrador."
      );
    }

    return "";
  }, [clienteActual]);

  const resumen = useMemo(() => {
    const riesgosAltos = predicciones.filter(
      (prediccion) =>
        prediccion.nivel_riesgo === "alto"
    ).length;

    const riesgosMedios = predicciones.filter(
      (prediccion) =>
        prediccion.nivel_riesgo === "medio"
    ).length;

    const riesgosBajos = predicciones.filter(
      (prediccion) =>
        prediccion.nivel_riesgo === "bajo"
    ).length;

    return {
      total: predicciones.length,
      altos: riesgosAltos,
      medios: riesgosMedios,
      bajos: riesgosBajos,
    };
  }, [predicciones]);

  const prediccionesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return predicciones;
    }

    return predicciones.filter((prediccion) => {
      const contenido = [
        prediccion.cliente?.nombre,
        prediccion.cliente?.empresa,
        prediccion.cliente?.correo,
        prediccion.modelo,
        prediccion.nivel_riesgo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [busqueda, predicciones]);

  const manejarPrediccion = async () => {
    const identificador = Number(
      clienteSeleccionado
    );

    if (!identificador || !clienteActual) {
      setError(
        "Selecciona un cliente para generar la predicción."
      );
      return;
    }

    if (!clienteAptoParaPrediccion) {
      setError(
        mensajeEstadoCliente ||
          "El cliente no está habilitado para predicciones."
      );
      return;
    }

    setGenerando(true);
    setError("");
    setMensaje("");

    try {
      const resultado = await generarPrediccion(
        identificador
      );

      const datosActualizados =
        await listarPredicciones();

      setPredicciones(datosActualizados);

      setMensaje(
        `Predicción registrada para ${resultado.cliente}. ` +
          `Riesgo ${resultado.nivel_riesgo} con ` +
          `${formatearPorcentaje(
            resultado.probabilidad_cancelacion
          )} de probabilidad.`
      );
    } catch (errorPrediccion) {
      setError(
        obtenerMensajeError(errorPrediccion)
      );
    } finally {
      setGenerando(false);
    }
  };

  return (
    <section className="predicciones-pagina">
      <header className="predicciones-encabezado">
        <div>
          <span className="predicciones-etiqueta">
            Machine Learning
          </span>

          <h1>Predicción de cancelación</h1>

          <p>
            Calcula el riesgo de que un cliente cancele
            su servicio mediante un modelo Random Forest.
          </p>
        </div>

        <button
          type="button"
          className="predicciones-actualizar"
          onClick={() => void cargarDatos()}
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
        <div className="predicciones-alerta exito">
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
        <div className="predicciones-alerta error">
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

      <div className="predicciones-modelo">
        <article>
          <div className="predicciones-modelo-icono">
            <BrainCircuit size={27} />
          </div>

          <div>
            <span>Modelo activo</span>

            <strong>
              {modelo?.modelo || "Cargando..."}
            </strong>

            <small>
              Versión {modelo?.version || "..."}
            </small>
          </div>
        </article>

        <article>
          <Activity size={23} />

          <div>
            <span>Exactitud</span>

            <strong>
              {modelo
                ? formatearPorcentaje(
                    modelo.exactitud
                  )
                : "..."}
            </strong>

            <small>Evaluación del modelo</small>
          </div>
        </article>

        <article>
          <Gauge size={23} />

          <div>
            <span>ROC AUC</span>

            <strong>
              {modelo
                ? formatearPorcentaje(
                    modelo.roc_auc
                  )
                : "..."}
            </strong>

            <small>Capacidad de clasificación</small>
          </div>
        </article>

        <article>
          <Users size={23} />

          <div>
            <span>Entrenamiento</span>

            <strong>
              {modelo?.registros_totales ?? "..."}
            </strong>

            <small>Registros simulados</small>
          </div>
        </article>
      </div>

      <div className="predicciones-generador">
        <div className="predicciones-generador-titulo">
          <div>
            <BrainCircuit size={23} />
          </div>

          <span>
            <strong>Generar nueva predicción</strong>

            <small>
              Puedes consultar todos los clientes. Solo
              los activos y verificados pueden analizarse.
            </small>
          </span>
        </div>

        <div className="predicciones-selector">
          <label htmlFor="cliente-prediccion">
            Cliente
          </label>

          <div>
            <select
              id="cliente-prediccion"
              value={clienteSeleccionado}
              onChange={(evento) => {
                setClienteSeleccionado(
                  evento.target.value
                );
                setError("");
                setMensaje("");
              }}
              disabled={cargando || generando}
            >
              <option value="">
                Seleccionar cliente
              </option>

              {clientes.map((cliente) => (
                <option
                  key={cliente.id}
                  value={cliente.id}
                >
                  {cliente.nombre} — {cliente.empresa} —{" "}
                  {obtenerEstadoDatos(cliente)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                void manejarPrediccion()
              }
              disabled={
                !clienteSeleccionado ||
                !clienteAptoParaPrediccion ||
                generando
              }
            >
              {generando ? (
                <RefreshCw
                  size={18}
                  className="girando"
                />
              ) : (
                <BrainCircuit size={18} />
              )}

              {generando
                ? "Analizando..."
                : "Generar predicción"}
            </button>
          </div>
        </div>

        {clienteActual && (
          <>
            <div className="predicciones-cliente-datos">
              <div>
                <span>Empresa</span>
                <strong>
                  {clienteActual.empresa}
                </strong>
              </div>

              <div>
                <span>Plan</span>
                <strong>
                  {clienteActual.tipo_plan}
                </strong>
              </div>

              <div>
                <span>Ingreso mensual</span>
                <strong>
                  {formatearDinero(
                    clienteActual.ingreso_mensual
                  )}
                </strong>
              </div>

              <div>
                <span>Suscripción</span>
                <strong>
                  {formatearDinero(
                    clienteActual.monto_suscripcion
                  )}
                </strong>
              </div>

              <div>
                <span>Servicios activos</span>
                <strong>
                  {clienteActual.servicios_activos}
                </strong>
              </div>

              <div>
                <span>Accesos API</span>
                <strong>
                  {clienteActual.accesos_api}
                </strong>
              </div>
            </div>

            {clienteAptoParaPrediccion ? (
              <div className="predicciones-alerta exito">
                <CheckCircle2 size={20} />

                <span>
                  Cliente activo y verificado. Ya puede
                  generarse la predicción.
                </span>
              </div>
            ) : (
              <div className="predicciones-alerta error">
                <AlertTriangle size={20} />

                <span>{mensajeEstadoCliente}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="predicciones-resumen">
        <article>
          <BrainCircuit size={22} />

          <div>
            <span>Total</span>
            <strong>{resumen.total}</strong>
          </div>
        </article>

        <article className="riesgo-bajo">
          <TrendingDown size={22} />

          <div>
            <span>Riesgo bajo</span>
            <strong>{resumen.bajos}</strong>
          </div>
        </article>

        <article className="riesgo-medio">
          <AlertTriangle size={22} />

          <div>
            <span>Riesgo medio</span>
            <strong>{resumen.medios}</strong>
          </div>
        </article>

        <article className="riesgo-alto">
          <TrendingUp size={22} />

          <div>
            <span>Riesgo alto</span>
            <strong>{resumen.altos}</strong>
          </div>
        </article>
      </div>

      <div className="predicciones-panel">
        <div className="predicciones-herramientas">
          <div>
            <h2>Historial de predicciones</h2>

            <span>
              Resultados almacenados en Supabase
            </span>
          </div>

          <label className="predicciones-buscador">
            <Search size={18} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar cliente o empresa"
            />
          </label>
        </div>

        {cargando ? (
          <div className="predicciones-vacio">
            <RefreshCw
              size={34}
              className="girando"
            />

            <p>Cargando predicciones...</p>
          </div>
        ) : prediccionesFiltradas.length === 0 ? (
          <div className="predicciones-vacio">
            <div>
              <BrainCircuit size={32} />
            </div>

            <h2>No hay predicciones</h2>

            <p>
              Selecciona un cliente verificado para
              generar la primera.
            </p>
          </div>
        ) : (
          <div className="predicciones-lista">
            {prediccionesFiltradas.map(
              (prediccion) => (
                <article
                  className="prediccion-tarjeta"
                  key={prediccion.id}
                >
                  <div
                    className={
                      `prediccion-riesgo-icono ` +
                      prediccion.nivel_riesgo
                    }
                  >
                    {prediccion.nivel_riesgo ===
                    "bajo" ? (
                      <ShieldCheck size={24} />
                    ) : prediccion.nivel_riesgo ===
                      "medio" ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <TrendingUp size={24} />
                    )}
                  </div>

                  <div className="prediccion-informacion">
                    <div>
                      <h3>
                        {prediccion.cliente?.nombre ||
                          `Cliente ${prediccion.cliente_id}`}
                      </h3>

                      <span
                        className={
                          `prediccion-nivel ` +
                          prediccion.nivel_riesgo
                        }
                      >
                        Riesgo{" "}
                        {prediccion.nivel_riesgo}
                      </span>
                    </div>

                    <p>
                      <Building2 size={15} />

                      {prediccion.cliente?.empresa ||
                        "Empresa no disponible"}
                    </p>

                    <small>
                      {formatearFecha(
                        prediccion.fecha_prediccion
                      )}
                      {" · "}
                      {prediccion.modelo}
                      {" · v"}
                      {prediccion.version_modelo ||
                        "N/D"}
                    </small>
                  </div>

                  <div className="prediccion-probabilidad">
                    <strong>
                      {formatearPorcentaje(
                        prediccion
                          .probabilidad_cancelacion
                      )}
                    </strong>

                    <span>
                      Probabilidad de cancelación
                    </span>

                    <div>
                      <i
                        className={
                          prediccion.nivel_riesgo
                        }
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              prediccion
                                .probabilidad_cancelacion *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}