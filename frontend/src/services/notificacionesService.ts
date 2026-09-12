import type {
  RealtimeChannel,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

import type {
  Notificacion,
} from "../types/database";

export type TipoNotificacion =
  | "informacion"
  | "advertencia"
  | "riesgo"
  | "exito"
  | "error";

export interface NuevaNotificacion {
  usuario_id: string;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
}

function validarNotificacion(
  notificacion: NuevaNotificacion,
): void {
  if (!notificacion.usuario_id.trim()) {
    throw new Error(
      "Debes seleccionar un usuario.",
    );
  }

  if (notificacion.titulo.trim().length < 3) {
    throw new Error(
      "El título debe tener al menos 3 caracteres.",
    );
  }

  if (notificacion.mensaje.trim().length < 5) {
    throw new Error(
      "El mensaje debe tener al menos 5 caracteres.",
    );
  }
}

export async function listarNotificaciones(): Promise<
  Notificacion[]
> {
  const { data, error } = await supabase
    .from("notificaciones")
    .select("*")
    .order("fecha_registro", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `No se pudieron cargar las notificaciones: ${error.message}`,
    );
  }

  return (data ?? []) as Notificacion[];
}

export async function crearNotificacion(
  nuevaNotificacion: NuevaNotificacion,
): Promise<Notificacion> {
  validarNotificacion(nuevaNotificacion);

  const { data, error } = await supabase
    .from("notificaciones")
    .insert({
      usuario_id:
        nuevaNotificacion.usuario_id.trim(),
      titulo: nuevaNotificacion.titulo.trim(),
      mensaje: nuevaNotificacion.mensaje.trim(),
      tipo: nuevaNotificacion.tipo,
      leida: false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear la notificación: ${error.message}`,
    );
  }

  return data as Notificacion;
}

export async function marcarNotificacionLeida(
  notificacionId: number,
): Promise<void> {
  const { error } = await supabase
    .from("notificaciones")
    .update({
      leida: true,
    })
    .eq("id", notificacionId);

  if (error) {
    throw new Error(
      `No se pudo marcar la notificación: ${error.message}`,
    );
  }
}

export async function marcarTodasComoLeidas(): Promise<void> {
  const {
    data: datosUsuario,
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !datosUsuario.user) {
    throw new Error(
      "No se pudo identificar al usuario conectado.",
    );
  }

  const { error } = await supabase
    .from("notificaciones")
    .update({
      leida: true,
    })
    .eq("usuario_id", datosUsuario.user.id)
    .eq("leida", false);

  if (error) {
    throw new Error(
      `No se pudieron actualizar las notificaciones: ${error.message}`,
    );
  }
}

export async function eliminarNotificacion(
  notificacionId: number,
): Promise<void> {
  const { error } = await supabase
    .from("notificaciones")
    .delete()
    .eq("id", notificacionId);

  if (error) {
    throw new Error(
      `No se pudo eliminar la notificación: ${error.message}`,
    );
  }
}

export async function obtenerCantidadNoLeidas(): Promise<number> {
  const {
    data: datosUsuario,
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !datosUsuario.user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notificaciones")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("usuario_id", datosUsuario.user.id)
    .eq("leida", false);

  if (error) {
    throw new Error(
      `No se pudo contar las notificaciones: ${error.message}`,
    );
  }

  return count ?? 0;
}

export function escucharNotificaciones(
  usuarioId: string,
  esAdministrador: boolean,
  alCambiar: () => void,
): RealtimeChannel {
  const configuracion = {
    event: "*" as const,
    schema: "public",
    table: "notificaciones",
  };

  const canal = esAdministrador
    ? supabase
        .channel(
          `notificaciones-administrador-${usuarioId}`,
        )
        .on(
          "postgres_changes",
          configuracion,
          () => {
            alCambiar();
          },
        )
    : supabase
        .channel(`notificaciones-${usuarioId}`)
        .on(
          "postgres_changes",
          {
            ...configuracion,
            filter: `usuario_id=eq.${usuarioId}`,
          },
          () => {
            alCambiar();
          },
        );

  void canal.subscribe();

  return canal;
}

export async function detenerEscuchaNotificaciones(
  canal: RealtimeChannel,
): Promise<void> {
  await supabase.removeChannel(canal);
}