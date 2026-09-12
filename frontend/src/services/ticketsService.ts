import { supabase } from "../lib/supabase";

import type {
  Cliente,
  EstadoTicket,
  NuevoTicket,
  PrioridadTicket,
  Ticket,
} from "../types/database";

export interface DatosClienteTicket {
  id: number;
  nombre: string;
  correo: string;
  empresa: string;
}

export interface DatosOperadorTicket {
  id: string;
  nombre_completo: string;
  correo: string;
}

export interface TicketConRelaciones
  extends Ticket {
  cliente: DatosClienteTicket | null;
  operador: DatosOperadorTicket | null;
}

interface ClienteTicketRespuesta {
  id: number;
  nombre: string;
  correo: string;
  empresa: string;
}

interface OperadorTicketRespuesta {
  id: string;
  nombre_completo: string;
  correo: string;
}

function normalizarTicket(
  datos: Record<string, unknown>,
  clientes: Map<number, DatosClienteTicket>,
  operadores: Map<
    string,
    DatosOperadorTicket
  >
): TicketConRelaciones {
  const clienteId = Number(
    datos.cliente_id
  );

  const operadorId =
    typeof datos.operador_asignado_id ===
    "string"
      ? datos.operador_asignado_id
      : null;

  return {
    id: Number(datos.id),
    cliente_id: clienteId,
    usuario_id: String(
      datos.usuario_id ?? ""
    ),
    operador_asignado_id: operadorId,
    titulo: String(datos.titulo ?? ""),
    descripcion: String(
      datos.descripcion ?? ""
    ),
    prioridad: String(
      datos.prioridad ?? "media"
    ) as PrioridadTicket,
    estado: String(
      datos.estado ?? "pendiente"
    ) as EstadoTicket,
    respuesta:
      typeof datos.respuesta === "string"
        ? datos.respuesta
        : null,
    fecha_inicio: String(
      datos.fecha_inicio ?? ""
    ),
    fecha_asignacion:
      typeof datos.fecha_asignacion ===
      "string"
        ? datos.fecha_asignacion
        : null,
    fecha_respuesta:
      typeof datos.fecha_respuesta ===
      "string"
        ? datos.fecha_respuesta
        : null,
    fecha_cierre:
      typeof datos.fecha_cierre === "string"
        ? datos.fecha_cierre
        : null,
    fecha_actualizacion: String(
      datos.fecha_actualizacion ?? ""
    ),
    cliente:
      clientes.get(clienteId) ?? null,
    operador:
      operadorId !== null
        ? operadores.get(operadorId) ?? null
        : null,
  };
}

export async function listarTickets(): Promise<
  TicketConRelaciones[]
> {
  const { data, error } = await supabase
    .from("solicitudes")
    .select(
      `
        id,
        cliente_id,
        usuario_id,
        operador_asignado_id,
        titulo,
        descripcion,
        prioridad,
        estado,
        respuesta,
        fecha_inicio,
        fecha_asignacion,
        fecha_respuesta,
        fecha_cierre,
        fecha_actualizacion
      `
    )
    .order("fecha_inicio", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `No se pudieron consultar los tickets: ${error.message}`
    );
  }

  const tickets =
    (data ?? []) as Record<string, unknown>[];

  const clientesIds = [
    ...new Set(
      tickets
        .map((ticket) =>
          Number(ticket.cliente_id)
        )
        .filter(
          (clienteId) =>
            Number.isInteger(clienteId) &&
            clienteId > 0
        )
    ),
  ];

  const operadoresIds = [
    ...new Set(
      tickets
        .map(
          (ticket) =>
            ticket.operador_asignado_id
        )
        .filter(
          (operadorId): operadorId is string =>
            typeof operadorId === "string" &&
            operadorId.length > 0
        )
    ),
  ];

  const clientes = new Map<
    number,
    DatosClienteTicket
  >();

  const operadores = new Map<
    string,
    DatosOperadorTicket
  >();

  if (clientesIds.length > 0) {
    const {
      data: datosClientes,
      error: errorClientes,
    } = await supabase
      .from("clientes")
      .select(
        "id, nombre, correo, empresa"
      )
      .in("id", clientesIds);

    if (errorClientes) {
      throw new Error(
        "No se pudieron consultar los clientes " +
          `de los tickets: ${errorClientes.message}`
      );
    }

    (
      (datosClientes ??
        []) as ClienteTicketRespuesta[]
    ).forEach((cliente) => {
      clientes.set(cliente.id, cliente);
    });
  }

  if (operadoresIds.length > 0) {
    const {
      data: datosOperadores,
      error: errorOperadores,
    } = await supabase
      .from("perfiles")
      .select(
        "id, nombre_completo, correo"
      )
      .in("id", operadoresIds);

    if (errorOperadores) {
      throw new Error(
        "No se pudieron consultar los operadores " +
          `de los tickets: ${errorOperadores.message}`
      );
    }

    (
      (datosOperadores ??
        []) as OperadorTicketRespuesta[]
    ).forEach((operador) => {
      operadores.set(operador.id, operador);
    });
  }

  return tickets.map((ticket) =>
    normalizarTicket(
      ticket,
      clientes,
      operadores
    )
  );
}

