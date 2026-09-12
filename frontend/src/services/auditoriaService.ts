import { supabase } from "../lib/supabase";

import type {
  Auditoria,
} from "../types/database";

export interface UsuarioAuditoria {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: string;
}

export interface AuditoriaConUsuario
  extends Auditoria {
  usuario: UsuarioAuditoria | null;
}

export interface ResumenAuditoria {
  total: number;
  inserciones: number;
  actualizaciones: number;
  eliminaciones: number;
  usuariosParticipantes: number;
  tablasAfectadas: number;
}

interface PerfilAuditoriaRespuesta {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: string;
}

function normalizarObjeto(
  valor: unknown
): Record<string, unknown> | null {
  if (
    valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  ) {
    return valor as Record<string, unknown>;
  }

  return null;
}

function normalizarAuditoria(
  registro: Record<string, unknown>,
  usuarios: Map<string, UsuarioAuditoria>
): AuditoriaConUsuario {
  const usuarioId =
    typeof registro.usuario_id === "string"
      ? registro.usuario_id
      : null;

  return {
    id: Number(registro.id),
    usuario_id: usuarioId,
    tabla_afectada: String(
      registro.tabla_afectada ?? ""
    ),
    registro_id:
      registro.registro_id !== null &&
      registro.registro_id !== undefined
        ? String(registro.registro_id)
        : null,
    accion: String(
      registro.accion
    ) as Auditoria["accion"],
    datos_anteriores: normalizarObjeto(
      registro.datos_anteriores
    ),
    datos_nuevos: normalizarObjeto(
      registro.datos_nuevos
    ),
    fecha_accion: String(
      registro.fecha_accion ?? ""
    ),
    usuario:
      usuarioId !== null
        ? usuarios.get(usuarioId) ?? null
        : null,
  };
}

export async function listarAuditoria(
  limite = 500
): Promise<AuditoriaConUsuario[]> {
  const limiteSeguro = Math.min(
    Math.max(limite, 1),
    1000
  );

  const { data, error } = await supabase
    .from("auditoria")
    .select(
      `
        id,
        usuario_id,
        tabla_afectada,
        registro_id,
        accion,
        datos_anteriores,
        datos_nuevos,
        fecha_accion
      `
    )
    .order("fecha_accion", {
      ascending: false,
    })
    .limit(limiteSeguro);

  if (error) {
    throw new Error(
      `No se pudo consultar la auditoría: ${error.message}`
    );
  }

  const registros =
    (data ?? []) as Record<string, unknown>[];

  const identificadoresUsuarios = [
    ...new Set(
      registros
        .map((registro) => registro.usuario_id)
        .filter(
          (usuarioId): usuarioId is string =>
            typeof usuarioId === "string" &&
            usuarioId.length > 0
        )
    ),
  ];

  const usuarios = new Map<
    string,
    UsuarioAuditoria
  >();

  if (identificadoresUsuarios.length > 0) {
    const {
      data: perfiles,
      error: errorPerfiles,
    } = await supabase
      .from("perfiles")
      .select(
        "id, nombre_completo, correo, rol"
      )
      .in("id", identificadoresUsuarios);

    if (errorPerfiles) {
      throw new Error(
        "No se pudieron consultar los usuarios de " +
          `auditoría: ${errorPerfiles.message}`
      );
    }

    (
      (perfiles ??
        []) as PerfilAuditoriaRespuesta[]
    ).forEach((perfil) => {
      usuarios.set(perfil.id, {
        id: perfil.id,
        nombre_completo:
          perfil.nombre_completo,
        correo: perfil.correo,
        rol: perfil.rol,
      });
    });
  }

  return registros.map((registro) =>
    normalizarAuditoria(
      registro,
      usuarios
    )
  );
}

export async function obtenerRegistroAuditoria(
  auditoriaId: number
): Promise<AuditoriaConUsuario> {
  const registros =
    await listarAuditoria(1000);

  const registro = registros.find(
    (elemento) =>
      elemento.id === auditoriaId
  );

  if (!registro) {
    throw new Error(
      "El registro de auditoría no existe " +
        "o no está disponible."
    );
  }

  return registro;
}

export function calcularResumenAuditoria(
  registros: AuditoriaConUsuario[]
): ResumenAuditoria {
  const usuariosParticipantes = new Set(
    registros
      .map((registro) => registro.usuario_id)
      .filter(
        (usuarioId): usuarioId is string =>
          usuarioId !== null
      )
  );

  const tablasAfectadas = new Set(
    registros
      .map(
        (registro) =>
          registro.tabla_afectada
      )
      .filter(Boolean)
  );

  return {
    total: registros.length,

    inserciones: registros.filter(
      (registro) =>
        registro.accion === "INSERT"
    ).length,

    actualizaciones: registros.filter(
      (registro) =>
        registro.accion === "UPDATE"
    ).length,

    eliminaciones: registros.filter(
      (registro) =>
        registro.accion === "DELETE"
    ).length,

    usuariosParticipantes:
      usuariosParticipantes.size,

    tablasAfectadas:
      tablasAfectadas.size,
  };
}

export function obtenerNombreAccion(
  accion: Auditoria["accion"]
): string {
  const nombres: Record<
    Auditoria["accion"],
    string
  > = {
    INSERT: "Registro creado",
    UPDATE: "Registro actualizado",
    DELETE: "Registro eliminado",
  };

  return nombres[accion];
}

export function obtenerNombreTabla(
  tabla: string
): string {
  const nombres: Record<string, string> = {
    perfiles: "Usuarios",
    clientes: "Clientes",
    comentarios: "Comentarios",
    solicitudes: "Solicitudes",
    predicciones: "Predicciones",
    documentos: "Documentos",
    notificaciones: "Notificaciones",
  };

  return (
    nombres[tabla] ??
    tabla
      .replaceAll("_", " ")
      .replace(
        /^./,
        (letra) => letra.toUpperCase()
      )
  );
}