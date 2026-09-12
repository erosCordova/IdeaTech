import {
  Activity,
  Bell,
  BrainCircuit,
  Building2,
  FileText,
  MessageSquareText,
  ShieldCheck,
  TicketCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

import type {
  RolUsuario,
} from "../types/database";

import "../styles/Inicio.css";

interface Estadisticas {
  clientes: number;
  comentarios: number;
  tickets: number;
  predicciones: number;
  documentos: number;
  notificaciones: number;
  solicitudesAcceso: number;
  empresasPendientes: number;
}

interface TarjetaInicio {
  titulo: string;
  valor: number;
  detalle: string;
  icono: LucideIcon;
  clase: string;
}

interface AccesoRapido {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: LucideIcon;
  clase: string;
}

const estadisticasIniciales: Estadisticas = {
  clientes: 0,
  comentarios: 0,
  tickets: 0,
  predicciones: 0,
  documentos: 0,
  notificaciones: 0,
  solicitudesAcceso: 0,
  empresasPendientes: 0,
};

function obtenerNombreRol(
  rol: RolUsuario | undefined,
): string {
  const nombres: Record<RolUsuario, string> = {
    administrador: "Administrador",
    analista: "Analista",
    operador: "Operador",
    cliente: "Cliente",
  };

  return rol
    ? nombres[rol]
    : "Sin rol";
}

function obtenerDescripcionRol(
  rol: RolUsuario | undefined,
): string {
  switch (rol) {
    case "administrador":
      return "Supervisa usuarios, empresas, operaciones y servicios de IdeaTech.";

    case "analista":
      return "Analiza comentarios, predicciones e indicadores empresariales.";

    case "operador":
      return "Atiende clientes asignados, tickets y documentación empresarial.";

    case "cliente":
      return "Administra la información y los servicios asociados a tu empresa.";

    default:
      return "Consulta la información disponible en IdeaTech.";
  }
}

export default function Inicio() {
  const { perfil } = useAuth();

  const [estadisticas, setEstadisticas] =
    useState<Estadisticas>(
      estadisticasIniciales,
    );

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const rol = perfil?.rol;

  useEffect(() => {
    const cargarEstadisticas =
      async () => {
        if (!rol) {
          return;
        }

        setCargando(true);
        setError("");

        try {
          if (rol === "administrador") {
            const [
              respuestaClientes,
              respuestaSolicitudes,
              respuestaEmpresas,
              respuestaTickets,
            ] = await Promise.all([
              supabase
                .from("clientes")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              supabase
                .from("perfiles")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq(
                  "estado_solicitud",
                  "pendiente",
                ),

              supabase
                .from("clientes")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq(
                  "estado_datos",
                  "pendiente_verificacion",
                ),

              supabase
                .from("solicitudes")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .in("estado", [
                  "pendiente",
                  "en_proceso",
                ]),
            ]);

            const primerError =
              respuestaClientes.error ||
              respuestaSolicitudes.error ||
              respuestaEmpresas.error ||
              respuestaTickets.error;

            if (primerError) {
              throw primerError;
            }

            setEstadisticas({
              ...estadisticasIniciales,
              clientes:
                respuestaClientes.count ?? 0,
              solicitudesAcceso:
                respuestaSolicitudes.count ??
                0,
              empresasPendientes:
                respuestaEmpresas.count ?? 0,
              tickets:
                respuestaTickets.count ?? 0,
            });
          } else if (rol === "analista") {
            const [
              respuestaClientes,
              respuestaComentarios,
              respuestaPredicciones,
              respuestaTickets,
            ] = await Promise.all([
              supabase
                .from("clientes")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              supabase
                .from("comentarios")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq("procesado", true),

              supabase
                .from("predicciones")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              supabase
                .from("solicitudes")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .in("estado", [
                  "pendiente",
                  "en_proceso",
                ]),
            ]);

            const primerError =
              respuestaClientes.error ||
              respuestaComentarios.error ||
              respuestaPredicciones.error ||
              respuestaTickets.error;

            if (primerError) {
              throw primerError;
            }

            setEstadisticas({
              ...estadisticasIniciales,
              clientes:
                respuestaClientes.count ?? 0,
              comentarios:
                respuestaComentarios.count ??
                0,
              predicciones:
                respuestaPredicciones.count ??
                0,
              tickets:
                respuestaTickets.count ?? 0,
            });
          } else if (rol === "operador") {
            const [
              respuestaClientes,
              respuestaTickets,
              respuestaComentarios,
              respuestaDocumentos,
            ] = await Promise.all([
              supabase
                .from("clientes")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              supabase
                .from("solicitudes")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .in("estado", [
                  "pendiente",
                  "en_proceso",
                ]),

              supabase
                .from("comentarios")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              supabase
                .from("documentos")
                .select("*", {
                  count: "exact",
                  head: true,
                }),
            ]);

            const primerError =
              respuestaClientes.error ||
              respuestaTickets.error ||
              respuestaComentarios.error ||
              respuestaDocumentos.error;

            if (primerError) {
              throw primerError;
            }

            setEstadisticas({
              ...estadisticasIniciales,
              clientes:
                respuestaClientes.count ?? 0,
              tickets:
                respuestaTickets.count ?? 0,
              comentarios:
                respuestaComentarios.count ??
                0,
              documentos:
                respuestaDocumentos.count ?? 0,
            });
          } else {
            const [
              respuestaComentarios,
              respuestaDocumentos,
              respuestaTickets,
              respuestaNotificaciones,
            ] = await Promise.all([
              supabase
                .from("comentarios")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              supabase
                .from("documentos")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              supabase
                .from("solicitudes")
                .select("*", {
                  count: "exact",
                  head: true,
                }),

              supabase
                .from("notificaciones")
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq("leida", false),
            ]);

            const primerError =
              respuestaComentarios.error ||
              respuestaDocumentos.error ||
              respuestaTickets.error ||
              respuestaNotificaciones.error;

            if (primerError) {
              throw primerError;
            }

            setEstadisticas({
              ...estadisticasIniciales,
              comentarios:
                respuestaComentarios.count ??
                0,
              documentos:
                respuestaDocumentos.count ?? 0,
              tickets:
                respuestaTickets.count ?? 0,
              notificaciones:
                respuestaNotificaciones.count ??
                0,
            });
          }
        } catch (excepcion) {
          const mensaje =
            excepcion instanceof Error
              ? excepcion.message
              : "Ocurrió un error inesperado.";

          setError(
            `No se pudieron cargar los indicadores: ${mensaje}`,
          );
        } finally {
          setCargando(false);
        }
      };

    void cargarEstadisticas();
  }, [rol]);

  const tarjetas =
    useMemo<TarjetaInicio[]>(() => {
      switch (rol) {
        case "administrador":
          return [
            {
              titulo: "Clientes",
              valor: estadisticas.clientes,
              detalle:
                "Registros empresariales",
              icono: Users,
              clase: "azul",
            },
            {
              titulo: "Solicitudes de acceso",
              valor:
                estadisticas.solicitudesAcceso,
              detalle:
                "Pendientes de aprobación",
              icono: UserCheck,
              clase: "celeste",
            },
            {
              titulo: "Empresas pendientes",
              valor:
                estadisticas.empresasPendientes,
              detalle:
                "Datos por verificar",
              icono: Building2,
              clase: "naranja",
            },
            {
              titulo: "Tickets abiertos",
              valor: estadisticas.tickets,
              detalle:
                "Pendientes o en proceso",
              icono: TicketCheck,
              clase: "morado",
            },
          ];

        case "analista":
          return [
            {
              titulo: "Clientes",
              valor: estadisticas.clientes,
              detalle:
                "Empresas disponibles",
              icono: Users,
              clase: "azul",
            },
            {
              titulo: "Comentarios",
              valor: estadisticas.comentarios,
              detalle:
                "Opiniones procesadas",
              icono: MessageSquareText,
              clase: "celeste",
            },
            {
              titulo: "Predicciones",
              valor: estadisticas.predicciones,
              detalle:
                "Análisis realizados",
              icono: BrainCircuit,
              clase: "morado",
            },
            {
              titulo: "Tickets abiertos",
              valor: estadisticas.tickets,
              detalle:
                "Casos para consultar",
              icono: TicketCheck,
              clase: "naranja",
            },
          ];

        case "operador":
          return [
            {
              titulo: "Clientes visibles",
              valor: estadisticas.clientes,
              detalle:
                "Asignados o relacionados",
              icono: Users,
              clase: "azul",
            },
            {
              titulo: "Tickets disponibles",
              valor: estadisticas.tickets,
              detalle:
                "Pendientes o en proceso",
              icono: TicketCheck,
              clase: "naranja",
            },
            {
              titulo: "Comentarios",
              valor: estadisticas.comentarios,
              detalle:
                "Registros autorizados",
              icono: MessageSquareText,
              clase: "celeste",
            },
            {
              titulo: "Documentos",
              valor: estadisticas.documentos,
              detalle:
                "Archivos autorizados",
              icono: FileText,
              clase: "morado",
            },
          ];

        case "cliente":
          return [
            {
              titulo: "Comentarios",
              valor: estadisticas.comentarios,
              detalle:
                "Opiniones enviadas",
              icono: MessageSquareText,
              clase: "celeste",
            },
            {
              titulo: "Documentos",
              valor: estadisticas.documentos,
              detalle:
                "Archivos registrados",
              icono: FileText,
              clase: "azul",
            },
            {
              titulo: "Tickets",
              valor: estadisticas.tickets,
              detalle:
                "Solicitudes de soporte",
              icono: TicketCheck,
              clase: "naranja",
            },
            {
              titulo: "Avisos nuevos",
              valor:
                estadisticas.notificaciones,
              detalle:
                "Notificaciones sin leer",
              icono: Bell,
              clase: "morado",
            },
          ];

        default:
          return [];
      }
    }, [estadisticas, rol]);

  const accesosRapidos =
    useMemo<AccesoRapido[]>(() => {
      switch (rol) {
        case "administrador":
          return [
            {
              titulo:
                "Solicitudes de acceso",
              descripcion:
                "Aprobar o rechazar usuarios",
              ruta: "/solicitudes-acceso",
              icono: UserCheck,
              clase: "azul",
            },
            {
              titulo:
                "Gestión de clientes",
              descripcion:
                "Verificar y asignar operadores",
              ruta: "/clientes",
              icono: Building2,
              clase: "celeste",
            },
            {
              titulo:
                "Administrar usuarios",
              descripcion:
                "Gestionar roles y estados",
              ruta: "/usuarios",
              icono: ShieldCheck,
              clase: "morado",
            },
          ];

        case "analista":
          return [
            {
              titulo:
                "Analizar comentarios",
              descripcion:
                "Consultar opiniones procesadas",
              ruta: "/comentarios",
              icono: MessageSquareText,
              clase: "celeste",
            },
            {
              titulo:
                "Generar predicción",
              descripcion:
                "Evaluar riesgo de cancelación",
              ruta: "/predicciones",
              icono: BrainCircuit,
              clase: "morado",
            },
            {
              titulo: "Abrir reportes",
              descripcion:
                "Consultar indicadores",
              ruta: "/reportes",
              icono: TrendingUp,
              clase: "azul",
            },
          ];

        case "operador":
          return [
            {
              titulo:
                "Clientes autorizados",
              descripcion:
                "Consultar empresas asignadas",
              ruta: "/clientes",
              icono: Users,
              clase: "azul",
            },
            {
              titulo:
                "Atender tickets",
              descripcion:
                "Tomar y responder solicitudes",
              ruta: "/tickets",
              icono: TicketCheck,
              clase: "naranja",
            },
            {
              titulo:
                "Consultar documentos",
              descripcion:
                "Revisar archivos empresariales",
              ruta: "/documentos",
              icono: FileText,
              clase: "morado",
            },
          ];

        case "cliente":
          return [
            {
              titulo: "Mi empresa",
              descripcion:
                "Actualizar información empresarial",
              ruta: "/mi-empresa",
              icono: Building2,
              clase: "azul",
            },
            {
              titulo:
                "Crear ticket",
              descripcion:
                "Solicitar atención o soporte",
              ruta: "/tickets",
              icono: TicketCheck,
              clase: "naranja",
            },
            {
              titulo:
                "Subir documento",
              descripcion:
                "Administrar archivos de tu empresa",
              ruta: "/documentos",
              icono: FileText,
              clase: "morado",
            },
          ];

        default:
          return [];
      }
    }, [rol]);

  const primerNombre =
    perfil?.nombre_completo
      ?.trim()
      .split(/\s+/)[0] ||
    "Usuario";

  return (
    <section className="ideatech-inicio">
      <div className="ideatech-inicio-bienvenida">
        <div>
          <p className="ideatech-inicio-etiqueta">
            {rol === "cliente"
              ? "Portal del cliente"
              : "Panel empresarial"}
          </p>

          <h1>Hola, {primerNombre}</h1>

          <p>
            {obtenerDescripcionRol(rol)}
          </p>
        </div>

        <div className="ideatech-inicio-estado">
          <span />
          Sesión activa
        </div>
      </div>

      {error && (
        <div className="ideatech-inicio-error">
          {error}
        </div>
      )}

      <div className="ideatech-indicadores">
        {tarjetas.map((tarjeta) => {
          const Icono = tarjeta.icono;

          return (
            <article
              key={tarjeta.titulo}
              className="ideatech-indicador"
            >
              <div
                className={`ideatech-indicador-icono ${tarjeta.clase}`}
              >
                <Icono size={25} />
              </div>

              <div>
                <span>{tarjeta.titulo}</span>

                <strong>
                  {cargando
                    ? "..."
                    : tarjeta.valor}
                </strong>

                <small>
                  {tarjeta.detalle}
                </small>
              </div>
            </article>
          );
        })}
      </div>

      <div className="ideatech-inicio-grid">
        <article className="ideatech-panel">
          <div className="ideatech-panel-titulo">
            <div>
              <p>Acciones disponibles</p>
              <h3>Accesos rápidos</h3>
            </div>

            <Activity size={22} />
          </div>

          <div className="ideatech-accesos-rapidos">
            {accesosRapidos.map(
              (acceso) => {
                const Icono = acceso.icono;

                return (
                  <Link
                    key={acceso.ruta}
                    to={acceso.ruta}
                    className="ideatech-acceso-rapido"
                  >
                    <div
                      className={`ideatech-acceso-icono ${acceso.clase}`}
                    >
                      <Icono size={19} />
                    </div>

                    <span>
                      <strong>
                        {acceso.titulo}
                      </strong>

                      <small>
                        {acceso.descripcion}
                      </small>
                    </span>

                    <span className="ideatech-acceso-flecha">
                      →
                    </span>
                  </Link>
                );
              },
            )}
          </div>
        </article>

        <article className="ideatech-panel">
          <div className="ideatech-panel-titulo">
            <div>
              <p>Cuenta actual</p>
              <h3>Información de acceso</h3>
            </div>

            <TrendingUp size={22} />
          </div>

          <div className="ideatech-cuenta">
            <div>
              <span>Nombre</span>

              <strong>
                {perfil?.nombre_completo ||
                  "Sin nombre"}
              </strong>
            </div>

            <div>
              <span>Correo</span>

              <strong>
                {perfil?.correo ||
                  "Sin registrar"}
              </strong>
            </div>

            {rol === "cliente" && (
              <div>
                <span>Empresa</span>

                <strong>
                  {perfil?.empresa ||
                    "Sin registrar"}
                </strong>
              </div>
            )}

            <div>
              <span>Rol</span>

              <strong className="ideatech-rol">
                {obtenerNombreRol(rol)}
              </strong>
            </div>

            <div>
              <span>Estado</span>

              <strong className="ideatech-activo">
                {perfil?.activo
                  ? "Activo"
                  : "Inactivo"}
              </strong>
            </div>

            <div>
              <span>Acceso</span>

              <strong className="ideatech-aprobado">
                {perfil?.estado_solicitud ===
                "aprobado"
                  ? "Aprobado"
                  : perfil?.estado_solicitud ||
                    "Sin definir"}
              </strong>
            </div>
          </div>
        </article>
      </div>

    </section>
  );
}