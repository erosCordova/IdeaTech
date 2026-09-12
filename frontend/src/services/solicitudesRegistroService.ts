import { supabase } from "../lib/supabase";

import type {
  EstadoSolicitudRegistro,
  Perfil,
  RolUsuario,
} from "../types/database";

export interface FiltrosSolicitudesRegistro {
  estado?: EstadoSolicitudRegistro;
  busqueda?: string;
}

function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error desconocido.";
}

export async function listarSolicitudesRegistro(
  filtros: FiltrosSolicitudesRegistro = {},
): Promise<Perfil[]> {
  let consulta = supabase
    .from("perfiles")
    .select("*")
    .order("fecha_registro", {
      ascending: false,
    });

  if (filtros.estado) {
    consulta = consulta.eq(
      "estado_solicitud",
      filtros.estado,
    );
  }

  const busqueda = filtros.busqueda?.trim();

  if (busqueda) {
    consulta = consulta.or(
      [
        `nombre_completo.ilike.%${busqueda}%`,
        `correo.ilike.%${busqueda}%`,
        `empresa.ilike.%${busqueda}%`,
        `cargo.ilike.%${busqueda}%`,
      ].join(","),
    );
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(
      `No se pudieron cargar las solicitudes: ${error.message}`,
    );
  }

  return (data ?? []) as Perfil[];
}

export async function obtenerSolicitudRegistro(
  usuarioId: string,
): Promise<Perfil> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", usuarioId)
    .single();

  if (error) {
    throw new Error(
      `No se pudo consultar la solicitud: ${error.message}`,
    );
  }

  return data as Perfil;
}

export async function aprobarSolicitudRegistro(
  usuarioId: string,
  rolAsignado: RolUsuario = "cliente",
): Promise<void> {
  try {
    const { error } = await supabase.rpc(
      "aprobar_usuario",
      {
        usuario_solicitud: usuarioId,
        rol_asignado: rolAsignado,
      },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    throw new Error(
      `No se pudo aprobar la solicitud: ${obtenerMensajeError(error)}`,
    );
  }
}

export async function rechazarSolicitudRegistro(
  usuarioId: string,
  motivo: string,
): Promise<void> {
  const motivoLimpio = motivo.trim();

  if (!motivoLimpio) {
    throw new Error(
      "Debes escribir el motivo del rechazo.",
    );
  }

  try {
    const { error } = await supabase.rpc(
      "rechazar_usuario",
      {
        usuario_solicitud: usuarioId,
        motivo: motivoLimpio,
      },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    throw new Error(
      `No se pudo rechazar la solicitud: ${obtenerMensajeError(error)}`,
    );
  }
}

export async function contarSolicitudesRegistro(): Promise<{
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  total: number;
}> {
  const estados: EstadoSolicitudRegistro[] = [
    "pendiente",
    "aprobado",
    "rechazado",
  ];

  const resultados = await Promise.all(
    estados.map(async (estado) => {
      const { count, error } = await supabase
        .from("perfiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("estado_solicitud", estado);

      if (error) {
        throw new Error(
          `No se pudo contar las solicitudes ${estado}: ${error.message}`,
        );
      }

      return count ?? 0;
    }),
  );

  const [pendientes, aprobadas, rechazadas] =
    resultados;

  return {
    pendientes,
    aprobadas,
    rechazadas,
    total: pendientes + aprobadas + rechazadas,
  };
}