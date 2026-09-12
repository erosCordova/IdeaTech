import {
  BrainCircuit,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MessageSquareText,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

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
  const {
    usuario,
    perfil,
    cargando,
    iniciarSesion,
    cerrarSesion,
  } = useAuth();

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

  const manejarCierreSesion =
    async () => {
      setEnviando(true);
      setMensajeError("");

      const { error } =
        await cerrarSesion();

      if (error) {
        setMensajeError(
          "No se pudo cerrar la sesión. Inténtalo nuevamente.",
        );
      }

      setEnviando(false);
    };

  if (cargando) {
    return (
      <main className="ideatech-login-carga">
        <LoaderCircle
          size={42}
          className="girando"
        />

        <p>Verificando sesión...</p>
      </main>
    );
  }

  if (usuario) {
    return (
      <main className="ideatech-sesion-activa">
        <section className="ideatech-sesion-tarjeta">
          <div className="ideatech-sesion-icono">
            <ShieldCheck size={44} />
          </div>

          <p className="ideatech-sesion-etiqueta">
            Sesión iniciada correctamente
          </p>

          <h1>
            {perfil?.nombre_completo ||
              "Usuario de IdeaTech"}
          </h1>

          <div className="ideatech-sesion-datos">
            <p>
              <strong>Correo:</strong>{" "}
              {usuario.email}
            </p>

            <p>
              <strong>Rol:</strong>{" "}
              {perfil?.rol ||
                "Cargando perfil"}
            </p>

            <p>
              <strong>Estado:</strong>{" "}
              {perfil?.activo
                ? "Activo"
                : "Inactivo"}
            </p>
          </div>

          {mensajeError && (
            <div className="ideatech-login-error">
              {mensajeError}
            </div>
          )}

          <button
            type="button"
            className="ideatech-boton-cerrar"
            onClick={() =>
              void manejarCierreSesion()
            }
            disabled={enviando}
          >
            <LogOut size={19} />

            {enviando
              ? "Cerrando..."
              : "Cerrar sesión"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="ideatech-login">
      <section className="ideatech-login-presentacion">
        <div className="ideatech-marca">
          <div className="ideatech-marca-icono">
            <BrainCircuit size={34} />
          </div>

          <div>
            <strong>IdeaTech</strong>
            <span>Empresa Inteligente</span>
          </div>
        </div>

        <div className="ideatech-presentacion-contenido">
          <p className="ideatech-presentacion-etiqueta">
            Plataforma empresarial
          </p>

          <h1>
            Convierte la información en
            decisiones inteligentes
          </h1>

          <p className="ideatech-presentacion-texto">
            Gestiona clientes, analiza
            comentarios y anticipa posibles
            cancelaciones desde una plataforma
            segura.
          </p>

          <div className="ideatech-tecnologias">
            <article>
              <Users size={24} />

              <div>
                <strong>
                  Gestión empresarial
                </strong>

                <span>
                  Clientes, empresas y usuarios
                </span>
              </div>
            </article>

            <article>
              <MessageSquareText size={24} />

              <div>
                <strong>
                  Atención centralizada
                </strong>

                <span>
                  Comentarios y soporte
                </span>
              </div>
            </article>

            <article>
              <TrendingUp size={24} />

              <div>
                <strong>
                  Análisis inteligente
                </strong>

                <span>
                  Indicadores y predicciones
                </span>
              </div>
            </article>
          </div>
        </div>

        <p className="ideatech-presentacion-pie">
          Sistema empresarial para la gestión
          y predicción de clientes
        </p>
      </section>

      <section className="ideatech-login-formulario-contenedor">
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
              <h2>Iniciar sesión</h2>

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
              <h2>
                Restablecer contraseña
              </h2>

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