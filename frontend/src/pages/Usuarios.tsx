import {
  Activity,
  CheckCircle2,
  Edit3,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserRound,
  UsersRound,
  UserX,
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
  administrarUsuario,
  calcularResumenUsuarios,
  listarUsuarios,
  obtenerNombreEstadoSolicitud,
  obtenerNombreRol,
} from "../services/usuariosService";

import type {
  UsuarioAdministrable,
} from "../services/usuariosService";

import "../styles/Usuarios.css";

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

function obtenerInicial(
  nombre: string
): string {
  return (
    nombre.trim().charAt(0).toUpperCase() ||
    "U"
  );
}

export default function Usuarios() {
  const { perfil } = useAuth();

  const [usuarios, setUsuarios] = useState<
    UsuarioAdministrable[]
  >([]);

  const [usuarioEditando, setUsuarioEditando] =
    useState<UsuarioAdministrable | null>(null);

  const [rolSeleccionado, setRolSeleccionado] =
    useState<UsuarioAdministrable["rol"]>(
      "cliente"
    );

  const [activoSeleccionado, setActivoSeleccionado] =
    useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] =
    useState("todos");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await listarUsuarios();
      setUsuarios(datos);
    } catch (errorCarga) {
      setError(
        obtenerMensajeError(errorCarga)
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarUsuarios();
  }, [cargarUsuarios]);

  const resumen = useMemo(
    () => calcularResumenUsuarios(usuarios),
    [usuarios]
  );

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    return usuarios.filter((usuario) => {
      const coincideBusqueda =
        !texto ||
        [
          usuario.nombre_completo,
          usuario.correo,
          usuario.empresa,
          usuario.cargo,
          usuario.rol,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(texto);

      const coincideRol =
        filtroRol === "todos" ||
        usuario.rol === filtroRol;

      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activo" &&
          usuario.activo &&
          usuario.estado_solicitud ===
            "aprobado") ||
        (filtroEstado === "inactivo" &&
          !usuario.activo &&
          usuario.estado_solicitud ===
            "aprobado") ||
        usuario.estado_solicitud ===
          filtroEstado;

      return (
        coincideBusqueda &&
        coincideRol &&
        coincideEstado
      );
    });
  }, [
    busqueda,
    filtroEstado,
    filtroRol,
    usuarios,
  ]);

  const abrirEdicion = (
    usuario: UsuarioAdministrable
  ) => {
    if (
      usuario.estado_solicitud !== "aprobado"
    ) {
      setError(
        "Los usuarios pendientes o rechazados se " +
          "administran desde la sección Solicitudes."
      );
      return;
    }

    setUsuarioEditando(usuario);
    setRolSeleccionado(usuario.rol);
    setActivoSeleccionado(usuario.activo);
    setError("");
    setMensaje("");
  };

  const cerrarEdicion = () => {
    if (guardando) {
      return;
    }

    setUsuarioEditando(null);
  };

  const guardarCambios = async () => {
    if (!usuarioEditando) {
      return;
    }

    const esCuentaActual =
      usuarioEditando.id === perfil?.id;

    if (
      esCuentaActual &&
      (
        rolSeleccionado !== "administrador" ||
        !activoSeleccionado
      )
    ) {
      setError(
        "No puedes quitarte el rol de administrador " +
          "ni desactivar tu propia cuenta."
      );
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const actualizado =
        await administrarUsuario(
          usuarioEditando.id,
          rolSeleccionado,
          activoSeleccionado
        );

      setUsuarios((usuariosActuales) =>
        usuariosActuales.map((usuario) =>
          usuario.id === actualizado.id
            ? actualizado
            : usuario
        )
      );

      setUsuarioEditando(null);

      setMensaje(
        `El usuario ${actualizado.nombre_completo} ` +
          "fue actualizado correctamente."
      );
    } catch (errorActualizacion) {
      setError(
        obtenerMensajeError(
          errorActualizacion
        )
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="usuarios-pagina">
      <header className="usuarios-encabezado">
        <div>
          <span className="usuarios-etiqueta">
            Administración
          </span>

          <h1>Usuarios y roles</h1>

          <p>
            Administra los permisos, roles y estados de
            las cuentas aprobadas en IdeaTech.
          </p>
        </div>

        <button
          type="button"
          className="usuarios-actualizar"
          onClick={() => void cargarUsuarios()}
          disabled={cargando}
        >
          <RefreshCw
            size={18}
            className={cargando ? "girando" : ""}
          />

          Actualizar
        </button>
      </header>

      {error && (
        <div className="usuarios-alerta error">
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
        <div className="usuarios-alerta exito">
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

      <div className="usuarios-resumen">
        <article>
          <div className="azul">
            <UsersRound size={22} />
          </div>

          <span>Total de usuarios</span>
          <strong>{resumen.total}</strong>
        </article>

        <article>
          <div className="verde">
            <UserCheck size={22} />
          </div>

          <span>Usuarios activos</span>
          <strong>{resumen.activos}</strong>
        </article>

        <article>
          <div className="rojo">
            <UserX size={22} />
          </div>

          <span>Usuarios inactivos</span>
          <strong>{resumen.inactivos}</strong>
        </article>

        <article>
          <div className="morado">
            <ShieldCheck size={22} />
          </div>

          <span>Administradores</span>
          <strong>
            {resumen.administradores}
          </strong>
        </article>
      </div>

      <div className="usuarios-panel">
        <div className="usuarios-herramientas">
          <label className="usuarios-buscador">
            <Search size={18} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar nombre, correo o empresa"
            />
          </label>

          <div className="usuarios-filtros">
            <select
              value={filtroRol}
              onChange={(evento) =>
                setFiltroRol(evento.target.value)
              }
              aria-label="Filtrar por rol"
            >
              <option value="todos">
                Todos los roles
              </option>
              <option value="administrador">
                Administradores
              </option>
              <option value="analista">
                Analistas
              </option>
              <option value="operador">
                Operadores
              </option>
              <option value="cliente">
                Clientes
              </option>
            </select>

            <select
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(
                  evento.target.value
                )
              }
              aria-label="Filtrar por estado"
            >
              <option value="todos">
                Todos los estados
              </option>
              <option value="activo">
                Activos
              </option>
              <option value="inactivo">
                Inactivos
              </option>
              <option value="pendiente">
                Pendientes
              </option>
              <option value="rechazado">
                Rechazados
              </option>
            </select>
          </div>
        </div>

        {cargando ? (
          <div className="usuarios-vacio">
            <RefreshCw
              size={35}
              className="girando"
            />

            <p>Cargando usuarios...</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="usuarios-vacio">
            <UserRound size={38} />

            <h2>No hay usuarios</h2>

            <p>
              No existen resultados para los filtros
              seleccionados.
            </p>
          </div>
        ) : (
          <div className="usuarios-tabla-scroll">
            <table className="usuarios-tabla">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Empresa y cargo</th>
                  <th>Rol</th>
                  <th>Solicitud</th>
                  <th>Acceso</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.map(
                  (usuario) => {
                    const esCuentaActual =
                      usuario.id === perfil?.id;

                    return (
                      <tr key={usuario.id}>
                        <td>
                          <div className="usuarios-identidad">
                            <div>
                              {obtenerInicial(
                                usuario.nombre_completo
                              )}
                            </div>

                            <span>
                              <strong>
                                {usuario.nombre_completo ||
                                  "Sin nombre"}
                              </strong>

                              <small>
                                {usuario.correo ||
                                  "Sin correo"}
                              </small>

                              {esCuentaActual && (
                                <b>
                                  Tu cuenta
                                </b>
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="usuarios-empresa">
                            <strong>
                              {usuario.empresa ||
                                "IdeaTech"}
                            </strong>

                            <small>
                              {usuario.cargo ||
                                "Sin cargo registrado"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              `usuarios-rol ` +
                              usuario.rol
                            }
                          >
                            {obtenerNombreRol(
                              usuario.rol
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              `usuarios-solicitud ` +
                              usuario.estado_solicitud
                            }
                          >
                            {obtenerNombreEstadoSolicitud(
                              usuario.estado_solicitud
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              usuario.activo
                                ? "usuarios-acceso activo"
                                : "usuarios-acceso inactivo"
                            }
                          >
                            <i />

                            {usuario.activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                        </td>

                        <td>
                          <span className="usuarios-fecha">
                            {formatearFecha(
                              usuario.fecha_registro
                            )}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="usuarios-editar"
                            onClick={() =>
                              abrirEdicion(usuario)
                            }
                            disabled={
                              usuario.estado_solicitud !==
                              "aprobado"
                            }
                            title={
                              usuario.estado_solicitud ===
                              "aprobado"
                                ? "Administrar usuario"
                                : "Gestionar desde Solicitudes"
                            }
                            aria-label="Administrar usuario"
                          >
                            <Edit3 size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer className="usuarios-panel-footer">
          <span>
            Mostrando {usuariosFiltrados.length} de{" "}
            {usuarios.length} usuarios
          </span>

          <span>
            <Activity size={15} />
            Información protegida mediante RLS
          </span>
        </footer>
      </div>

      {usuarioEditando && (
        <div className="usuarios-modal-fondo">
          <article className="usuarios-modal">
            <header>
              <div>
                <span>Administrar cuenta</span>

                <h2>
                  {usuarioEditando.nombre_completo}
                </h2>

                <p>{usuarioEditando.correo}</p>
              </div>

              <button
                type="button"
                onClick={cerrarEdicion}
                disabled={guardando}
                aria-label="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </header>

            <div className="usuarios-modal-contenido">
              <div className="usuarios-modal-aviso">
                <UserCog size={22} />

                <p>
                  Los cambios de rol modifican las
                  funciones disponibles para este
                  usuario. Las políticas RLS continuarán
                  controlando el acceso a los datos.
                </p>
              </div>

              <label>
                <span>Rol del usuario</span>

                <select
                  value={rolSeleccionado}
                  onChange={(evento) =>
                    setRolSeleccionado(
                      evento.target
                        .value as UsuarioAdministrable["rol"]
                    )
                  }
                  disabled={guardando}
                >
                  <option value="administrador">
                    Administrador
                  </option>
                  <option value="analista">
                    Analista
                  </option>
                  <option value="operador">
                    Operador
                  </option>
                  <option value="cliente">
                    Cliente
                  </option>
                </select>
              </label>

              <div className="usuarios-modal-estado">
                <div>
                  <strong>
                    Acceso al sistema
                  </strong>

                  <span>
                    Determina si el usuario puede iniciar
                    sesión y utilizar IdeaTech.
                  </span>
                </div>

                <button
                  type="button"
                  className={
                    activoSeleccionado
                      ? "activo"
                      : "inactivo"
                  }
                  onClick={() =>
                    setActivoSeleccionado(
                      (estadoActual) =>
                        !estadoActual
                    )
                  }
                  disabled={guardando}
                  aria-label="Cambiar estado de acceso"
                >
                  <i />

                  {activoSeleccionado
                    ? "Activo"
                    : "Inactivo"}
                </button>
              </div>
            </div>

            <footer>
              <button
                type="button"
                className="usuarios-cancelar"
                onClick={cerrarEdicion}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="usuarios-guardar"
                onClick={() =>
                  void guardarCambios()
                }
                disabled={guardando}
              >
                {guardando ? (
                  <RefreshCw
                    size={18}
                    className="girando"
                  />
                ) : (
                  <ShieldCheck size={18} />
                )}

                {guardando
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </footer>
          </article>
        </div>
      )}
    </section>
  );
}