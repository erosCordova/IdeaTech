import { supabase } from "../lib/supabase";

import type {
  Comentario,
  Sentimiento,
} from "../types/database";

export interface ClienteComentario {
  id: number;
  nombre: string;
  correo: string;
  empresa: string;
}

export interface ComentarioConCliente
  extends Comentario {
  cliente: ClienteComentario | null;
}

export interface NuevoComentario {
  contenido: string;
  canal?: string;
}

interface ClienteRelacion {
  id: number;
  nombre: string;
  correo: string;
  empresa: string;
}

interface ComentarioRespuesta
  extends Comentario {
  clientes:
    | ClienteRelacion
    | ClienteRelacion[]
    | null;
}

function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

function normalizarComentario(
  comentario: ComentarioRespuesta,
): ComentarioConCliente {
  const relacion = Array.isArray(comentario.clientes)
    ? comentario.clientes[0] ?? null
    : comentario.clientes;

  const {
    clientes: _clientes,
    ...datosComentario
  } = comentario;

  return {
    ...datosComentario,
    cliente: relacion,
  };
}

export async function listarComentarios(): Promise<
  ComentarioConCliente[]
> {
  const { data, error } = await supabase
    .from("comentarios")
    .select(
      `
        *,
        clientes (
          id,
          nombre,
          correo,
          empresa
        )
      `,
    )
    .order("fecha_registro", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `No se pudieron cargar los comentarios: ${error.message}`,
    );
  }

  return ((data ?? []) as ComentarioRespuesta[]).map(
    normalizarComentario,
  );
}

export async function obtenerClienteActual(): Promise<ClienteComentario> {
  const {
    data: datosUsuario,
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !datosUsuario.user) {
    throw new Error(
      "No se pudo identificar al usuario conectado.",
    );
  }

  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre, correo, empresa")
    .eq("usuario_id", datosUsuario.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar el cliente: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Tu cuenta todavía no tiene un cliente asociado. Comunícate con el administrador.",
    );
  }

  return data as ClienteComentario;
}

export async function crearComentario(
  nuevoComentario: NuevoComentario,
): Promise<Comentario> {
  const contenido = nuevoComentario.contenido.trim();
  const canal =
    nuevoComentario.canal?.trim() || "web";

  if (contenido.length < 5) {
    throw new Error(
      "El comentario debe tener al menos 5 caracteres.",
    );
  }

  if (contenido.length > 2000) {
    throw new Error(
      "El comentario no puede superar los 2000 caracteres.",
    );
   }

  try {
    const {
      data: datosUsuario,
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario || !datosUsuario.user) {
      throw new Error(
        "No se pudo identificar al usuario conectado.",
      );
    }

    const cliente = await obtenerClienteActual();

    const { data, error } = await supabase
      .from("comentarios")
      .insert({
        cliente_id: cliente.id,
        usuario_id: datosUsuario.user.id,
        contenido,
        canal,
        categoria: null,
        sentimiento: null,
        polaridad: null,
        procesado: false,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as Comentario;
  } catch (error) {
    throw new Error(
      `No se pudo registrar el comentario: ${obtenerMensajeError(error)}`,
    );
  }
}

export async function actualizarAnalisisComentario(
  comentarioId: number,
  categoria: string,
  sentimiento: Sentimiento,
  polaridad: number,
): Promise<Comentario> {
  const categoriaLimpia = categoria.trim();

  if (!categoriaLimpia) {
    throw new Error(
      "La categoría es obligatoria.",
    );
  }

  if (polaridad < -1 || polaridad > 1) {
    throw new Error(
      "La polaridad debe estar entre -1 y 1.",
    );
  }

  const { data, error } = await supabase
    .from("comentarios")
    .update({
      categoria: categoriaLimpia,
      sentimiento,
      polaridad,
      procesado: true,
      fecha_actualizacion:
        new Date().toISOString(),
    })
    .eq("id", comentarioId)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `No se pudo actualizar el análisis: ${error.message}`,
    );
  }

  return data as Comentario;
}