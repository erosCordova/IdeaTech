import {
  ArrowLeft,
  BrainCircuit,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  ScanFace,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  consultarEstadoFacialPropio,
  iniciarSesionFacial,
  registrarRostroPropio,
  verificarTokenFacial,
} from "../services/facialService";

import "../styles/Login.css";

type VistaFormulario =
  | "login"
  | "recuperar";

type ModoCamaraFacial =
  | "login"
  | "registro";

function obtenerMensajeRecuperacion(
  mensaje: string,
): string {
  const mensajeNormalizado =
    mensaje.toLowerCase();

  if (
    mensajeNormalizado.includes(
      "rate limit",
    )
  ) {
    return (
      "Se enviaron demasiadas solicitudes. " +
      "Espera unos minutos antes de intentarlo nuevamente."
    );
  }

  if (
    mensajeNormalizado.includes(
      "invalid email",
    )
  ) {
    return "El correo electrónico no es válido.";
  }

  return (
    "No se pudo procesar la recuperación. " +
    "Inténtalo nuevamente."
  );
}

export default function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] =
    useState("");

  const [contrasena, setContrasena] =
    useState("");

  const [
    mostrarContrasena,
    setMostrarContrasena,
  ] = useState(false);

  const [enviando, setEnviando] =
    useState(false);

  const [
    vistaFormulario,
    setVistaFormulario,
  ] = useState<VistaFormulario>("login");

  const [
    mensajeError,
    setMensajeError,
  ] = useState("");

  const [
    mensajeExito,
    setMensajeExito,
  ] = useState("");

  const [
    mostrarCamaraFacial,
    setMostrarCamaraFacial,
  ] = useState(false);

  const [
    iniciandoCamara,
    setIniciandoCamara,
  ] = useState(false);

  const [
    verificandoRostro,
    setVerificandoRostro,
  ] = useState(false);

  const [
    mensajeFacial,
    setMensajeFacial,
  ] = useState(
    "Coloca tu rostro dentro de la guía.",
  );

  const [
    modoCamaraFacial,
    setModoCamaraFacial,
  ] = useState<ModoCamaraFacial>("login");

  const [
    ofrecerRegistroFacial,
    setOfrecerRegistroFacial,
  ] = useState(false);

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const cerrarCamaraFacial = () => {
    detenerCamara();
    setMostrarCamaraFacial(false);
    setIniciandoCamara(false);
    setVerificandoRostro(false);
    setMensajeFacial(
      "Coloca tu rostro dentro de la guía.",
    );

    if (modoCamaraFacial === "registro") {
      setOfrecerRegistroFacial(true);
    }
  };

  const abrirCamaraFacial = async (
    modo: ModoCamaraFacial = "login",
  ) => {
    setMensajeError("");
    setMensajeExito("");
    setModoCamaraFacial(modo);
    setMostrarCamaraFacial(true);
    setIniciandoCamara(true);
    setMensajeFacial(
      "Preparando cámara...",
    );

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setMensajeFacial(
        "Coloca tu rostro dentro de la guía.",
      );
    } catch {
      detenerCamara();

      setMensajeFacial(
        "No se pudo acceder a la cámara. " +
          "Comprueba los permisos del navegador.",
      );
    } finally {
      setIniciandoCamara(false);
    }
  };

  const capturarImagenFacial = ():
  string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      return null;
    }

    const anchoMaximo = 640;

    const escala = Math.min(
      1,
      anchoMaximo / video.videoWidth,
    );

    const ancho = Math.round(
      video.videoWidth * escala,
    );

    const alto = Math.round(
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
      0.85,
    );
  };

  const verificarRostro = async () => {
    if (verificandoRostro) {
      return;
    }

    const imagen = capturarImagenFacial();

    if (!imagen) {
      setMensajeFacial(
        "La cámara todavía no está lista.",
      );
      return;
    }

    setVerificandoRostro(true);

    try {
      if (modoCamaraFacial === "registro") {
        setMensajeFacial(
          "Registrando tu rostro...",
        );

        const respuesta =
          await registrarRostroPropio(imagen);

        setMensajeFacial(
          respuesta.mensaje ||
            "Acceso facial activado correctamente.",
        );

        detenerCamara();
        setMostrarCamaraFacial(false);
        setOfrecerRegistroFacial(false);

        navigate("/", {
          replace: true,
          state: null,
        });
        return;
      }

      setMensajeFacial(
        "Verificando identidad...",
      );

      const respuesta =
        await iniciarSesionFacial(imagen);

      if (
        !respuesta.autenticado ||
        !respuesta.token_hash
      ) {
        setMensajeFacial(
          respuesta.mensaje ||
            "No se pudo reconocer el rostro.",
        );
        return;
      }

      setMensajeFacial(
        "Rostro reconocido. Iniciando sesión...",
      );

      await verificarTokenFacial(
        respuesta.token_hash,
      );

      detenerCamara();
      setMostrarCamaraFacial(false);

      navigate("/", {
        replace: true,
        state: null,
      });
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : (
              modoCamaraFacial === "registro"
                ? "No se pudo registrar el rostro."
                : "No se pudo realizar el acceso facial."
            );

      setMensajeFacial(mensaje);
    } finally {
      setVerificandoRostro(false);
    }
  };

  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  const manejarInicioSesion = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    setMensajeError("");
    setMensajeExito("");
    setOfrecerRegistroFacial(false);

    if (!correo.trim() || !contrasena) {
      setMensajeError(
        "Ingresa tu correo electrónico y contraseña.",
      );
      return;
    }

    setEnviando(true);

    const { error } = await iniciarSesion(
      correo.trim().toLowerCase(),
      contrasena,
    );

    if (error) {

      if (
        error.message.includes(
          "Invalid login credentials",
        )
      ) {
        setMensajeError(
          "El correo electrónico o la contraseña son incorrectos.",
        );
      } else if (
        error.message.includes(
          "Email not confirmed",
        )
      ) {
        setMensajeError(
          "Debes confirmar tu correo electrónico antes de ingresar.",
        );
      } else {
        setMensajeError(
          "No se pudo iniciar sesión. Inténtalo nuevamente.",
        );
      }

      setEnviando(false);
      return;
    }

    /*
     * Las credenciales ya fueron validadas.
     * El rostro es opcional.
     */
    try {
      const estadoFacial =
        await consultarEstadoFacialPropio();

      if (estadoFacial.registrado) {
        navigate("/", {
          replace: true,
          state: null,
        });

        return;
      }

      setOfrecerRegistroFacial(true);
    } catch {
      /*
       * Un error del sistema facial nunca debe impedir
       * el acceso mediante correo y contraseña.
       * Mostramos igualmente la opción de registrarlo.
       */
      setOfrecerRegistroFacial(true);
    } finally {
      setEnviando(false);
    }
  };

  const continuarSinRegistroFacial = () => {
    setOfrecerRegistroFacial(false);

    navigate("/", {
      replace: true,
      state: null,
    });
  };

  const comenzarRegistroFacial = () => {
    setOfrecerRegistroFacial(false);

    void abrirCamaraFacial("registro");
  };

  const manejarRecuperacion = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    const correoLimpio =
      correo.trim().toLowerCase();

    if (!correoLimpio) {
      setMensajeError(
        "Ingresa el correo electrónico de tu cuenta.",
      );
      return;
    }

    setEnviando(true);

    const urlRedireccion =
      `${window.location.origin}` +
      "/restablecer-password";

    const { error } =
      await supabase.auth
        .resetPasswordForEmail(
          correoLimpio,
          {
            redirectTo: urlRedireccion,
          },
        );

    if (error) {
      setMensajeError(
        obtenerMensajeRecuperacion(
          error.message,
        ),
      );
    } else {
      setMensajeExito(
        "Si el correo pertenece a una cuenta registrada, recibirás un enlace para crear una contraseña nueva.",
      );
    }

    setEnviando(false);
  };

  const mostrarRecuperacion = () => {
    setVistaFormulario("recuperar");
    setContrasena("");
    setMensajeError("");
    setMensajeExito("");
  };

  const mostrarLogin = () => {
    setVistaFormulario("login");
    setContrasena("");
    setMensajeError("");
    setMensajeExito("");
  };

  return (
    <main className="ideatech-login">
      <Link
        to="/presentacion"
        className="ideatech-login-volver-presentacion"
      >
        <ArrowLeft size={18} />
        Volver a la presentación
      </Link>

      <section className="ideatech-login-contenido">
        <div className="ideatech-login-marca">
          <div className="ideatech-login-marca-icono">
            <BrainCircuit size={30} />
          </div>

          <div>
            <strong>IdeaTech</strong>
            <span>Empresa Inteligente</span>
          </div>
        </div>

        {vistaFormulario === "login" ? (
          <form
            className="ideatech-login-formulario"
            onSubmit={manejarInicioSesion}
          >
            <div className="ideatech-formulario-icono">
              <LogIn size={28} />
            </div>

            <div className="ideatech-formulario-encabezado">
              <p>Bienvenido nuevamente</p>

              <h1>Iniciar sesión</h1>

              <span>
                Ingresa tus credenciales para
                acceder al sistema.
              </span>
            </div>

            <label
              className="ideatech-login-campo"
              htmlFor="correo"
            >
              <span>
                Correo electrónico
              </span>

              <div className="ideatech-login-input">
                <Mail size={19} />

                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(evento) =>
                    setCorreo(
                      evento.target.value,
                    )
                  }
                  placeholder="nombre@empresa.com"
                  autoComplete="email"
                  disabled={enviando}
                  required
                  autoFocus
                />
              </div>
            </label>

            <label
              className="ideatech-login-campo"
              htmlFor="contrasena"
            >
              <span>Contraseña</span>

              <div className="ideatech-login-input">
                <LockKeyhole size={19} />

                <input
                  id="contrasena"
                  type={
                    mostrarContrasena
                      ? "text"
                      : "password"
                  }
                  value={contrasena}
                  onChange={(evento) =>
                    setContrasena(
                      evento.target.value,
                    )
                  }
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  disabled={enviando}
                  required
                />

                <button
                  type="button"
                  className="ideatech-ver-contrasena"
                  onClick={() =>
                    setMostrarContrasena(
                      (valorAnterior) =>
                        !valorAnterior,
                    )
                  }
                  aria-label={
                    mostrarContrasena
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  disabled={enviando}
                >
                  {mostrarContrasena ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            <button
              type="button"
              className="ideatech-olvido-contrasena"
              onClick={mostrarRecuperacion}
              disabled={enviando}
            >
              ¿Olvidaste tu contraseña?
            </button>

            {mensajeError && (
              <div className="ideatech-login-error">
                {mensajeError}
              </div>
            )}

            <button
              className="ideatech-login-boton"
              type="submit"
              disabled={enviando}
            >
              {enviando ? (
                <>
                  <LoaderCircle
                    size={20}
                    className="girando"
                  />
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Ingresar al sistema
                </>
              )}
            </button>

            <div className="ideatech-login-alternativa">
              <span>
                o ingresa mediante
              </span>

              <button
                type="button"
                className="ideatech-login-facial-boton"
                onClick={() =>
                  void abrirCamaraFacial("login")
                }
                disabled={enviando}
                aria-label="Ingresar con reconocimiento facial"
                title="Reconocimiento facial"
              >
                <ScanFace size={23} />
              </button>

              <small>
                Reconocimiento facial
              </small>
            </div>

            <div className="ideatech-login-seguridad">
              <ShieldCheck size={18} />

              <span>
                Acceso protegido y restringido
                según el rol del usuario
              </span>
            </div>
          </form>
        ) : (
          <form
            className="ideatech-login-formulario"
            onSubmit={manejarRecuperacion}
          >
            <div className="ideatech-formulario-icono">
              <KeyRound size={28} />
            </div>

            <div className="ideatech-formulario-encabezado">
              <p>Recuperar acceso</p>

              <h1>
                Restablecer contraseña
              </h1>

              <span>
                Ingresa el correo de tu cuenta.
                Te enviaremos un enlace seguro.
              </span>
            </div>

            <label
              className="ideatech-login-campo"
              htmlFor="correo-recuperacion"
            >
              <span>
                Correo electrónico
              </span>

              <div className="ideatech-login-input">
                <Mail size={19} />

                <input
                  id="correo-recuperacion"
                  type="email"
                  value={correo}
                  onChange={(evento) =>
                    setCorreo(
                      evento.target.value,
                    )
                  }
                  placeholder="nombre@empresa.com"
                  autoComplete="email"
                  disabled={enviando}
                  required
                  autoFocus
                />
              </div>
            </label>

            {mensajeError && (
              <div className="ideatech-login-error">
                {mensajeError}
              </div>
            )}

            {mensajeExito && (
              <div className="ideatech-login-exito">
                {mensajeExito}
              </div>
            )}

            <button
              className="ideatech-login-boton"
              type="submit"
              disabled={
                enviando ||
                Boolean(mensajeExito)
              }
            >
              {enviando ? (
                <>
                  <LoaderCircle
                    size={20}
                    className="girando"
                  />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail size={20} />
                  Enviar enlace
                </>
              )}
            </button>

            <button
              type="button"
              className="ideatech-volver-login"
              onClick={mostrarLogin}
              disabled={enviando}
            >
              Volver al inicio de sesión
            </button>
          </form>
        )}
      </section>

      {ofrecerRegistroFacial && (
        <div
          className="ideatech-facial-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Activar acceso facial"
        >
          <div className="ideatech-facial-modal-contenido">
            <div className="ideatech-facial-modal-icono">
              <ScanFace size={26} />
            </div>

            <h2>¿Activar acceso facial?</h2>

            <p>
              Tus credenciales son correctas y todavía
              no tienes un rostro registrado. Puedes
              registrarlo ahora para futuros inicios
              de sesión.
            </p>

            <button
              type="button"
              className="ideatech-login-boton"
              onClick={comenzarRegistroFacial}
            >
              <ScanFace size={20} />
              Registrar mi rostro
            </button>

            <button
              type="button"
              className="ideatech-volver-login"
              onClick={continuarSinRegistroFacial}
            >
              Ahora no, continuar al sistema
            </button>
          </div>
        </div>
      )}

      {mostrarCamaraFacial && (
        <div
          className="ideatech-facial-modal"
          role="dialog"
          aria-modal="true"
          aria-label={
            modoCamaraFacial === "registro"
              ? "Registro facial"
              : "Inicio de sesión facial"
          }
        >
          <div className="ideatech-facial-modal-contenido">
            <button
              type="button"
              className="ideatech-facial-cerrar"
              onClick={cerrarCamaraFacial}
              aria-label="Cerrar reconocimiento facial"
            >
              <X size={21} />
            </button>

            <div className="ideatech-facial-modal-icono">
              <ScanFace size={26} />
            </div>

            <h2>
              {modoCamaraFacial === "registro"
                ? "Registrar mi rostro"
                : "Reconocimiento facial"}
            </h2>

            <p>
              {modoCamaraFacial === "registro"
                ? "Coloca tu rostro frente a la cámara. Este registro quedará vinculado únicamente a tu cuenta."
                : "Coloca tu rostro frente a la cámara para verificar tu identidad."}
            </p>

            <div className="ideatech-facial-camara">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
              />

              <div className="ideatech-facial-guia">
                <div className="ideatech-facial-linea" />
              </div>

              {iniciandoCamara && (
                <div className="ideatech-facial-cargando">
                  <LoaderCircle
                    size={28}
                    className="girando"
                  />
                </div>
              )}
            </div>

            <canvas
              ref={canvasRef}
              className="ideatech-facial-canvas"
            />

            <div className="ideatech-facial-mensaje">
              {mensajeFacial}
            </div>

            <button
              type="button"
              className="ideatech-login-boton"
              onClick={verificarRostro}
              disabled={
                iniciandoCamara ||
                verificandoRostro ||
                !streamRef.current
              }
            >
              {verificandoRostro ? (
                <>
                  <LoaderCircle
                    size={20}
                    className="girando"
                  />
                  Verificando...
                </>
              ) : (
                <>
                  <ScanFace size={20} />
                  {modoCamaraFacial === "registro"
                    ? "Registrar mi rostro"
                    : "Verificar rostro"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}