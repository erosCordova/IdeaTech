import { supabase } from "../lib/supabase";

import type {
  Cliente,
  EstadoCliente,
  NuevoCliente,
  RangoIngreso,
} from "../types/database";

export interface ConfiguracionServicioEmpresa {
  tipo_plan:
    | "basico"
    | "profesional"
    | "empresarial"
    | "personalizado";
  monto_suscripcion: number;
  accesos_api: number;
  servicios_activos: number;
}

export interface OperadorDisponible {
  id: string;
  nombre_completo: string;
  correo: string | null;
}

function normalizarCliente(
  cliente: Record<string, unknown>,
): Cliente {
  return {
    ...cliente,
    ingreso_mensual: Number(
      cliente.ingreso_mensual ?? 0,
    ),
    monto_suscripcion: Number(
      cliente.monto_suscripcion ?? 0,
    ),
    cantidad_empleados: Number(
      cliente.cantidad_empleados ?? 0,
    ),
    antiguedad_empresa: Number(
      cliente.antiguedad_empresa ?? 0,
    ),
    accesos_api: Number(
      cliente.accesos_api ?? 0,
    ),
    servicios_activos: Number(
      cliente.servicios_activos ?? 0,
    ),
    operador_asignado_id:
      typeof cliente.operador_asignado_id ===
      "string"
        ? cliente.operador_asignado_id
        : null,
  } as Cliente;
}

function obtenerClienteRpc(
  data: unknown,
  mensaje: string,
): Cliente {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(mensaje);
  }

  return normalizarCliente(
    data[0] as Record<string, unknown>,
  );
}

export async function listarClientes(): Promise<
  Cliente[]
> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("fecha_registro", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `No se pudieron consultar los clientes: ${error.message}`,
    );
  }

  return (data ?? []).map((cliente) =>
    normalizarCliente(
      cliente as Record<string, unknown>,
    ),
  );
}

export async function listarEmpresasPendientes(): Promise<
  Cliente[]
> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq(
      "estado_datos",
      "pendiente_verificacion",
    )
    .order("fecha_actualizacion", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `No se pudieron consultar las empresas pendientes: ${error.message}`,
    );
  }

  return (data ?? []).map((cliente) =>
    normalizarCliente(
      cliente as Record<string, unknown>,
    ),
  );
}

export async function listarOperadoresDisponibles(): Promise<
  OperadorDisponible[]
> {
  const { data, error } = await supabase
    .from("perfiles")
    .select(
      "id, nombre_completo, correo",
    )
    .eq("rol", "operador")
    .eq("activo", true)
    .eq("estado_solicitud", "aprobado")
    .order("nombre_completo", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `No se pudieron consultar los operadores: ${error.message}`,
    );
  }

  return (data ?? []).map((operador) => ({
    id: String(operador.id),
    nombre_completo:
      operador.nombre_completo ||
      "Operador sin nombre",
    correo:
      typeof operador.correo === "string"
        ? operador.correo
        : null,
  }));
}

export async function obtenerCliente(
  clienteId: number,
): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .single();

  if (error) {
    throw new Error(
      `No se pudo consultar el cliente: ${error.message}`,
    );
  }

  return normalizarCliente(
    data as Record<string, unknown>,
  );
}

export async function registrarCliente(
  nuevoCliente: NuevoCliente,
): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre: nuevoCliente.nombre.trim(),
      correo: nuevoCliente.correo
        .trim()
        .toLowerCase(),
      telefono:
        nuevoCliente.telefono?.trim() || null,
      empresa: nuevoCliente.empresa.trim(),
      ruc: nuevoCliente.ruc?.trim() || null,
      rubro_empresa:
        nuevoCliente.rubro_empresa
          .trim()
          .toLowerCase(),
      tamano_empresa:
        nuevoCliente.tamano_empresa,
      cantidad_empleados:
        nuevoCliente.cantidad_empleados,
      antiguedad_empresa:
        nuevoCliente.antiguedad_empresa,
      tipo_plan: nuevoCliente.tipo_plan,
      ingreso_mensual:
        nuevoCliente.ingreso_mensual,
      rango_ingreso:
        nuevoCliente.rango_ingreso || null,
      monto_suscripcion:
        nuevoCliente.monto_suscripcion,
      servidor_propio:
        nuevoCliente.servidor_propio,
      accesos_api: nuevoCliente.accesos_api,
      servicios_activos:
        nuevoCliente.servicios_activos,
      cancelo_servicio:
        nuevoCliente.cancelo_servicio ?? null,
      estado:
        nuevoCliente.estado ?? "activo",
      estado_datos:
        nuevoCliente.estado_datos ??
        "incompletos",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `No se pudo registrar el cliente: ${error.message}`,
    );
  }

  return normalizarCliente(
    data as Record<string, unknown>,
  );
}