export async function listarClientesParaTickets(): Promise<
  Cliente[]
> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("estado", "activo")
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `No se pudieron consultar los clientes: ${error.message}`
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

export async function crearTicket(
  nuevoTicket: NuevoTicket
): Promise<Ticket> {
  const {
    data: datosSesion,
    error: errorSesion,
  } = await supabase.auth.getSession();

  if (errorSesion) {
    throw new Error(
      `No se pudo consultar la sesión: ${errorSesion.message}`
    );
  }

  const usuarioId =
    datosSesion.session?.user.id;

  if (!usuarioId) {
    throw new Error(
      "No existe una sesión activa."
    );
  }

  const titulo =
    nuevoTicket.titulo.trim();

  const descripcion =
    nuevoTicket.descripcion.trim();

  if (titulo.length < 5) {
    throw new Error(
      "El título debe tener al menos 5 caracteres."
    );
  }

  if (descripcion.length < 10) {
    throw new Error(
      "La descripción debe tener al menos 10 caracteres."
    );
  }

  const { data, error } = await supabase
    .from("solicitudes")
    .insert({
      cliente_id: nuevoTicket.cliente_id,
      usuario_id: usuarioId,
      titulo,
      descripcion,
      prioridad: nuevoTicket.prioridad,
      estado: "pendiente",
      operador_asignado_id: null,
      respuesta: null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear el ticket: ${error.message}`
    );
  }

  return data as Ticket;
}

export async function tomarTicket(
  ticketId: number
): Promise<Ticket> {
  const { data, error } = await supabase.rpc(
    "tomar_ticket",
    {
      ticket_solicitud: ticketId,
    }
  );

  if (error) {
    throw new Error(
      `No se pudo tomar el ticket: ${error.message}`
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      "Supabase no devolvió el ticket asignado."
    );
  }

  return data[0] as Ticket;
}

export async function responderTicket(
  ticketId: number,
  respuesta: string,
  estado: Exclude<
    EstadoTicket,
    "pendiente"
  >
): Promise<Ticket> {
  const respuestaLimpia =
    respuesta.trim();

  if (respuestaLimpia.length < 5) {
    throw new Error(
      "La respuesta debe tener al menos 5 caracteres."
    );
  }

  const { data, error } = await supabase.rpc(
    "responder_ticket",
    {
      ticket_solicitud: ticketId,
      respuesta_ticket: respuestaLimpia,
      nuevo_estado: estado,
    }
  );

  if (error) {
    throw new Error(
      `No se pudo responder el ticket: ${error.message}`
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      "Supabase no devolvió el ticket actualizado."
    );
  }

  return data[0] as Ticket;
}

export async function eliminarTicket(
  ticketId: number
): Promise<void> {
  const { error } = await supabase
    .from("solicitudes")
    .delete()
    .eq("id", ticketId);

  if (error) {
    throw new Error(
      `No se pudo eliminar el ticket: ${error.message}`
    );
  }
}

export function obtenerNombrePrioridad(
  prioridad: PrioridadTicket
): string {
  const nombres: Record<
    PrioridadTicket,
    string
  > = {
    baja: "Baja",
    media: "Media",
    alta: "Alta",
    critica: "Crítica",
  };

  return nombres[prioridad];
}

export function obtenerNombreEstadoTicket(
  estado: EstadoTicket
): string {
  const nombres: Record<
    EstadoTicket,
    string
  > = {
    pendiente: "Pendiente",
    en_proceso: "En proceso",
    resuelta: "Resuelta",
    cancelada: "Cancelada",
  };

  return nombres[estado];
}