import { supabase } from "../lib/supabase";

import type {
  Cliente,
  Prediccion,
} from "../types/database";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export interface InformacionModelo {
  modelo: string;
  version: string;
  registros_totales: number;
  exactitud: number;
  roc_auc: number;
  columnas_modelo: string[];
}

export interface PrediccionGenerada {
  id: number;
  cliente_id: number;
  cliente: string;
  empresa: string;
  modelo: string;
  version_modelo: string;
  clase_predicha: boolean;
  probabilidad_cancelacion: number;
  nivel_riesgo: "bajo" | "medio" | "alto";
  fecha_prediccion: string;
  mensaje: string;
}

export interface PrediccionConCliente
  extends Prediccion {
  cliente: {
    id: number;
    nombre: string;
    correo: string;
    empresa: string;
    tipo_plan: string;
  } | null;
}

interface PrediccionRespuesta
  extends Prediccion {
  clientes:
    | {
        id: number;
        nombre: string;
        correo: string;
        empresa: string;
        tipo_plan: string;
      }
    | {
        id: number;
        nombre: string;
        correo: string;
        empresa: string;
        tipo_plan: string;
      }[]
    | null;
}

interface RespuestaErrorBackend {
  detail?: string;
}

async function obtenerToken(): Promise<string> {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw new Error(
      `No se pudo consultar la sesión: ${error.message}`
    );
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error(
      "No existe una sesión activa."
    );
  }

  return token;
}

async function obtenerMensajeError(
  respuesta: Response
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
    return (
      `El backend respondió con el código ` +
      `${respuesta.status}.`
    );
  }

  return (
    `El backend respondió con el código ` +
    `${respuesta.status}.`
  );
}

async function realizarPeticion<T>(
  ruta: string,
  opciones: RequestInit = {}
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
          ...opciones.headers,
        },
      }
    );
  } catch {
    throw new Error(
      "No se pudo conectar con el backend de " +
      "IdeaTech. Comprueba que FastAPI esté " +
      "ejecutándose."
    );
  }

  if (!respuesta.ok) {
    const mensaje =
      await obtenerMensajeError(respuesta);

    throw new Error(mensaje);
  }

  return (await respuesta.json()) as T;
}

export async function obtenerInformacionModelo(): Promise<InformacionModelo> {
  return realizarPeticion<InformacionModelo>(
    "/api/v1/predicciones/modelo"
  );
}

export async function listarClientesParaPrediccion(): Promise<
  Cliente[]
> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `No se pudieron cargar los clientes: ${error.message}`
    );
  }

  return (data ?? []).map((cliente) => ({
    ...cliente,
    cantidad_empleados: Number(
      cliente.cantidad_empleados
    ),
    antiguedad_empresa: Number(
      cliente.antiguedad_empresa
    ),
    ingreso_mensual: Number(
      cliente.ingreso_mensual
    ),
    monto_suscripcion: Number(
      cliente.monto_suscripcion
    ),
    accesos_api: Number(
      cliente.accesos_api
    ),
    servicios_activos: Number(
      cliente.servicios_activos
    ),
  })) as Cliente[];
}

export async function generarPrediccion(
  clienteId: number
): Promise<PrediccionGenerada> {
  return realizarPeticion<PrediccionGenerada>(
    `/api/v1/predicciones/cliente/${clienteId}`,
    {
      method: "POST",
    }
  );
}

export async function listarPredicciones(): Promise<
  PrediccionConCliente[]
> {
  const { data, error } = await supabase
    .from("predicciones")
    .select(
      `
        *,
        clientes (
          id,
          nombre,
          correo,
          empresa,
          tipo_plan
        )
      `
    )
    .order("fecha_prediccion", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `No se pudieron cargar las predicciones: ${error.message}`
    );
  }

  return (
    (data ?? []) as PrediccionRespuesta[]
  ).map((prediccion) => {
    const relacion = Array.isArray(
      prediccion.clientes
    )
      ? prediccion.clientes[0] ?? null
      : prediccion.clientes;

    const {
      clientes: _clientes,
      ...datosPrediccion
    } = prediccion;

    return {
      ...datosPrediccion,
      probabilidad_cancelacion: Number(
        datosPrediccion
          .probabilidad_cancelacion
      ),
      cliente: relacion,
    };
  });
}