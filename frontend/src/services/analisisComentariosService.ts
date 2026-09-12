import { supabase } from "../lib/supabase";

export interface ResultadoComentarioAnalizado {
  id: number;
  cliente_id: number;
  contenido: string;
  categoria: string;
  sentimiento:
    | "positivo"
    | "neutral"
    | "negativo";
  polaridad: number;
  procesado: boolean;
  mensaje: string;
}

interface RespuestaErrorBackend {
  detail?: string;
}

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

async function obtenerTokenAcceso(): Promise<string> {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw new Error(
      `No se pudo consultar la sesión: ${error.message}`,
    );
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error(
      "No existe una sesión activa.",
    );
  }

  return token;
}

async function obtenerMensajeRespuesta(
  respuesta: Response,
): Promise<string> {
  try {
    const datos =
      (await respuesta.json()) as RespuestaErrorBackend;

    if (
      typeof datos.detail === "string" &&
      datos.detail.trim()
    ) {
      return datos.detail;
    }
  } catch {
    return `El backend respondió con el código ${respuesta.status}.`;
  }

  return `El backend respondió con el código ${respuesta.status}.`;
}

export async function analizarComentarioGuardado(
  comentarioId: number,
): Promise<ResultadoComentarioAnalizado> {
  const token = await obtenerTokenAcceso();

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}/api/v1/comentarios/${comentarioId}/analizar`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch {
    throw new Error(
      "No se pudo conectar con el backend de IdeaTech. Comprueba que FastAPI esté ejecutándose.",
    );
  }

  if (!respuesta.ok) {
    const mensaje =
      await obtenerMensajeRespuesta(respuesta);

    throw new Error(
      `No se pudo analizar el comentario: ${mensaje}`,
    );
  }

  return (await respuesta.json()) as ResultadoComentarioAnalizado;
}