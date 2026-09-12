import {
  Building2,
  CheckCircle2,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../contexts/AuthContext";

import {
  descargarDocumento,
  eliminarDocumento,
  formatearTamanoArchivo,
  listarDocumentos,
  subirDocumento,
} from "../services/documentosService";

import type {
  DocumentoConCliente,
} from "../services/documentosService";

import "../styles/Documentos.css";

function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

function formatearFecha(fecha: string): string {
  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fechaConvertida);
}

function obtenerIconoDocumento(tipo: string | null) {
  if (tipo?.startsWith("image/")) {
    return FileImage;
  }

  if (
    tipo?.includes("excel") ||
    tipo?.includes("spreadsheet")
  ) {
    return FileSpreadsheet;
  }

  if (
    tipo?.includes("pdf") ||
    tipo?.includes("word") ||
    tipo?.includes("text")
  ) {
    return FileText;
  }

  return File;
}

export default function Documentos() {
  const { perfil } = useAuth();

  const entradaArchivo =
    useRef<HTMLInputElement>(null);

  const [documentos, setDocumentos] = useState<
    DocumentoConCliente[]
  >([]);
  const [archivo, setArchivo] =
    useState<File | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [procesandoId, setProcesandoId] = useState<
    number | null
  >(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarDocumentos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await listarDocumentos();
      setDocumentos(datos);
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDocumentos();
  }, [cargarDocumentos]);

  const documentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return documentos;
    }

    return documentos.filter((documento) => {
      const contenidoBuscable = [
        documento.nombre_archivo,
        documento.tipo_archivo,
        documento.cliente?.nombre,
        documento.cliente?.empresa,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenidoBuscable.includes(texto);
    });
  }, [busqueda, documentos]);

  const seleccionarArchivo = (
    archivoSeleccionado: File | null,
  ) => {
    setError("");
    setMensaje("");

    if (!archivoSeleccionado) {
      setArchivo(null);
      return;
    }

    if (archivoSeleccionado.size > 10 * 1024 * 1024) {
      setArchivo(null);
      setError(
        "El archivo supera el tamaño máximo de 10 MB.",
      );
      return;
    }

    setArchivo(archivoSeleccionado);
  };

  const manejarCambioArchivo = (
    evento: React.ChangeEvent<HTMLInputElement>,
  ) => {
    seleccionarArchivo(
      evento.target.files?.[0] ?? null,
    );
  };

  const manejarArrastre = (
    evento: React.DragEvent<HTMLDivElement>,
  ) => {
    evento.preventDefault();
  };

  const manejarArchivoSoltado = (
    evento: React.DragEvent<HTMLDivElement>,
  ) => {
    evento.preventDefault();

    seleccionarArchivo(
      evento.dataTransfer.files?.[0] ?? null,
    );
  };

  const limpiarArchivo = () => {
    setArchivo(null);

    if (entradaArchivo.current) {
      entradaArchivo.current.value = "";
    }
  };

  const manejarSubida = async () => {
    if (!archivo) {
      setError("Selecciona un archivo para continuar.");
      return;
    }

    setSubiendo(true);
    setError("");
    setMensaje("");

    try {
      await subirDocumento(archivo);

      limpiarArchivo();

      await cargarDocumentos();

      setMensaje(
        "El documento fue subido y registrado correctamente.",
      );
    } catch (errorSubida) {
      setError(obtenerMensajeError(errorSubida));
    } finally {
      setSubiendo(false);
    }
  };

  const manejarDescarga = async (
    documento: DocumentoConCliente,
  ) => {
    setProcesandoId(documento.id);
    setError("");
    setMensaje("");

    try {
      await descargarDocumento(documento);
      setMensaje(
        `Descarga iniciada: ${documento.nombre_archivo}`,
      );
    } catch (errorDescarga) {
      setError(obtenerMensajeError(errorDescarga));
    } finally {
      setProcesandoId(null);
    }
  };

  const puedeEliminar = (
    documento: DocumentoConCliente,
  ) => {
    return (
      perfil?.rol === "administrador" ||
      documento.usuario_id === perfil?.id
    );
  };

  const manejarEliminacion = async (
    documento: DocumentoConCliente,
  ) => {
    const confirmado = window.confirm(
      `¿Deseas eliminar "${documento.nombre_archivo}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmado) {
      return;
    }

    setProcesandoId(documento.id);
    setError("");
    setMensaje("");

    try {
      await eliminarDocumento(documento);

      await cargarDocumentos();

      setMensaje(
        "El documento fue eliminado correctamente.",
      );
    } catch (errorEliminacion) {
      setError(obtenerMensajeError(errorEliminacion));
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section className="documentos-pagina">
      <header className="documentos-encabezado">
        <div>
          <span className="documentos-etiqueta">
            Supabase Storage
          </span>

          <h1>Documentos</h1>

          <p>
            Sube, consulta y descarga archivos protegidos
            mediante autenticación y políticas RLS.
          </p>
        </div>

        <button
          type="button"
          className="documentos-actualizar"
          onClick={() => void cargarDocumentos()}
          disabled={cargando}
        >
          <RefreshCw
            size={18}
            className={cargando ? "girando" : ""}
          />
          Actualizar
        </button>
      </header>

      {mensaje && (
        <div className="documentos-alerta exito">
          <CheckCircle2 size={20} />
          <span>{mensaje}</span>

          <button
            type="button"
            onClick={() => setMensaje("")}
            aria-label="Cerrar mensaje"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="documentos-alerta error">
          <XCircle size={20} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Cerrar error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="documentos-subida-panel">
        <div
          className={
            archivo
              ? "documentos-zona-subida seleccionado"
              : "documentos-zona-subida"
          }
          onDragOver={manejarArrastre}
          onDrop={manejarArchivoSoltado}
        >
          <input
            ref={entradaArchivo}
            id="archivo-documento"
            type="file"
            accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={manejarCambioArchivo}
            disabled={subiendo}
          />

          <div className="documentos-subida-icono">
            <UploadCloud size={29} />
          </div>

          {archivo ? (
            <div className="documentos-archivo-seleccionado">
              <strong>{archivo.name}</strong>

              <span>
                {formatearTamanoArchivo(archivo.size)}
              </span>
            </div>
          ) : (
            <div>
              <strong>
                Arrastra un archivo o selecciónalo
              </strong>

              <span>
                PDF, Word, Excel, TXT, JPG o PNG. Máximo
                10 MB.
              </span>
            </div>
          )}

          <label htmlFor="archivo-documento">
            Seleccionar archivo
          </label>
        </div>

        <div className="documentos-subida-acciones">
          {archivo && (
            <button
              type="button"
              className="documentos-limpiar"
              onClick={limpiarArchivo}
              disabled={subiendo}
            >
              <X size={18} />
              Quitar
            </button>
          )}

          <button
            type="button"
            className="documentos-subir"
            onClick={() => void manejarSubida()}
            disabled={!archivo || subiendo}
          >
            {subiendo ? (
              <RefreshCw
                size={18}
                className="girando"
              />
            ) : (
              <UploadCloud size={18} />
            )}

            {subiendo
              ? "Subiendo..."
              : "Subir documento"}
          </button>
        </div>
      </div>

      <div className="documentos-panel">
        <div className="documentos-herramientas">
          <div>
            <h2>Archivos disponibles</h2>
            <span>
              {documentos.length}{" "}
              {documentos.length === 1
                ? "documento"
                : "documentos"}
            </span>
          </div>

          <label className="documentos-buscador">
            <Search size={18} />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar documento"
            />
          </label>
        </div>

        {cargando ? (
          <div className="documentos-vacio">
            <RefreshCw
              size={34}
              className="girando"
            />
            <p>Cargando documentos...</p>
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="documentos-vacio">
            <div>
              <FileText size={32} />
            </div>

            <h2>No hay documentos</h2>

            <p>
              Sube el primer archivo para comenzar.
            </p>
          </div>
        ) : (
          <div className="documentos-lista">
            {documentosFiltrados.map((documento) => {
              const IconoDocumento =
                obtenerIconoDocumento(
                  documento.tipo_archivo,
                );

              const procesando =
                procesandoId === documento.id;

              return (
                <article
                  className="documento-tarjeta"
                  key={documento.id}
                >
                  <div className="documento-icono">
                    <IconoDocumento size={25} />
                  </div>

                  <div className="documento-informacion">
                    <h3 title={documento.nombre_archivo}>
                      {documento.nombre_archivo}
                    </h3>

                    <div>
                      <span>
                        {formatearTamanoArchivo(
                          documento.tamano_bytes,
                        )}
                      </span>

                      <span>
                        {formatearFecha(
                          documento.fecha_registro,
                        )}
                      </span>
                    </div>

                    {documento.cliente && (
                      <small>
                        <Building2 size={14} />
                        {documento.cliente.empresa}
                      </small>
                    )}
                  </div>

                  <div className="documento-acciones">
                    <button
                      type="button"
                      className="documento-descargar"
                      onClick={() =>
                        void manejarDescarga(documento)
                      }
                      disabled={procesando}
                      title="Descargar documento"
                      aria-label={`Descargar ${documento.nombre_archivo}`}
                    >
                      {procesando ? (
                        <RefreshCw
                          size={18}
                          className="girando"
                        />
                      ) : (
                        <Download size={18} />
                      )}
                    </button>

                    {puedeEliminar(documento) && (
                      <button
                        type="button"
                        className="documento-eliminar"
                        onClick={() =>
                          void manejarEliminacion(
                            documento,
                          )
                        }
                        disabled={procesando}
                        title="Eliminar documento"
                        aria-label={`Eliminar ${documento.nombre_archivo}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}