import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  CameraOff,
  CheckCircle2,
  ScanFace,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  reconocerRostro,
} from "../services/facialService";

import type {
  ReconocimientoFacialRespuesta,
} from "../services/facialService";

import "../styles/PruebaFacial.css";


const INTERVALO_RECONOCIMIENTO = 700;


export default function PruebaFacial() {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const timerRef =
    useRef<number | null>(null);

  const reconocimientoActivoRef =
    useRef(false);

  const procesandoRef =
    useRef(false);


  const [camaraActiva, setCamaraActiva] =
    useState(false);

  const [
    reconocimientoActivo,
    setReconocimientoActivo,
  ] = useState(false);

  const [procesando, setProcesando] =
    useState(false);

  const [resultado, setResultado] =
    useState<ReconocimientoFacialRespuesta | null>(
      null,
    );

  const [error, setError] =
    useState("");


  /* ======================================================
     DETENER TEMPORIZADOR
  ====================================================== */

  const detenerTemporizador = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(
        timerRef.current,
      );

      timerRef.current = null;
    }
  };


  /* ======================================================
     CÁMARA
  ====================================================== */

  const iniciarCamara =
    async () => {
      try {
        setError("");
        setResultado(null);

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


  const detenerReconocimiento = () => {
    reconocimientoActivoRef.current =
      false;

    procesandoRef.current = false;

    detenerTemporizador();

    setReconocimientoActivo(false);
    setProcesando(false);
  };


  const detenerCamara = () => {
    detenerReconocimiento();

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


  /* ======================================================
     CAPTURAR FRAME
  ====================================================== */

  const capturarFrame =
    (): string | null => {
      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      if (!video || !canvas) {
        return null;
      }

      if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        return null;
      }

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        return null;
      }

      /*
       * Para reconocimiento continuo reducimos
       * el frame antes de enviarlo al backend.
       * Esto reduce transferencia y procesamiento.
       */
      const anchoMaximo = 640;

      const escala =
        Math.min(
          1,
          anchoMaximo / video.videoWidth,
        );

      const ancho =
        Math.round(
          video.videoWidth * escala,
        );

      const alto =
        Math.round(
          video.videoHeight * escala,
        );

      canvas.width = ancho;
      canvas.height = alto;

      const contexto =
        canvas.getContext("2d");

      if (!contexto) {
        return null;
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
        0.82,
      );
    };


  /* ======================================================
     PROGRAMAR SIGUIENTE ANÁLISIS
  ====================================================== */

  const programarSiguiente =
    (
      funcion: () => Promise<void>,
      retraso = INTERVALO_RECONOCIMIENTO,
    ) => {
      detenerTemporizador();

      if (
        !reconocimientoActivoRef.current
      ) {
        return;
      }

      timerRef.current =
        window.setTimeout(() => {
          void funcion();
        }, retraso);
    };


  /* ======================================================
     RECONOCIMIENTO CONTINUO
  ====================================================== */

  const ejecutarReconocimiento =
    async (): Promise<void> => {
      if (
        !reconocimientoActivoRef.current
      ) {
        return;
      }

      /*
       * Evita enviar otra petición mientras
       * FastAPI todavía procesa la anterior.
       */
      if (procesandoRef.current) {
        programarSiguiente(
          ejecutarReconocimiento,
        );

        return;
      }

      const imagen =
        capturarFrame();

      if (!imagen) {
        programarSiguiente(
          ejecutarReconocimiento,
          300,
        );

        return;
      }

      procesandoRef.current = true;

      setProcesando(true);

      try {
        const respuesta =
          await reconocerRostro(
            imagen,
          );

        /*
         * Puede ocurrir que el usuario detenga
         * el reconocimiento mientras la petición
         * todavía está en curso.
         */
        if (
          !reconocimientoActivoRef.current
        ) {
          return;
        }

        setResultado(respuesta);
        setError("");
      } catch (err) {
        if (
          !reconocimientoActivoRef.current
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo analizar el rostro.",
        );
      } finally {
        procesandoRef.current = false;

        setProcesando(false);

        if (
          reconocimientoActivoRef.current
        ) {
          programarSiguiente(
            ejecutarReconocimiento,
          );
        }
      }
    };


  const iniciarReconocimiento =
    () => {
      if (!camaraActiva) {
        setError(
          "Primero debes activar la cámara.",
        );

        return;
      }

      setError("");
      setResultado(null);

      reconocimientoActivoRef.current =
        true;

      setReconocimientoActivo(true);

      /*
       * Primera comprobación inmediata.
       */
      void ejecutarReconocimiento();
    };


  /* ======================================================
     LIMPIEZA
  ====================================================== */

  useEffect(() => {
    return () => {
      reconocimientoActivoRef.current =
        false;

      procesandoRef.current = false;

      if (timerRef.current !== null) {
        window.clearTimeout(
          timerRef.current,
        );
      }

      streamRef.current
        ?.getTracks()
        .forEach((track) => {
          track.stop();
        });
    };
  }, []);


  /* ======================================================
     DATOS VISUALES
  ====================================================== */

  const coincidencia =
    Math.max(
      0,
      Math.min(
        100,
        resultado?.coincidencia ?? 0,
      ),
    );


  const hayRostro =
    resultado?.rostro_detectado === true;


  const reconocido =
    resultado?.reconocido === true;


  /* ======================================================
     INTERFAZ
  ====================================================== */

  return (
    <section className="prueba-facial-page">
      <div className="prueba-facial-header">
        <div>
          <span className="prueba-facial-etiqueta">
            <ShieldCheck size={17} />

            Reconocimiento biométrico
          </span>

          <h1>Prueba Facial</h1>

          <p>
            Utiliza la cámara para comprobar en
            tiempo real si el rostro corresponde
            a un usuario registrado en IdeaTech.
          </p>
        </div>

        <div className="prueba-facial-header-icon">
          <ScanFace size={38} />
        </div>
      </div>


      {error && (
        <div className="prueba-facial-alerta error">
          <XCircle size={19} />

          {error}
        </div>
      )}


      <div className="prueba-facial-grid">
        {/* =========================================
            CÁMARA
        ========================================= */}

        <article className="prueba-facial-card">
          <div className="prueba-facial-card-header">
            <div className="prueba-facial-card-icon">
              <Camera size={22} />
            </div>

            <div>
              <h2>Cámara</h2>

              <p>
                Coloca un solo rostro frente a
                la cámara.
              </p>
            </div>

            <span
              className={
                camaraActiva
                  ? "prueba-facial-status activa"
                  : "prueba-facial-status"
              }
            >
              <span />

              {camaraActiva
                ? "Cámara activa"
                : "Cámara apagada"}
            </span>
          </div>


          <div className="prueba-facial-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
            />


            {!camaraActiva && (
              <div className="prueba-facial-video-vacio">
                <CameraOff size={50} />

                <strong>
                  Cámara desactivada
                </strong>

                <span>
                  Activa la cámara para comenzar.
                </span>
              </div>
            )}


            {camaraActiva && (
              <>
                <div className="prueba-facial-guia">
                  <div className="prueba-facial-ovalo" />
                </div>

                {reconocimientoActivo && (
                  <div className="prueba-facial-scan" />
                )}
              </>
            )}
          </div>


          <canvas
            ref={canvasRef}
            style={{
              display: "none",
            }}
          />


          <div className="prueba-facial-acciones">
            {!camaraActiva ? (
              <button
                type="button"
                className="prueba-facial-boton secundario"
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
                className="prueba-facial-boton secundario"
                onClick={detenerCamara}
              >
                <CameraOff size={19} />

                Apagar cámara
              </button>
            )}


            {!reconocimientoActivo ? (
              <button
                type="button"
                className="prueba-facial-boton principal"
                disabled={!camaraActiva}
                onClick={
                  iniciarReconocimiento
                }
              >
                <ScanFace size={19} />

                Iniciar reconocimiento
              </button>
            ) : (
              <button
                type="button"
                className="prueba-facial-boton detener"
                onClick={
                  detenerReconocimiento
                }
              >
                <XCircle size={19} />

                Detener reconocimiento
              </button>
            )}
          </div>


          <div className="prueba-facial-estado-proceso">
            <span
              className={
                reconocimientoActivo
                  ? "indicador activo"
                  : "indicador"
              }
            />

            {reconocimientoActivo
              ? procesando
                ? "Analizando rostro..."
                : "Reconocimiento activo"
              : "Reconocimiento detenido"}
          </div>
        </article>


        {/* =========================================
            RESULTADO
        ========================================= */}

        <article className="prueba-facial-card resultado">
          <div className="prueba-facial-card-header">
            <div className="prueba-facial-card-icon">
              <UserRound size={22} />
            </div>

            <div>
              <h2>Resultado</h2>

              <p>
                Información obtenida del análisis
                facial en tiempo real.
              </p>
            </div>
          </div>


          {!resultado ? (
            <div className="prueba-facial-sin-resultado">
              <ScanFace size={58} />

              <strong>
                Esperando reconocimiento
              </strong>

              <p>
                Activa la cámara e inicia el
                reconocimiento para comenzar el
                análisis.
              </p>
            </div>
          ) : (
            <>
              <div
                className={
                  reconocido
                    ? "prueba-facial-resultado-estado reconocido"
                    : "prueba-facial-resultado-estado no-reconocido"
                }
              >
                {reconocido ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <XCircle size={24} />
                )}

                <div>
                  <strong>
                    {reconocido
                      ? "Rostro reconocido"
                      : hayRostro
                        ? "Rostro no reconocido"
                        : "Buscando rostro"}
                  </strong>

                  <span>
                    {resultado.mensaje}
                  </span>
                </div>
              </div>


              {/* =================================
                  BARRA DE COINCIDENCIA
              ================================= */}

              <div className="prueba-facial-coincidencia">
                <div className="prueba-facial-coincidencia-titulo">
                  <span>
                    Coincidencia
                  </span>

                  <strong>
                    {coincidencia.toFixed(1)}%
                  </strong>
                </div>

                <div className="prueba-facial-barra">
                  <div
                    className={
                      reconocido
                        ? "prueba-facial-barra-progreso reconocido"
                        : "prueba-facial-barra-progreso"
                    }
                    style={{
                      width: `${coincidencia}%`,
                    }}
                  />
                </div>

                <small>
                  Valor visual derivado de la
                  distancia facial. No representa
                  una probabilidad estadística.
                </small>
              </div>


              {/* =================================
                  DATOS DEL USUARIO
              ================================= */}

              {reconocido ? (
                <div className="prueba-facial-datos">
                  <div>
                    <span>Nombre</span>

                    <strong>
                      {resultado.nombre ??
                        "No disponible"}
                    </strong>
                  </div>

                  <div>
                    <span>DNI</span>

                    <strong>
                      {resultado.dni ??
                        "No registrado"}
                    </strong>
                  </div>

                  <div>
                    <span>Correo</span>

                    <strong>
                      {resultado.correo ??
                        "No disponible"}
                    </strong>
                  </div>

                  <div>
                    <span>Rol</span>

                    <strong>
                      {resultado.rol ??
                        "No disponible"}
                    </strong>
                  </div>

                  <div>
                    <span>Estado</span>

                    <strong>
                      {resultado.estado ??
                        "No disponible"}
                    </strong>
                  </div>

                  <div>
                    <span>Distancia facial</span>

                    <strong>
                      {resultado.distancia !== null
                        ? resultado.distancia.toFixed(
                            4,
                          )
                        : "No disponible"}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="prueba-facial-no-identidad">
                  <ScanFace size={30} />

                  <p>
                    {hayRostro
                      ? "Se detectó un rostro, pero no supera el criterio de reconocimiento configurado."
                      : "Mantén el rostro visible y centrado frente a la cámara."}
                  </p>
                </div>
              )}
            </>
          )}
        </article>
      </div>
    </section>
  );
}