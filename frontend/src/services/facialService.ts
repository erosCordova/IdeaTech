import { supabase } from "../lib/supabase";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/* =========================================================
   RESPUESTAS DEL BACKEND
========================================================= */

export interface RegistroFacialRespuesta {
  usuario_id: string;
  nombre: string;
  mensaje: string;
}

export interface ReconocimientoFacialRespuesta {
  rostro_detectado: boolean;
  reconocido: boolean;
  nombre: string | null;
  dni: string | null;
  correo: string | null;
  rol: string | null;
  estado: string | null;
  coincidencia: number | null;
  distancia: number | null;
  mensaje: string;
}

export interface EstadoFacialPropioRespuesta {
  registrado: boolean;
  mensaje: string;
}

export interface LoginFacialRespuesta {
  autenticado: boolean;
  token_hash: string | null;
  tipo_verificacion: string | null;
  mensaje: string;
}

interface RespuestaErrorBackend {
  detail?: string;
}

/* =========================================================
   TOKEN DE SUPABASE
========================================================= */

async function obtenerToken(): Promise<string> {
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

/* =========================================================
   MENSAJES DE ERROR
========================================================= */

async function obtenerMensajeError(
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
    // Si FastAPI no devuelve JSON,
    // utilizamos el código HTTP.
  }

  return (
    "El backend respondió con el código " +
    `${respuesta.status}.`
  );
}

/* =========================================================
   PETICIÓN AUTENTICADA
========================================================= */

async function realizarPeticion<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const token = await obtenerToken();

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}${ruta}`,
      {
        ...opciones,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...opciones.headers,
        },
      },
    );
  } catch {
    throw new Error(
      "No se pudo conectar con el backend " +
        "de IdeaTech. Comprueba que FastAPI " +
        "esté ejecutándose.",
    );
  }

  if (!respuesta.ok) {
    const mensaje =
      await obtenerMensajeError(respuesta);

    throw new Error(mensaje);
  }

  return (await respuesta.json()) as T;
}

/* =========================================================
   PETICIÓN PÚBLICA
========================================================= */

async function realizarPeticionPublica<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${API_URL}${ruta}`,
      {
        ...opciones,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...opciones.headers,
        },
      },
    );
  } catch {
    throw new Error(
      "No se pudo conectar con el backend " +
        "de IdeaTech. Comprueba que FastAPI " +
        "esté ejecutándose.",
    );
  }

  if (!respuesta.ok) {
    const mensaje =
      await obtenerMensajeError(respuesta);

    throw new Error(mensaje);
  }

  return (await respuesta.json()) as T;
}

/* =========================================================
   REGISTRAR ROSTRO - ADMINISTRADOR
========================================================= */

export async function registrarRostro(
  usuarioId: string,
  imagenBase64: string,
): Promise<RegistroFacialRespuesta> {
  if (!usuarioId.trim()) {
    throw new Error(
      "Debes seleccionar un usuario.",
    );
  }

  if (!imagenBase64.trim()) {
    throw new Error(
      "No se recibió una imagen del rostro.",
    );
  }

  return realizarPeticion<RegistroFacialRespuesta>(
    "/api/v1/facial/registrar",
    {
      method: "POST",
      body: JSON.stringify({
        usuario_id: usuarioId,
        imagen: imagenBase64,
      }),
    },
  );
}

/* =========================================================
   RECONOCER ROSTRO - PRUEBA FACIAL
========================================================= */

export async function reconocerRostro(
  imagenBase64: string,
): Promise<ReconocimientoFacialRespuesta> {
  if (!imagenBase64.trim()) {
    throw new Error(
      "No se recibió una imagen del rostro.",
    );
  }

  return realizarPeticion<ReconocimientoFacialRespuesta>(
    "/api/v1/facial/reconocer",
    {
      method: "POST",
      body: JSON.stringify({
        imagen: imagenBase64,
      }),
    },
  );
}

/* =========================================================
   CONSULTAR SI EL USUARIO YA TIENE ROSTRO
========================================================= */

export async function consultarEstadoFacialPropio():
Promise<EstadoFacialPropioRespuesta> {
  return realizarPeticion<EstadoFacialPropioRespuesta>(
    "/api/v1/facial/estado-propio",
    {
      method: "GET",
    },
  );
}

/* =========================================================
   REGISTRAR EL ROSTRO DEL USUARIO AUTENTICADO
========================================================= */

export async function registrarRostroPropio(
  imagenBase64: string,
): Promise<RegistroFacialRespuesta> {
  if (!imagenBase64.trim()) {
    throw new Error(
      "No se recibió una imagen del rostro.",
    );
  }

  return realizarPeticion<RegistroFacialRespuesta>(
    "/api/v1/facial/registrar-propio",
    {
      method: "POST",
      body: JSON.stringify({
        imagen: imagenBase64,
      }),
    },
  );
}

/* =========================================================
   LOGIN MEDIANTE RECONOCIMIENTO FACIAL
========================================================= */

export async function iniciarSesionFacial(
  imagenBase64: string,
): Promise<LoginFacialRespuesta> {
  if (!imagenBase64.trim()) {
    throw new Error(
      "No se recibió una imagen del rostro.",
    );
  }

  return realizarPeticionPublica<LoginFacialRespuesta>(
    "/api/v1/facial/login",
    {
      method: "POST",
      body: JSON.stringify({
        imagen: imagenBase64,
      }),
    },
  );
}

/* =========================================================
   CONVERTIR LOGIN FACIAL EN SESIÓN DE SUPABASE
========================================================= */

export async function verificarTokenFacial(
  tokenHash: string,
): Promise<void> {
  if (!tokenHash.trim()) {
    throw new Error(
      "No se recibió el token de autenticación facial.",
    );
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    throw new Error(
      "El rostro fue reconocido, pero no se pudo " +
        "iniciar la sesión.",
    );
  }
}