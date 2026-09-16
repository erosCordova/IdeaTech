import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Camera,
  CameraOff,
  CheckCircle2,
  RefreshCw,
  ScanFace,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";

import {
  listarUsuarios,
  obtenerNombreRol,
} from "../services/usuariosService";

import type {
  UsuarioAdministrable,
} from "../services/usuariosService";

import {
  registrarRostro,
} from "../services/facialService";

import "../styles/RegistroFacial.css";


export default function RegistroFacial() {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const [usuarios, setUsuarios] =
    useState<UsuarioAdministrable[]>([]);

  const [usuarioId, setUsuarioId] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");

  const [cargandoUsuarios, setCargandoUsuarios] =
    useState(true);

  const [camaraActiva, setCamaraActiva] =
    useState(false);

  const [registrando, setRegistrando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");


  /* ======================================================
     USUARIOS APROBADOS Y ACTIVOS
  ====================================================== */

  const usuariosDisponibles =
    useMemo(() => {
      const texto =
        busqueda.trim().toLowerCase();

      return usuarios
        .filter(
          (usuario) =>
            usuario.activo &&
            usuario.estado_solicitud ===
              "aprobado",
        )
        .filter((usuario) => {
          if (!texto) {
            return true;
          }

          return (
            usuario.nombre_completo
              .toLowerCase()
              .includes(texto) ||
            usuario.correo
              .toLowerCase()
              .includes(texto) ||
            (usuario.dni ?? "")
              .toLowerCase()
              .includes(texto)
          );
        });
    }, [usuarios, busqueda]);


  const usuarioSeleccionado =
    useMemo(
      () =>
        usuarios.find(
          (usuario) =>
            usuario.id === usuarioId,
        ) ?? null,
      [usuarios, usuarioId],
    );


  /* ======================================================
     CARGAR USUARIOS
  ====================================================== */

  const cargarUsuarios =
    async () => {
      try {
        setCargandoUsuarios(true);
        setError("");

        const resultado =
          await listarUsuarios();

        setUsuarios(resultado);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los usuarios.",
        );
      } finally {
        setCargandoUsuarios(false);
      }
    };


  useEffect(() => {
    void cargarUsuarios();
  }, []);


  /* ======================================================
     CÁMARA
  ====================================================== */

  const iniciarCamara =
    async () => {
      try {
        setError("");
        setMensaje("");

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          throw new Error(
            "El navegador no permite acceder a la cámara.",
          );
        }

        streamRef.current
          ?.getTracks()
          .forEach((track) => {
            track.stop();
          });

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              width: {
                ideal: 1280,
              },

              height: {
                ideal: 720,
              },

              facingMode: "user",
            },

            audio: false,
          });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;

          await videoRef.current.play();
        }

        setCamaraActiva(true);
      } catch (err) {
        setCamaraActiva(false);

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la cámara.",
        );
      }
    };


  const detenerCamara =
    () => {
      streamRef.current
        ?.getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject =
          null;
      }

      setCamaraActiva(false);
    };


  useEffect(() => {
    return () => {
      streamRef.current
        ?.getTracks()
        .forEach((track) => {
          track.stop();
        });
    };
  }, []);


  /* ======================================================
     CAPTURAR FRAME
  ====================================================== */

  const capturarImagen =
    (): string => {
      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      if (!video || !canvas) {
        throw new Error(
          "La cámara no está disponible.",
        );
      }

      if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        throw new Error(
          "La cámara todavía se está preparando.",
        );
      }

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        throw new Error(
          "No se pudo obtener una imagen de la cámara.",
        );
      }

      /*
       * Reducimos el tamaño enviado al backend.
       * Para generar el embedding facial no
       * necesitamos enviar el frame 1280x720
       * completo.
       */
      const anchoMaximo = 800;

      const proporcion =
        Math.min(
          1,
          anchoMaximo / video.videoWidth,
        );

      const ancho =
        Math.round(
          video.videoWidth * proporcion,
        );

      const alto =
        Math.round(
          video.videoHeight * proporcion,
        );

      canvas.width = ancho;
      canvas.height = alto;

      const contexto =
        canvas.getContext("2d");

      if (!contexto) {
        throw new Error(
          "No se pudo preparar la captura.",
        );
      }

      contexto.drawImage(
        video,
        0,
        0,
        ancho,
        alto,
      );

      return canvas.toDataURL(
        "image/jpeg",
        0.9,
      );
    };


  /* ======================================================
     REGISTRAR ROSTRO
  ====================================================== */

  const registrar =
    async () => {
      if (!usuarioSeleccionado) {
        setError(
          "Selecciona primero un usuario.",
        );

        return;
      }

      if (!camaraActiva) {
        setError(
          "Debes activar la cámara.",
        );

        return;
      }

      try {
        setRegistrando(true);
        setError("");
        setMensaje("");

        const imagen =
          capturarImagen();

        const respuesta =
          await registrarRostro(
            usuarioSeleccionado.id,
            imagen,
          );

        setMensaje(
          respuesta.mensaje,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo registrar el rostro.",
        );
      } finally {
        setRegistrando(false);
      }
    };


  /* ======================================================
     INTERFAZ
  ====================================================== */

  return (
    <section className="registro-facial-page">
      <div className="registro-facial-header">
        <div>
          <span className="registro-facial-etiqueta">
            <ShieldCheck size={17} />

            Módulo administrativo
          </span>

          <h1>Registro Facial</h1>

          <p>
            Selecciona un usuario aprobado y
            registra su rostro para utilizar el
            sistema de reconocimiento facial de
            IdeaTech.
          </p>
        </div>

        <div className="registro-facial-header-icon">
          <ScanFace size={38} />
        </div>
      </div>


      {error && (
        <div className="registro-facial-alerta error">
          {error}
        </div>
      )}


      {mensaje && (
        <div className="registro-facial-alerta exito">
          <CheckCircle2 size={19} />

          {mensaje}
        </div>
      )}


      <div className="registro-facial-grid">
        {/* =========================================
            USUARIOS
        ========================================= */}

        <article className="registro-facial-card">
          <div className="registro-facial-card-header">
            <div className="registro-facial-card-icon">
              <User size={22} />
            </div>

            <div>
              <h2>Seleccionar usuario</h2>

              <p>
                Solo aparecen usuarios aprobados
                y activos.
              </p>
            </div>
          </div>


          <div className="registro-facial-buscador">
            <Search size={18} />

            <input
              type="text"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value,
                )
              }
              placeholder="Buscar por nombre, correo o DNI..."
            />

            <button
              type="button"
              onClick={() =>
                void cargarUsuarios()
              }
              disabled={cargandoUsuarios}
              title="Actualizar usuarios"
            >
              <RefreshCw
                size={17}
                className={
                  cargandoUsuarios
                    ? "girando"
                    : ""
                }
              />
            </button>
          </div>


          <div className="registro-facial-usuarios">
            {cargandoUsuarios ? (
              <div className="registro-facial-vacio">
                Cargando usuarios...
              </div>
            ) : usuariosDisponibles.length ===
              0 ? (
              <div className="registro-facial-vacio">
                No se encontraron usuarios
                aprobados y activos.
              </div>
            ) : (
              usuariosDisponibles.map(
                (usuario) => (
                  <button
                    type="button"
                    key={usuario.id}
                    className={
                      usuarioId === usuario.id
                        ? "registro-facial-usuario seleccionado"
                        : "registro-facial-usuario"
                    }
                    onClick={() => {
                      setUsuarioId(
                        usuario.id,
                      );

                      setError("");
                      setMensaje("");
                    }}
                  >
                    <div className="registro-facial-avatar">
                      {usuario.nombre_completo
                        .charAt(0)
                        .toUpperCase() ||
                        "U"}
                    </div>

                    <div className="registro-facial-usuario-info">
                      <strong>
                        {
                          usuario.nombre_completo
                        }
                      </strong>

                      <span>
                        {usuario.correo}
                      </span>

                      <small>
                        {obtenerNombreRol(
                          usuario.rol,
                        )}
                      </small>
                    </div>
                  </button>
                ),
              )
            )}
          </div>


          {usuarioSeleccionado && (
            <div className="registro-facial-detalle">
              <h3>
                Usuario seleccionado
              </h3>

              <div className="registro-facial-detalle-grid">
                <div>
                  <span>Nombre</span>

                  <strong>
                    {
                      usuarioSeleccionado.nombre_completo
                    }
                  </strong>
                </div>

                <div>
                  <span>DNI</span>

                  <strong>
                    {usuarioSeleccionado.dni ||
                      "No registrado"}
                  </strong>
                </div>

                <div>
                  <span>Correo</span>

                  <strong>
                    {
                      usuarioSeleccionado.correo
                    }
                  </strong>
                </div>

                <div>
                  <span>Rol</span>

                  <strong>
                    {obtenerNombreRol(
                      usuarioSeleccionado.rol,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Estado</span>

                  <strong>
                    Activo
                  </strong>
                </div>

                <div>
                  <span>Solicitud</span>

                  <strong>
                    Aprobada
                  </strong>
                </div>
              </div>
            </div>
          )}
        </article>


        {/* =========================================
            CÁMARA
        ========================================= */}

        <article className="registro-facial-card">
          <div className="registro-facial-card-header">
            <div className="registro-facial-card-icon">
              <Camera size={22} />
            </div>

            <div>
              <h2>Captura facial</h2>

              <p>
                Mantén el rostro visible,
                centrado y mirando al frente.
              </p>
            </div>

            <span
              className={
                camaraActiva
                  ? "registro-facial-status activa"
                  : "registro-facial-status"
              }
            >
              <span />

              {camaraActiva
                ? "Cámara activa"
                : "Cámara apagada"}
            </span>
          </div>


          <div className="registro-facial-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
            />

            {!camaraActiva && (
              <div className="registro-facial-video-vacio">
                <CameraOff size={48} />

                <strong>
                  Cámara desactivada
                </strong>

                <span>
                  Activa la cámara para
                  registrar el rostro.
                </span>
              </div>
            )}


            {camaraActiva && (
              <>
                <div className="registro-facial-guia">
                  <div className="registro-facial-ovalo" />
                </div>

                <div className="registro-facial-scan" />
              </>
            )}
          </div>


          <canvas
            ref={canvasRef}
            style={{
              display: "none",
            }}
          />


          <div className="registro-facial-acciones">
            {!camaraActiva ? (
              <button
                type="button"
                className="registro-facial-boton secundario"
                onClick={() =>
                  void iniciarCamara()
                }
              >
                <Camera size={19} />

                Activar cámara
              </button>
            ) : (
              <button
                type="button"
                className="registro-facial-boton secundario"
                onClick={
                  detenerCamara
                }
                disabled={registrando}
              >
                <CameraOff size={19} />

                Apagar cámara
              </button>
            )}


            <button
              type="button"
              className="registro-facial-boton principal"
              onClick={() =>
                void registrar()
              }
              disabled={
                registrando ||
                !camaraActiva ||
                !usuarioSeleccionado
              }
            >
              <ScanFace size={19} />

              {registrando
                ? "Procesando rostro..."
                : "Registrar rostro"}
            </button>
          </div>


          <div className="registro-facial-ayuda">
            <ShieldCheck size={19} />

            <div>
              <strong>
                ¿Qué se almacena?
              </strong>

              <p>
                IdeaTech genera un vector facial
                de 128 características mediante
                face_recognition. La fotografía
                capturada no se guarda en la
                tabla de rostros.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}