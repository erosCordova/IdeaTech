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
  ShieldCheck,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

import "../styles/Login.css";

type VistaFormulario =
  | "login"
  | "recuperar";

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

  const manejarInicioSesion = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();
    setMensajeError("");
    setMensajeExito("");

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
    }

    setEnviando(false);
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
    </main>
  );
}