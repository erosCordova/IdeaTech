import { supabase } from "../lib/supabase";

import type { Documento } from "../types/database";

const NOMBRE_BUCKET = "documentos";
const TAMANO_MAXIMO = 10 * 1024 * 1024;

const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export interface ClienteDocumento {
  id: number;
  nombre: string;
  empresa: string;
}

export interface DocumentoConCliente
  extends Documento {
  cliente: ClienteDocumento | null;
}

interface DocumentoRespuesta extends Documento {
  clientes:
    | ClienteDocumento
    | ClienteDocumento[]
    | null;
}

function limpiarNombreArchivo(
  nombreArchivo: string,
): string {
  const nombreNormalizado = nombreArchivo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const nombreSeguro = nombreNormalizado
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return nombreSeguro || "archivo";
}

function validarArchivo(archivo: File): void {
  if (archivo.size <= 0) {
    throw new Error(
      "El archivo seleccionado está vacío.",
    );
  }

  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error(
      "El archivo supera el tamaño máximo de 10 MB.",
    );
  }

  if (!TIPOS_PERMITIDOS.has(archivo.type)) {
    throw new Error(
      "Tipo de archivo no permitido. Utiliza PDF, Word, Excel, TXT, JPG o PNG.",
    );
  }
}

function normalizarDocumento(
  documento: DocumentoRespuesta,
): DocumentoConCliente {
  const relacion = Array.isArray(documento.clientes)
    ? documento.clientes[0] ?? null
    : documento.clientes;

  const {
    clientes: _clientes,
    ...datosDocumento
  } = documento;

  return {
    ...datosDocumento,
    cliente: relacion,
  };
}

async function obtenerUsuarioActual(): Promise<{
  id: string;
}> {
  const { data, error } =
    await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error(
      "No se pudo identificar al usuario conectado.",
    );
  }

  return {
    id: data.user.id,
  };
}

async function obtenerClienteAsociado(
  usuarioId: string,
): Promise<number | null> {
  const {
    data: perfil,
    error: errorPerfil,
  } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", usuarioId)
    .maybeSingle();

  if (errorPerfil) {
    throw new Error(
      `No se pudo consultar el rol del usuario: ${errorPerfil.message}`,
    );
  }

  if (!perfil) {
    throw new Error(
      "No existe un perfil para el usuario conectado.",
    );
  }

  if (perfil.rol !== "cliente") {
    return null;
  }

  const {
    data: cliente,
    error: errorCliente,
  } = await supabase
    .from("clientes")
    .select("id")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (errorCliente) {
    throw new Error(
      `No se pudo consultar el cliente asociado: ${errorCliente.message}`,
    );
  }

  if (!cliente) {
    throw new Error(
      "La cuenta de cliente todavía no tiene una empresa asociada.",
    );
  }

  return cliente.id;
}

export async function listarDocumentos(): Promise<
  DocumentoConCliente[]
> {
  const { data, error } = await supabase
    .from("documentos")
    .select(
      `
        *,
        clientes (
          id,
          nombre,
          empresa
        )
      `,
    )
    .order("fecha_registro", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `No se pudieron cargar los documentos: ${error.message}`,
    );
  }

  return ((data ?? []) as DocumentoRespuesta[]).map(
    normalizarDocumento,
  );
}

export async function subirDocumento(
  archivo: File,
): Promise<Documento> {
  validarArchivo(archivo);

  const usuario = await obtenerUsuarioActual();

  const clienteId = await obtenerClienteAsociado(
    usuario.id,
  );

  const nombreSeguro = limpiarNombreArchivo(
    archivo.name,
  );

  const identificador =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`;

  const rutaStorage =
    `${usuario.id}/${identificador}-${nombreSeguro}`;

  const { error: errorSubida } = await supabase.storage
    .from(NOMBRE_BUCKET)
    .upload(rutaStorage, archivo, {
      cacheControl: "3600",
      contentType:
        archivo.type || "application/octet-stream",
      upsert: false,
    });

  if (errorSubida) {
    throw new Error(
      `No se pudo subir el archivo: ${errorSubida.message}`,
    );
  }

  const { data, error: errorRegistro } =
    await supabase
      .from("documentos")
      .insert({
        cliente_id: clienteId,
        usuario_id: usuario.id,
        nombre_archivo: archivo.name,
        ruta_storage: rutaStorage,
        tipo_archivo:
          archivo.type || "application/octet-stream",
        tamano_bytes: archivo.size,
      })
      .select("*")
      .single();

  if (errorRegistro) {
    await supabase.storage
      .from(NOMBRE_BUCKET)
      .remove([rutaStorage]);

    throw new Error(
      `El archivo se subió, pero no se pudieron registrar sus datos: ${errorRegistro.message}`,
    );
  }

  return data as Documento;
}

export async function descargarDocumento(
  documento: Documento,
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(NOMBRE_BUCKET)
    .download(documento.ruta_storage);

  if (error || !data) {
    throw new Error(
      `No se pudo descargar el archivo: ${
        error?.message || "respuesta vacía"
      }`,
    );
  }

  const urlTemporal = URL.createObjectURL(data);

  const enlace =
    window.document.createElement("a");

  enlace.href = urlTemporal;
  enlace.download = documento.nombre_archivo;
  enlace.style.display = "none";

  window.document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  setTimeout(() => {
    URL.revokeObjectURL(urlTemporal);
  }, 1000);
}

export async function eliminarDocumento(
  documento: Documento,
): Promise<void> {
  const { error: errorStorage } =
    await supabase.storage
      .from(NOMBRE_BUCKET)
      .remove([documento.ruta_storage]);

  if (errorStorage) {
    throw new Error(
      `No se pudo eliminar el archivo del almacenamiento: ${errorStorage.message}`,
    );
  }

  const { error: errorRegistro } = await supabase
    .from("documentos")
    .delete()
    .eq("id", documento.id);

  if (errorRegistro) {
    throw new Error(
      `El archivo fue eliminado del almacenamiento, pero no se pudo eliminar su registro: ${errorRegistro.message}`,
    );
  }
}

export function formatearTamanoArchivo(
  tamanoBytes: number | null,
): string {
  if (
    tamanoBytes === null ||
    tamanoBytes === undefined
  ) {
    return "Tamaño desconocido";
  }

  if (tamanoBytes < 1024) {
    return `${tamanoBytes} B`;
  }

  if (tamanoBytes < 1024 * 1024) {
    return `${(tamanoBytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    tamanoBytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}