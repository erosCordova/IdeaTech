import { supabase } from "../lib/supabase";

import type {
  EstadoSolicitudRegistro,
  RolUsuario,
} from "../types/database";

export interface UsuarioAdministrable {
  id: string;
  nombre_completo: string;
  dni: string | null;
  correo: string;
  telefono: string | null;
  empresa: string | null;
  cargo: string | null;
  rol: RolUsuario | "cliente";
  activo: boolean;
  estado_solicitud: EstadoSolicitudRegistro;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface ResumenUsuarios {
  total: number;
  activos: number;
  inactivos: number;
  administradores: number;
  analistas: number;
  operadores: number;
  clientes: number;
}

function normalizarUsuario(
  usuario: Record<string, unknown>
): UsuarioAdministrable {
  return {
    id: String(usuario.id ?? ""),

    nombre_completo: String(
      usuario.nombre_completo ?? ""
    ),

    dni:
      typeof usuario.dni === "string"
        ? usuario.dni
        : null,

    correo: String(usuario.correo ?? ""),

    telefono:
      typeof usuario.telefono === "string"
        ? usuario.telefono
        : null,

    empresa:
      typeof usuario.empresa === "string"
        ? usuario.empresa
        : null,

    cargo:
      typeof usuario.cargo === "string"
        ? usuario.cargo
        : null,

    rol: String(
      usuario.rol ?? "cliente"
    ) as UsuarioAdministrable["rol"],

    activo: Boolean(usuario.activo),

    estado_solicitud: String(
      usuario.estado_solicitud ?? "pendiente"
    ) as EstadoSolicitudRegistro,

    fecha_registro: String(
      usuario.fecha_registro ?? ""
    ),

    fecha_actualizacion: String(
      usuario.fecha_actualizacion ?? ""
    ),
  };
}

export async function listarUsuarios(): Promise<
  UsuarioAdministrable[]
> {
  const { data, error } = await supabase
    .from("perfiles")
    .select(
      `
        id,
        nombre_completo,
        dni,
        correo,
        telefono,
        empresa,
        cargo,
        rol,
        activo,
        estado_solicitud,
        fecha_registro,
        fecha_actualizacion
      `
    )
    .order("fecha_registro", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `No se pudieron consultar los usuarios: ${error.message}`
    );
  }

  return (data ?? []).map((usuario) =>
    normalizarUsuario(
      usuario as Record<string, unknown>
    )
  );
}

export async function obtenerUsuario(
  usuarioId: string
): Promise<UsuarioAdministrable> {
  const { data, error } = await supabase
    .from("perfiles")
    .select(
      `
        id,
        nombre_completo,
        dni,
        correo,
        telefono,
        empresa,
        cargo,
        rol,
        activo,
        estado_solicitud,
        fecha_registro,
        fecha_actualizacion
      `
    )
    .eq("id", usuarioId)
    .single();

  if (error) {
    throw new Error(
      `No se pudo consultar el usuario: ${error.message}`
    );
  }

  return normalizarUsuario(
    data as Record<string, unknown>
  );
}

export async function administrarUsuario(
  usuarioId: string,
  rol: RolUsuario | "cliente",
  activo: boolean
): Promise<UsuarioAdministrable> {
  const { data, error } = await supabase.rpc(
    "administrar_usuario",
    {
      usuario_objetivo: usuarioId,
      nuevo_rol: rol,
      nuevo_activo: activo,
    }
  );

  if (error) {
    throw new Error(
      `No se pudo actualizar el usuario: ${error.message}`
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      "Supabase no devolvió el usuario actualizado."
    );
  }

  return normalizarUsuario(
    data[0] as Record<string, unknown>
  );
}

export function calcularResumenUsuarios(
  usuarios: UsuarioAdministrable[]
): ResumenUsuarios {
  const usuariosAprobados = usuarios.filter(
    (usuario) =>
      usuario.estado_solicitud === "aprobado"
  );

  return {
    total: usuarios.length,

    activos: usuariosAprobados.filter(
      (usuario) => usuario.activo
    ).length,

    inactivos: usuariosAprobados.filter(
      (usuario) => !usuario.activo
    ).length,

    administradores: usuariosAprobados.filter(
      (usuario) =>
        usuario.rol === "administrador"
    ).length,

    analistas: usuariosAprobados.filter(
      (usuario) =>
        usuario.rol === "analista"
    ).length,

    operadores: usuariosAprobados.filter(
      (usuario) =>
        usuario.rol === "operador"
    ).length,

    clientes: usuariosAprobados.filter(
      (usuario) =>
        usuario.rol === "cliente"
    ).length,
  };
}

export function obtenerNombreRol(
  rol: UsuarioAdministrable["rol"]
): string {
  const nombres: Record<
    UsuarioAdministrable["rol"],
    string
  > = {
    administrador: "Administrador",
    analista: "Analista",
    operador: "Operador",
    cliente: "Cliente",
  };

  return nombres[rol];
}

export function obtenerNombreEstadoSolicitud(
  estado: EstadoSolicitudRegistro
): string {
  const nombres: Record<
    EstadoSolicitudRegistro,
    string
  > = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
  };

  return nombres[estado];
}