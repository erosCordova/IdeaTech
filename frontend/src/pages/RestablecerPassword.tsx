import {
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";

import "../styles/RestablecerPassword.css";

function validarContrasena(
  contrasena: string,
): string | null {
  if (contrasena.length < 8) {
    return (
      "La contraseña debe contener al menos " +
      "8 caracteres."
    );
  }

  if (!/[a-z]/.test(contrasena)) {
    return (
      "La contraseña debe incluir al menos " +
      "una letra minúscula."
    );
  }

  if (!/[A-Z]/.test(contrasena)) {
    return (
      "La contraseña debe incluir al menos " +
      "una letra mayúscula."
    );
  }

  if (!/[0-9]/.test(contrasena)) {
    return (
      "La contraseña debe incluir al menos " +
      "un número."
    );
  }

  return null;
}

export default function RestablecerPassword() {
  const navegar = useNavigate();

  const [
    nuevaContrasena,
    setNuevaContrasena,
  ] = useState("");

  const [
    repetirContrasena,
    setRepetirContrasena,
  ] = useState("");

  const [
    mostrarNuevaContrasena,
    setMostrarNuevaContrasena,
  ] = useState(false);

  const [
    mostrarRepeticion,
    setMostrarRepeticion,
  ] = useState(false);

  const [
    verificandoEnlace,
    setVerificandoEnlace,
  ] = useState(true);

  const [
    enlaceValido,
    setEnlaceValido,
  ] = useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [mensajeError, setMensajeError] =
    useState("");

  const [mensajeExito, setMensajeExito] =
    useState("");

  useEffect(() => {
    let componenteActivo = true;

    const comprobarSesion =
      async () => {
        const { data, error } =
          await supabase.auth.getSession();

        if (!componenteActivo) {
          return;
        }

        if (error) {
          setEnlaceValido(false);
          setMensajeError(
            "No se pudo validar el enlace de recuperación.",
          );
        } else {
          setEnlaceValido(
            Boolean(data.session),
          );
        }

        setVerificandoEnlace(false);
      };

    void comprobarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (evento, sesion) => {
        if (!componenteActivo) {
          return;
        }

        if (
          evento === "PASSWORD_RECOVERY" ||
          evento === "SIGNED_IN"
        ) {
          setEnlaceValido(Boolean(sesion));
          setVerificandoEnlace(false);
        }

        if (evento === "SIGNED_OUT") {
          setEnlaceValido(false);
        }
      },
    );

    return () => {
      componenteActivo = false;
      subscription.unsubscribe();
    };
  }, []);

  const actualizarContrasena = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    const errorValidacion =
      validarContrasena(nuevaContrasena);

    if (errorValidacion) {
      setMensajeError(errorValidacion);
      return;
    }

    if (
      nuevaContrasena !==
      repetirContrasena
    ) {
      setMensajeError(
        "Las contraseñas ingresadas no coinciden.",
      );
      return;
    }

    setGuardando(true);

    const { error } =
      await supabase.auth.updateUser({
        password: nuevaContrasena,
      });

    if (error) {
      const mensaje =
        error.message.toLowerCase();

      if (
        mensaje.includes(
          "new password should be different",
        )
      ) {
        setMensajeError(
          "La contraseña nueva debe ser diferente de la contraseña anterior.",
        );
      } else if (
        mensaje.includes("weak password")
      ) {
        setMensajeError(
          "La contraseña no cumple los requisitos de seguridad.",
        );
      } else {
        setMensajeError(
          "No se pudo actualizar la contraseña. Solicita un enlace nuevo e inténtalo nuevamente.",
        );
      }

      setGuardando(false);
      return;
    }

    setMensajeExito(
      "Tu contraseña fue actualizada correctamente. Ahora podrás iniciar sesión con la nueva clave.",
    );

    setNuevaContrasena("");
    setRepetirContrasena("");
    setGuardando(false);

    window.setTimeout(() => {
      void supabase.auth
        .signOut()
        .finally(() => {
          navegar("/login", {
            replace: true,
          });
        });
    }, 1800);
  };

  const volverAlLogin = () => {
    navegar("/login", {
      replace: true,
    });
  };

  if (verificandoEnlace) {
    return (
      <main className="restablecer-pagina">
        <section className="restablecer-tarjeta">
          <div className="restablecer-cargando">
            <LoaderCircle
              size={42}
              className="girando"
            />

            <h1>Validando enlace</h1>

            <p>
              Estamos comprobando tu solicitud
              de recuperación.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!enlaceValido) {
    return (
      <main className="restablecer-pagina">
        <section className="restablecer-tarjeta">
          <div className="restablecer-marca">
            <div>
              <BrainCircuit size={28} />
            </div>

            <span>
              <strong>IdeaTech</strong>
              <small>
                Empresa Inteligente
              </small>
            </span>
          </div>

          <div className="restablecer-estado error">
            <TriangleAlert size={35} />

            <h1>
              Enlace inválido o vencido
            </h1>

            <p>
              Solicita un nuevo enlace desde la
              pantalla de inicio de sesión.
            </p>
          </div>

          {mensajeError && (
            <div className="restablecer-mensaje error">
              {mensajeError}
            </div>
          )}

          <button
            type="button"
            className="restablecer-boton-principal"
            onClick={volverAlLogin}
          >
            Volver al inicio de sesión
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="restablecer-pagina">
      <section className="restablecer-tarjeta">
        <div className="restablecer-marca">
          <div>
            <BrainCircuit size={28} />
          </div>

          <span>
            <strong>IdeaTech</strong>
            <small>
              Empresa Inteligente
            </small>
          </span>
        </div>

        <div className="restablecer-encabezado">
          <div>
            <KeyRound size={27} />
          </div>

          <p>Recuperación de acceso</p>

          <h1>Crear contraseña nueva</h1>

          <span>
            Utiliza una contraseña segura que no
            hayas usado anteriormente.
          </span>
        </div>

        <form
          className="restablecer-formulario"
          onSubmit={actualizarContrasena}
        >
          <label htmlFor="nueva-contrasena">
            <span>Nueva contraseña</span>

            <div className="restablecer-input">
              <LockKeyhole size={19} />

              <input
                id="nueva-contrasena"
                type={
                  mostrarNuevaContrasena
                    ? "text"
                    : "password"
                }
                value={nuevaContrasena}
                onChange={(evento) =>
                  setNuevaContrasena(
                    evento.target.value,
                  )
                }
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                disabled={guardando}
                minLength={8}
                required
                autoFocus
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarNuevaContrasena(
                    (valor) => !valor,
                  )
                }
                aria-label={
                  mostrarNuevaContrasena
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                disabled={guardando}
              >
                {mostrarNuevaContrasena ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </label>

          <label htmlFor="repetir-contrasena">
            <span>Repetir contraseña</span>

            <div className="restablecer-input">
              <LockKeyhole size={19} />

              <input
                id="repetir-contrasena"
                type={
                  mostrarRepeticion
                    ? "text"
                    : "password"
                }
                value={repetirContrasena}
                onChange={(evento) =>
                  setRepetirContrasena(
                    evento.target.value,
                  )
                }
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                disabled={guardando}
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarRepeticion(
                    (valor) => !valor,
                  )
                }
                aria-label={
                  mostrarRepeticion
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                disabled={guardando}
              >
                {mostrarRepeticion ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </label>

          <div className="restablecer-requisitos">
            <ShieldCheck size={18} />

            <span>
              Usa al menos 8 caracteres, una
              mayúscula, una minúscula y un
              número.
            </span>
          </div>

          {mensajeError && (
            <div className="restablecer-mensaje error">
              {mensajeError}
            </div>
          )}

          {mensajeExito && (
            <div className="restablecer-mensaje exito">
              <CheckCircle2 size={18} />
              {mensajeExito}
            </div>
          )}

          <button
            type="submit"
            className="restablecer-boton-principal"
            disabled={
              guardando ||
              Boolean(mensajeExito)
            }
          >
            {guardando ? (
              <>
                <LoaderCircle
                  size={19}
                  className="girando"
                />
                Actualizando...
              </>
            ) : (
              <>
                <KeyRound size={19} />
                Guardar contraseña
              </>
            )}
          </button>

          <button
            type="button"
            className="restablecer-boton-secundario"
            onClick={volverAlLogin}
            disabled={guardando}
          >
            Cancelar y volver
          </button>
        </form>
      </section>
    </main>
  );
}