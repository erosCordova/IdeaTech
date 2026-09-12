import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import FormularioCliente from "../components/FormularioCliente";
import { useAuth } from "../contexts/AuthContext";

import {
  actualizarCliente,
  asignarOperadorCliente,
  cambiarEstadoCliente,
  eliminarCliente,
  listarClientes,
  listarOperadoresDisponibles,
  obtenerNombreRango,
  registrarCliente,
  solicitarCorreccionEmpresa,
  verificarDatosEmpresa,
} from "../services/clientesService";

import type {
  ConfiguracionServicioEmpresa,
  OperadorDisponible,
} from "../services/clientesService";

import type {
  Cliente,
  NuevoCliente,
  TipoPlan,
} from "../types/database";

import "../styles/Clientes.css";

type ModoRevision =
  | "verificar"
  | "corregir"
  | null;

const configuracionInicial:
  ConfiguracionServicioEmpresa = {
    tipo_plan: "basico",
    monto_suscripcion: 150,
    accesos_api: 1,
    servicios_activos: 1,
  };

const preciosPlanes: Record<
  TipoPlan,
  number
> = {
  basico: 150,
  profesional: 450,
  empresarial: 1100,
  personalizado: 2300,
};

function obtenerMensajeError(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

export default function Clientes() {
  const { perfil } = useAuth();

  const esAdministrador =
    perfil?.rol === "administrador";

  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  const [operadores, setOperadores] =
    useState<OperadorDisponible[]>([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    clienteSeleccionado,
    setClienteSeleccionado,
  ] = useState<Cliente | null>(null);

  const [
    clienteRevision,
    setClienteRevision,
  ] = useState<Cliente | null>(null);

  const [modoRevision, setModoRevision] =
    useState<ModoRevision>(null);

  const [
    configuracionServicio,
    setConfiguracionServicio,
  ] = useState<ConfiguracionServicioEmpresa>(
    configuracionInicial,
  );

  const [
    motivoCorreccion,
    setMotivoCorreccion,
  ] = useState("");

  const [
    clienteAsignacion,
    setClienteAsignacion,
  ] = useState<Cliente | null>(null);

  const [
    operadorSeleccionadoId,
    setOperadorSeleccionadoId,
  ] = useState("");

  const cargarDatos = useCallback(
    async () => {
      setCargando(true);
      setError("");

      try {
        if (esAdministrador) {
          const [
            registrosClientes,
            registrosOperadores,
          ] = await Promise.all([
            listarClientes(),
            listarOperadoresDisponibles(),
          ]);

          setClientes(registrosClientes);
          setOperadores(registrosOperadores);
        } else {
          const registrosClientes =
            await listarClientes();

          setClientes(registrosClientes);
          setOperadores([]);
        }
      } catch (excepcion) {
        setError(
          obtenerMensajeError(excepcion),
        );
      } finally {
        setCargando(false);
      }
    },
    [esAdministrador],
  );

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const nombresOperadores = useMemo(() => {
    return new Map(
      operadores.map((operador) => [
        operador.id,
        operador.nombre_completo,
      ]),
    );
  }, [operadores]);

  const obtenerNombreOperador = useCallback(
    (operadorId: string | null) => {
      if (!operadorId) {
        return "Sin asignar";
      }

      return (
        nombresOperadores.get(operadorId) ||
        "Operador asignado"
      );
    },
    [nombresOperadores],
  );

  const clientesFiltrados = useMemo(() => {
    const termino =
      busqueda.trim().toLowerCase();

    if (!termino) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      const nombreOperador =
        obtenerNombreOperador(
          cliente.operador_asignado_id,
        );

      return [
        cliente.nombre,
        cliente.correo,
        cliente.empresa,
        cliente.ruc,
        cliente.rubro_empresa,
        cliente.tipo_plan,
        cliente.estado,
        cliente.estado_datos,
        nombreOperador,
      ].some((valor) =>
        valor
          ?.toLowerCase()
          .includes(termino),
      );
    });
  }, [
    busqueda,
    clientes,
    obtenerNombreOperador,
  ]);

  const resumen = useMemo(() => {
    return {
      total: clientes.length,
      activos: clientes.filter(
        (cliente) =>
          cliente.estado === "activo",
      ).length,
      pendientes: clientes.filter(
        (cliente) =>
          cliente.estado_datos ===
          "pendiente_verificacion",
      ).length,
      asignados: clientes.filter(
        (cliente) =>
          cliente.operador_asignado_id !== null,
      ).length,
    };
  }, [clientes]);

  const abrirRegistro = () => {
    if (!esAdministrador) {
      return;
    }

    setClienteSeleccionado(null);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  };

  const abrirEdicion = (
    cliente: Cliente,
  ) => {
    if (!esAdministrador) {
      return;
    }

    setClienteSeleccionado(cliente);
    setMostrarFormulario(true);
    setError("");
    setMensaje("");
  };

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
    setClienteSeleccionado(null);
  };

  const guardarCliente = async (
    datos: NuevoCliente,
  ): Promise<void> => {
    if (!esAdministrador) {
      setError(
        "Solo un administrador puede modificar clientes.",
      );
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      if (clienteSeleccionado) {
        const actualizado =
          await actualizarCliente(
            clienteSeleccionado.id,
            datos,
          );

        setClientes((anteriores) =>
          anteriores.map((cliente) =>
            cliente.id === actualizado.id
              ? actualizado
              : cliente,
          ),
        );

        setMensaje(
          "Cliente actualizado correctamente.",
        );
      } else {
        const registrado =
          await registrarCliente(datos);

        setClientes((anteriores) => [
          registrado,
          ...anteriores,
        ]);

        setMensaje(
          "Cliente registrado correctamente.",
        );
      }

      setMostrarFormulario(false);
      setClienteSeleccionado(null);
    } catch (excepcion) {
      setError(
        obtenerMensajeError(excepcion),
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (
    cliente: Cliente,
  ) => {
    if (!esAdministrador) {
      return;
    }

    const nuevoEstado =
      cliente.estado === "activo"
        ? "inactivo"
        : "activo";

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const actualizado =
        await cambiarEstadoCliente(
          cliente.id,
          nuevoEstado,
        );

      setClientes((anteriores) =>
        anteriores.map((registro) =>
          registro.id === actualizado.id
            ? actualizado
            : registro,
        ),
      );

      setMensaje(
        `Cliente marcado como ${nuevoEstado}.`,
      );
    } catch (excepcion) {
      setError(
        obtenerMensajeError(excepcion),
      );
    } finally {
      setGuardando(false);
    }
  };

  const borrarCliente = async (
    cliente: Cliente,
  ) => {
    if (!esAdministrador) {
      return;
    }

    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`,
    );

    if (!confirmado) {
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      await eliminarCliente(cliente.id);

      setClientes((anteriores) =>
        anteriores.filter(
          (registro) =>
            registro.id !== cliente.id,
        ),
      );

      setMensaje(
        "Cliente eliminado correctamente.",
      );
    } catch (excepcion) {
      setError(
        obtenerMensajeError(excepcion),
      );
    } finally {
      setGuardando(false);
    }
  };

  const abrirAsignacion = (
    cliente: Cliente,
  ) => {
    if (!esAdministrador) {
      return;
    }

    setClienteAsignacion(cliente);
    setOperadorSeleccionadoId(
      cliente.operador_asignado_id || "",
    );
    setError("");
    setMensaje("");
  };

  const cerrarAsignacion = () => {
    if (guardando) {
      return;
    }

    setClienteAsignacion(null);
    setOperadorSeleccionadoId("");
  };

  const confirmarAsignacion =
    async () => {
      if (
        !esAdministrador ||
        !clienteAsignacion
      ) {
        return;
      }

      const operadorId =
        operadorSeleccionadoId || null;

      setGuardando(true);
      setError("");
      setMensaje("");

      try {
        const actualizado =
          await asignarOperadorCliente(
            clienteAsignacion.id,
            operadorId,
          );

        setClientes((anteriores) =>
          anteriores.map((cliente) =>
            cliente.id === actualizado.id
              ? actualizado
              : cliente,
          ),
        );

        const operador =
          operadores.find(
            (registro) =>
              registro.id === operadorId,
          );

        setClienteAsignacion(null);
        setOperadorSeleccionadoId("");

        setMensaje(
          operador
            ? `${operador.nombre_completo} fue asignado a ${actualizado.empresa}.`
            : `Se retiró el operador asignado a ${actualizado.empresa}.`,
        );
      } catch (excepcion) {
        setError(
          obtenerMensajeError(excepcion),
        );
      } finally {
        setGuardando(false);
      }
    };

  const abrirVerificacion = (
    cliente: Cliente,
  ) => {
    if (!esAdministrador) {
      return;
    }

    setClienteRevision(cliente);
    setModoRevision("verificar");
    setMotivoCorreccion("");

    setConfiguracionServicio({
      tipo_plan: cliente.tipo_plan,
      monto_suscripcion:
        cliente.monto_suscripcion > 0
          ? cliente.monto_suscripcion
          : preciosPlanes[cliente.tipo_plan],
      accesos_api:
        cliente.accesos_api > 0
          ? cliente.accesos_api
          : 1,
      servicios_activos:
        cliente.servicios_activos > 0
          ? cliente.servicios_activos
          : 1,
    });

    setError("");
    setMensaje("");
  };

  const abrirCorreccion = (
    cliente: Cliente,
  ) => {
    if (!esAdministrador) {
      return;
    }

    setClienteRevision(cliente);
    setModoRevision("corregir");
    setMotivoCorreccion("");
    setError("");
    setMensaje("");
  };

  const cerrarRevision = () => {
    if (guardando) {
      return;
    }

    setClienteRevision(null);
    setModoRevision(null);
    setMotivoCorreccion("");
  };

  const cambiarPlan = (
    plan: TipoPlan,
  ) => {
    setConfiguracionServicio(
      (actual) => ({
        ...actual,
        tipo_plan: plan,
        monto_suscripcion:
          preciosPlanes[plan],
      }),
    );
  };

  const confirmarVerificacion =
    async () => {
      if (
        !esAdministrador ||
        !clienteRevision
      ) {
        return;
      }

      setGuardando(true);
      setError("");
      setMensaje("");

      try {
        const actualizado =
          await verificarDatosEmpresa(
            clienteRevision.id,
            configuracionServicio,
          );

        setClientes((anteriores) =>
          anteriores.map((cliente) =>
            cliente.id === actualizado.id
              ? actualizado
              : cliente,
          ),
        );

        setClienteRevision(null);
        setModoRevision(null);
        setMotivoCorreccion("");

        setMensaje(
          `Los datos de ${actualizado.empresa} fueron verificados.`,
        );
      } catch (excepcion) {
        setError(
          obtenerMensajeError(excepcion),
        );
      } finally {
        setGuardando(false);
      }
    };

  const confirmarCorreccion =
    async () => {
      if (
        !esAdministrador ||
        !clienteRevision
      ) {
        return;
      }

      if (
        motivoCorreccion.trim().length < 5
      ) {
        setError(
          "El motivo debe tener al menos 5 caracteres.",
        );
        return;
      }

      setGuardando(true);
      setError("");
      setMensaje("");

      try {
        const actualizado =
          await solicitarCorreccionEmpresa(
            clienteRevision.id,
            motivoCorreccion,
          );

        setClientes((anteriores) =>
          anteriores.map((cliente) =>
            cliente.id === actualizado.id
              ? actualizado
              : cliente,
          ),
        );

        setClienteRevision(null);
        setModoRevision(null);
        setMotivoCorreccion("");

        setMensaje(
          `Se solicitó una corrección a ${actualizado.nombre}.`,
        );
      } catch (excepcion) {
        setError(
          obtenerMensajeError(excepcion),
        );
      } finally {
        setGuardando(false);
      }
    };

  const formatoMoneda =
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    });

  return (
    <section className="clientes-pagina">
      <header className="clientes-encabezado">
        <div>
          <p>Administración empresarial</p>

          <h1>Gestión de clientes</h1>

          <span>
            Consulta, administra y verifica los
            datos de las empresas aplicando
            políticas RLS.
          </span>
        </div>

        {esAdministrador && (
          <button
            type="button"
            className="clientes-boton-principal"
            onClick={abrirRegistro}
          >
            <Plus size={19} />
            Nuevo cliente
          </button>
        )}
      </header>

      <div className="clientes-resumen">
        <article>
          <div>
            <Users size={23} />
          </div>

          <span>Total visible</span>
          <strong>{resumen.total}</strong>
        </article>

        <article>
          <div>
            <Building2 size={23} />
          </div>

          <span>Clientes activos</span>
          <strong>{resumen.activos}</strong>
        </article>

        <article>
          <div>
            <AlertTriangle size={23} />
          </div>

          <span>Pendientes</span>
          <strong>{resumen.pendientes}</strong>
        </article>

        <article>
          <div>
            <UserCog size={23} />
          </div>

          <span>Con operador</span>
          <strong>{resumen.asignados}</strong>
        </article>
      </div>

      {error && (
        <div className="clientes-mensaje error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="clientes-mensaje exito">
          {mensaje}
        </div>
      )}

      <div className="clientes-tabla-contenedor">
        <div className="clientes-herramientas">
          <div className="clientes-buscador">
            <Search size={18} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value,
                )
              }
              placeholder="Buscar por cliente, empresa, RUC u operador..."
            />
          </div>

          <button
            type="button"
            className="clientes-actualizar"
            onClick={() =>
              void cargarDatos()
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
        </div>

        {cargando ? (
          <div className="clientes-estado-vacio">
            <LoaderCircle
              className="girando"
              size={34}
            />

            <p>Cargando clientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="clientes-estado-vacio">
            <Users size={38} />

            <h3>No se encontraron clientes</h3>

            <p>
              Modifica la búsqueda para consultar
              otros registros.
            </p>
          </div>
        ) : (
          <div className="clientes-tabla-scroll">
            <table className="clientes-tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Empresa</th>
                  <th>Plan</th>
                  <th>Operador</th>
                  <th>Suscripción</th>
                  <th>Verificación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map(
                  (cliente) => {
                    const nombreOperador =
                      obtenerNombreOperador(
                        cliente
                          .operador_asignado_id,
                      );

                    return (
                      <tr key={cliente.id}>
                        <td>
                          <div className="clientes-identidad">
                            <div>
                              {cliente.nombre
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <span>
                              <strong>
                                {cliente.nombre}
                              </strong>

                              <small>
                                {cliente.correo}
                              </small>
                            </span>
                          </div>
                        </td>

                        <td>
                          <strong>
                            {cliente.empresa}
                          </strong>

                          <small>
                            {cliente.ruc
                              ? `RUC ${cliente.ruc}`
                              : cliente.rubro_empresa}
                          </small>
                        </td>

                        <td>
                          <span className="clientes-plan">
                            {cliente.tipo_plan}
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              cliente
                                .operador_asignado_id
                                ? "clientes-operador asignado"
                                : "clientes-operador"
                            }
                          >
                            <UserCog size={16} />

                            <span>
                              {nombreOperador}
                            </span>
                          </div>
                        </td>

                        <td>
                          {formatoMoneda.format(
                            cliente
                              .monto_suscripcion,
                          )}
                        </td>

                        <td>
                          <span
                            className={`clientes-verificacion ${cliente.estado_datos}`}
                          >
                            {cliente.estado_datos
                              .replaceAll(
                                "_",
                                " ",
                              )}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={`clientes-estado ${cliente.estado}`}
                            onClick={() =>
                              esAdministrador &&
                              void cambiarEstado(
                                cliente,
                              )
                            }
                            disabled={
                              !esAdministrador ||
                              guardando
                            }
                            title={
                              esAdministrador
                                ? "Cambiar estado"
                                : "Solo lectura"
                            }
                          >
                            {cliente.estado}
                          </button>
                        </td>

                        <td>
                          <div className="clientes-acciones">
                            {esAdministrador &&
                              cliente.estado_datos ===
                                "pendiente_verificacion" && (
                                <>
                                  <button
                                    type="button"
                                    className="verificar"
                                    title="Verificar datos"
                                    onClick={() =>
                                      abrirVerificacion(
                                        cliente,
                                      )
                                    }
                                  >
                                    <BadgeCheck
                                      size={17}
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    className="corregir"
                                    title="Solicitar corrección"
                                    onClick={() =>
                                      abrirCorreccion(
                                        cliente,
                                      )
                                    }
                                  >
                                    <AlertTriangle
                                      size={17}
                                    />
                                  </button>
                                </>
                              )}

                            {esAdministrador && (
                              <button
                                type="button"
                                className="asignar"
                                title="Asignar operador"
                                onClick={() =>
                                  abrirAsignacion(
                                    cliente,
                                  )
                                }
                              >
                                <UserCog
                                  size={17}
                                />
                              </button>
                            )}

                            {esAdministrador && (
                              <button
                                type="button"
                                className="editar"
                                title="Editar cliente"
                                onClick={() =>
                                  abrirEdicion(
                                    cliente,
                                  )
                                }
                              >
                                <Edit3 size={17} />
                              </button>
                            )}

                            {esAdministrador && (
                              <button
                                type="button"
                                className="eliminar"
                                title="Eliminar cliente"
                                onClick={() =>
                                  void borrarCliente(
                                    cliente,
                                  )
                                }
                              >
                                <Trash2 size={17} />
                              </button>
                            )}

                            {!esAdministrador && (
                              <span className="clientes-solo-lectura">
                                Solo lectura
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mostrarFormulario && (
        <FormularioCliente
          cliente={clienteSeleccionado}
          guardando={guardando}
          onGuardar={guardarCliente}
          onCerrar={cerrarFormulario}
        />
      )}

      {clienteAsignacion && (
        <div className="clientes-modal-fondo">
          <section className="clientes-modal clientes-modal-asignacion">
            <header className="clientes-modal-header">
              <div>
                <p>Responsable del cliente</p>

                <h2>Asignar operador</h2>
              </div>

              <button
                type="button"
                onClick={cerrarAsignacion}
                disabled={guardando}
                aria-label="Cerrar asignación"
              >
                <X size={21} />
              </button>
            </header>

            <div className="clientes-asignacion-contenido">
              <div className="clientes-asignacion-cliente">
                <div>
                  <Building2 size={24} />
                </div>

                <span>
                  <small>Empresa seleccionada</small>

                  <strong>
                    {clienteAsignacion.empresa}
                  </strong>

                  <p>
                    {clienteAsignacion.nombre}
                  </p>
                </span>
              </div>

              <label className="clientes-asignacion-campo">
                <span>Operador responsable</span>

                <select
                  value={
                    operadorSeleccionadoId
                  }
                  onChange={(evento) =>
                    setOperadorSeleccionadoId(
                      evento.target.value,
                    )
                  }
                  disabled={guardando}
                >
                  <option value="">
                    Sin operador asignado
                  </option>

                  {operadores.map(
                    (operador) => (
                      <option
                        key={operador.id}
                        value={operador.id}
                      >
                        {operador.nombre_completo}
                        {operador.correo
                          ? ` — ${operador.correo}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>

                <small>
                  El operador podrá consultar este
                  cliente y la información autorizada
                  por las políticas RLS.
                </small>
              </label>
            </div>

            <footer className="clientes-formulario-acciones">
              <button
                type="button"
                className="clientes-boton-secundario"
                onClick={cerrarAsignacion}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="clientes-boton-principal"
                onClick={() =>
                  void confirmarAsignacion()
                }
                disabled={guardando}
              >
                {guardando ? (
                  <LoaderCircle
                    className="girando"
                    size={18}
                  />
                ) : (
                  <UserCog size={18} />
                )}

                {guardando
                  ? "Guardando..."
                  : operadorSeleccionadoId
                    ? "Asignar operador"
                    : "Guardar sin operador"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {clienteRevision && modoRevision && (
        <div className="clientes-modal-fondo">
          <section className="clientes-modal clientes-modal-revision">
            <header className="clientes-modal-header">
              <div>
                <p>Revisión empresarial</p>

                <h2>
                  {modoRevision === "verificar"
                    ? "Verificar datos"
                    : "Solicitar corrección"}
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarRevision}
                disabled={guardando}
                aria-label="Cerrar revisión"
              >
                <X size={21} />
              </button>
            </header>

            <div className="clientes-revision-resumen">
              <h3>
                {clienteRevision.empresa}
              </h3>

              <div>
                <span>
                  <strong>RUC</strong>
                  {clienteRevision.ruc ||
                    "No registrado"}
                </span>

                <span>
                  <strong>Rubro</strong>
                  {
                    clienteRevision
                      .rubro_empresa
                  }
                </span>

                <span>
                  <strong>Tamaño</strong>
                  {
                    clienteRevision
                      .tamano_empresa
                  }
                </span>

                <span>
                  <strong>Empleados</strong>
                  {
                    clienteRevision
                      .cantidad_empleados
                  }
                </span>

                <span>
                  <strong>Antigüedad</strong>
                  {
                    clienteRevision
                      .antiguedad_empresa
                  }{" "}
                  años
                </span>

                <span>
                  <strong>Ingresos</strong>
                  {obtenerNombreRango(
                    clienteRevision
                      .rango_ingreso,
                  )}
                </span>
              </div>
            </div>

            {modoRevision === "verificar" ? (
              <div className="clientes-revision-formulario">
                <label>
                  <span>Plan asignado</span>

                  <select
                    value={
                      configuracionServicio
                        .tipo_plan
                    }
                    onChange={(evento) =>
                      cambiarPlan(
                        evento.target
                          .value as TipoPlan,
                      )
                    }
                    disabled={guardando}
                  >
                    <option value="basico">
                      Básico
                    </option>

                    <option value="profesional">
                      Profesional
                    </option>

                    <option value="empresarial">
                      Empresarial
                    </option>

                    <option value="personalizado">
                      Personalizado
                    </option>
                  </select>
                </label>

                <label>
                  <span>
                    Suscripción mensual (S/)
                  </span>

                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                      configuracionServicio
                        .monto_suscripcion
                    }
                    onChange={(evento) =>
                      setConfiguracionServicio(
                        (actual) => ({
                          ...actual,
                          monto_suscripcion:
                            Number(
                              evento.target
                                .value,
                            ),
                        }),
                      )
                    }
                    disabled={guardando}
                  />
                </label>

                <label>
                  <span>Accesos API</span>

                  <input
                    type="number"
                    min={0}
                    value={
                      configuracionServicio
                        .accesos_api
                    }
                    onChange={(evento) =>
                      setConfiguracionServicio(
                        (actual) => ({
                          ...actual,
                          accesos_api:
                            Number(
                              evento.target
                                .value,
                            ),
                        }),
                      )
                    }
                    disabled={guardando}
                  />
                </label>

                <label>
                  <span>Servicios activos</span>

                  <input
                    type="number"
                    min={0}
                    value={
                      configuracionServicio
                        .servicios_activos
                    }
                    onChange={(evento) =>
                      setConfiguracionServicio(
                        (actual) => ({
                          ...actual,
                          servicios_activos:
                            Number(
                              evento.target
                                .value,
                            ),
                        }),
                      )
                    }
                    disabled={guardando}
                  />
                </label>
              </div>
            ) : (
              <label className="clientes-correccion-campo">
                <span>
                  Motivo de la corrección
                </span>

                <textarea
                  value={motivoCorreccion}
                  onChange={(evento) =>
                    setMotivoCorreccion(
                      evento.target.value,
                    )
                  }
                  placeholder="Indica qué información debe corregir el cliente..."
                  minLength={5}
                  maxLength={500}
                  rows={5}
                  disabled={guardando}
                  autoFocus
                />

                <small>
                  {motivoCorreccion.length}/500
                </small>
              </label>
            )}

            <footer className="clientes-formulario-acciones">
              <button
                type="button"
                className="clientes-boton-secundario"
                onClick={cerrarRevision}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={
                  modoRevision === "verificar"
                    ? "clientes-boton-principal"
                    : "clientes-boton-correccion"
                }
                onClick={() =>
                  modoRevision === "verificar"
                    ? void confirmarVerificacion()
                    : void confirmarCorreccion()
                }
                disabled={
                  guardando ||
                  (modoRevision === "corregir" &&
                    motivoCorreccion
                      .trim()
                      .length < 5)
                }
              >
                {guardando ? (
                  <LoaderCircle
                    className="girando"
                    size={18}
                  />
                ) : modoRevision ===
                  "verificar" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Send size={18} />
                )}

                {guardando
                  ? "Procesando..."
                  : modoRevision ===
                      "verificar"
                    ? "Verificar empresa"
                    : "Enviar corrección"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}