export async function actualizarCliente(
  clienteId: number,
  cambios: Partial<NuevoCliente>,
): Promise<Cliente> {
  const datosActualizados: Record<
    string,
    unknown
  > = {};

  if (cambios.nombre !== undefined) {
    datosActualizados.nombre =
      cambios.nombre.trim();
  }

  if (cambios.correo !== undefined) {
    datosActualizados.correo =
      cambios.correo.trim().toLowerCase();
  }

  if (cambios.telefono !== undefined) {
    datosActualizados.telefono =
      cambios.telefono?.trim() || null;
  }

  if (cambios.empresa !== undefined) {
    datosActualizados.empresa =
      cambios.empresa.trim();
  }

  if (cambios.ruc !== undefined) {
    datosActualizados.ruc =
      cambios.ruc?.trim() || null;
  }

  if (cambios.rubro_empresa !== undefined) {
    datosActualizados.rubro_empresa =
      cambios.rubro_empresa
        .trim()
        .toLowerCase();
  }

  if (cambios.tamano_empresa !== undefined) {
    datosActualizados.tamano_empresa =
      cambios.tamano_empresa;
  }

  if (
    cambios.cantidad_empleados !== undefined
  ) {
    datosActualizados.cantidad_empleados =
      cambios.cantidad_empleados;
  }

  if (
    cambios.antiguedad_empresa !== undefined
  ) {
    datosActualizados.antiguedad_empresa =
      cambios.antiguedad_empresa;
  }

  if (cambios.tipo_plan !== undefined) {
    datosActualizados.tipo_plan =
      cambios.tipo_plan;
  }

  if (cambios.ingreso_mensual !== undefined) {
    datosActualizados.ingreso_mensual =
      cambios.ingreso_mensual;
  }

  if (cambios.rango_ingreso !== undefined) {
    datosActualizados.rango_ingreso =
      cambios.rango_ingreso;
  }

  if (
    cambios.monto_suscripcion !== undefined
  ) {
    datosActualizados.monto_suscripcion =
      cambios.monto_suscripcion;
  }

  if (
    cambios.servidor_propio !== undefined
  ) {
    datosActualizados.servidor_propio =
      cambios.servidor_propio;
  }

  if (cambios.accesos_api !== undefined) {
    datosActualizados.accesos_api =
      cambios.accesos_api;
  }

  if (
    cambios.servicios_activos !== undefined
  ) {
    datosActualizados.servicios_activos =
      cambios.servicios_activos;
  }

  if (
    cambios.cancelo_servicio !== undefined
  ) {
    datosActualizados.cancelo_servicio =
      cambios.cancelo_servicio;
  }

  if (cambios.estado !== undefined) {
    datosActualizados.estado =
      cambios.estado;
  }

  if (cambios.estado_datos !== undefined) {
    datosActualizados.estado_datos =
      cambios.estado_datos;
  }

  datosActualizados.fecha_actualizacion =
    new Date().toISOString();

  const { data, error } = await supabase
    .from("clientes")
    .update(datosActualizados)
    .eq("id", clienteId)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `No se pudo actualizar el cliente: ${error.message}`,
    );
  }

  return normalizarCliente(
    data as Record<string, unknown>,
  );
}

export async function asignarOperadorCliente(
  clienteId: number,
  operadorId: string | null,
): Promise<Cliente> {
  const { data, error } = await supabase.rpc(
    "asignar_operador_cliente",
    {
      cliente_solicitud: clienteId,
      operador_solicitud: operadorId,
    },
  );

  if (error) {
    throw new Error(
      operadorId
        ? `No se pudo asignar el operador: ${error.message}`
        : `No se pudo retirar el operador: ${error.message}`,
    );
  }

  return obtenerClienteRpc(
    data,
    operadorId
      ? "Supabase no devolvió el cliente actualizado."
      : "Supabase no confirmó la eliminación de la asignación.",
  );
}

export async function verificarDatosEmpresa(
  clienteId: number,
  configuracion: ConfiguracionServicioEmpresa,
): Promise<Cliente> {
  if (configuracion.monto_suscripcion < 0) {
    throw new Error(
      "El monto de suscripción no es válido.",
    );
  }

  if (configuracion.accesos_api < 0) {
    throw new Error(
      "La cantidad de accesos API no es válida.",
    );
  }

  if (configuracion.servicios_activos < 0) {
    throw new Error(
      "La cantidad de servicios no es válida.",
    );
  }

  const { data, error } = await supabase.rpc(
    "verificar_datos_empresa",
    {
      cliente_solicitud: clienteId,
      plan_asignado:
        configuracion.tipo_plan,
      precio_suscripcion:
        configuracion.monto_suscripcion,
      cantidad_accesos_api:
        configuracion.accesos_api,
      cantidad_servicios:
        configuracion.servicios_activos,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo verificar la empresa: ${error.message}`,
    );
  }

  return obtenerClienteRpc(
    data,
    "Supabase no devolvió la empresa verificada.",
  );
}

export async function solicitarCorreccionEmpresa(
  clienteId: number,
  motivo: string,
): Promise<Cliente> {
  const motivoLimpio = motivo.trim();

  if (motivoLimpio.length < 5) {
    throw new Error(
      "El motivo debe tener al menos 5 caracteres.",
    );
  }

  const { data, error } = await supabase.rpc(
    "solicitar_correccion_empresa",
    {
      cliente_solicitud: clienteId,
      motivo: motivoLimpio,
    },
  );

  if (error) {
    throw new Error(
      `No se pudo solicitar la corrección: ${error.message}`,
    );
  }

  return obtenerClienteRpc(
    data,
    "Supabase no devolvió la empresa actualizada.",
  );
}

export async function cambiarEstadoCliente(
  clienteId: number,
  estado: EstadoCliente,
): Promise<Cliente> {
  return actualizarCliente(clienteId, {
    estado,
  });
}

export async function eliminarCliente(
  clienteId: number,
): Promise<void> {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", clienteId);

  if (error) {
    throw new Error(
      `No se pudo eliminar el cliente: ${error.message}`,
    );
  }
}

export function obtenerNombreRango(
  rango: RangoIngreso | null,
): string {
  const nombres: Record<RangoIngreso, string> =
    {
      menos_10000:
        "Menos de S/ 10,000",
      "10000_30000":
        "S/ 10,000 a S/ 30,000",
      "30001_100000":
        "S/ 30,001 a S/ 100,000",
      "100001_500000":
        "S/ 100,001 a S/ 500,000",
      mas_500000:
        "Más de S/ 500,000",
    };

  return rango
    ? nombres[rango]
    : "No declarado";
}