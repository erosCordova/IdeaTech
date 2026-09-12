import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Hash,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  Send,
  User,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import { Link } from "react-router-dom";

import { supabase } from "../lib/supabase";

import "../styles/Registro.css";

interface FormularioRegistro {
  nombreCompleto: string;
  correo: string;
  telefono: string;
  empresa: string;
  ruc: string;
  cargo: string;
  motivoSolicitud: string;
  contrasena: string;
  confirmarContrasena: string;
}

const formularioInicial: FormularioRegistro = {
  nombreCompleto: "",
  correo: "",
  telefono: "",
  empresa: "",
  ruc: "",
  cargo: "",
  motivoSolicitud: "",
  contrasena: "",
  confirmarContrasena: "",
};

export default function Registro() {
  const [formulario, setFormulario] =
    useState<FormularioRegistro>(
      formularioInicial,
    );

  const [
    mostrarContrasena,
    setMostrarContrasena,
  ] = useState(false);

  const [enviando, setEnviando] =
    useState(false);

  const [
    solicitudEnviada,
    setSolicitudEnviada,
  ] = useState(false);

  const [error, setError] = useState("");

  const cambiarCampo = (
    campo: keyof FormularioRegistro,
    valor: string,
  ) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const cambiarRuc = (valor: string) => {
    const soloNumeros = valor
      .replace(/\D/g, "")
      .slice(0, 11);

    cambiarCampo("ruc", soloNumeros);
  };

  const cambiarTelefono = (valor: string) => {
    const telefonoPermitido = valor
      .replace(/[^\d+\s-]/g, "")
      .slice(0, 20);

    cambiarCampo(
      "telefono",
      telefonoPermitido,
    );
  };

  const enviarSolicitud = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();
    setError("");

    if (
      !formulario.nombreCompleto.trim() ||
      !formulario.correo.trim() ||
      !formulario.empresa.trim() ||
      !formulario.ruc.trim() ||
      !formulario.cargo.trim() ||
      !formulario.motivoSolicitud.trim()
    ) {
      setError(
        "Completa todos los campos obligatorios.",
      );
      return;
    }

    if (!/^\d{11}$/.test(formulario.ruc)) {
      setError(
        "El RUC debe contener exactamente 11 números.",
      );
      return;
    }

    if (formulario.contrasena.length < 8) {
      setError(
        "La contraseña debe tener al menos 8 caracteres.",
      );
      return;
    }

    if (
      formulario.contrasena !==
      formulario.confirmarContrasena
    ) {
      setError(
        "Las contraseñas no coinciden.",
      );
      return;
    }

    setEnviando(true);

    const { error: errorRegistro } =
      await supabase.auth.signUp({
        email: formulario.correo
          .trim()
          .toLowerCase(),
        password: formulario.contrasena,
        options: {
          data: {
            nombre_completo:
              formulario.nombreCompleto.trim(),
            telefono:
              formulario.telefono.trim(),
            empresa:
              formulario.empresa.trim(),
            ruc: formulario.ruc.trim(),
            cargo: formulario.cargo.trim(),
            motivo_solicitud:
              formulario.motivoSolicitud.trim(),
          },
        },
      });

    if (errorRegistro) {
      const mensaje =
        errorRegistro.message.toLowerCase();

      if (
        mensaje.includes("already registered")
      ) {
        setError(
          "Este correo electrónico ya está registrado.",
        );
      } else if (
        mensaje.includes("duplicate") ||
        mensaje.includes("ruc")
      ) {
        setError(
          "Este RUC ya está registrado en IdeaTech.",
        );
      } else if (
        mensaje.includes("rate limit")
      ) {
        setError(
          "Se alcanzó temporalmente el límite de registros. Espera unos minutos e inténtalo nuevamente.",
        );
      } else {
        setError(errorRegistro.message);
      }

      setEnviando(false);
      return;
    }

    await supabase.auth.signOut();

    setFormulario(formularioInicial);
    setSolicitudEnviada(true);
    setEnviando(false);
  };

  if (solicitudEnviada) {
    return (
      <main className="registro-resultado">
        <section className="registro-resultado-tarjeta">
          <div className="registro-resultado-icono">
            <CheckCircle2 size={48} />
          </div>

          <p>Solicitud enviada</p>

          <h1>
            Tu registro está pendiente de aprobación
          </h1>

          <span>
            Un administrador de IdeaTech revisará tu
            información y el RUC de la empresa. Cuando tu
            cuenta sea aprobada podrás iniciar sesión y
            completar los datos empresariales.
          </span>

          <Link to="/login">
            <ArrowLeft size={18} />
            Regresar al inicio de sesión
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="registro-pagina">
      <section className="registro-presentacion">
        <div className="registro-marca">
          <Building2 size={32} />

          <div>
            <strong>IdeaTech</strong>
            <span>Solicitud de acceso</span>
          </div>
        </div>

        <div className="registro-presentacion-contenido">
          <p>Únete a la plataforma</p>

          <h1>
            Solicita acceso al sistema empresarial
          </h1>

          <span>
            Completa tus datos. Un administrador revisará la
            solicitud y decidirá si corresponde aprobarla.
          </span>

          <ul>
            <li>
              Información protegida mediante RLS
            </li>
            <li>
              Acceso controlado según el rol asignado
            </li>
            <li>
              Registro administrado con Supabase Auth
            </li>
            <li>
              Validación de la empresa mediante RUC
            </li>
          </ul>
        </div>

        <small>
          Las cuentas nuevas no obtienen acceso automático.
        </small>
      </section>

      <section className="registro-formulario-contenedor">
        <form
          className="registro-formulario"
          onSubmit={enviarSolicitud}
        >
          <div className="registro-formulario-header">
            <Link to="/login">
              <ArrowLeft size={18} />
              Volver
            </Link>

            <p>Nueva solicitud</p>
            <h2>Registro de usuario</h2>

            <span>
              Los campos marcados son obligatorios.
            </span>
          </div>

          <div className="registro-grid">
            <label>
              <span>Nombre completo *</span>

              <div className="registro-input">
                <User size={18} />

                <input
                  type="text"
                  value={
                    formulario.nombreCompleto
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "nombreCompleto",
                      evento.target.value,
                    )
                  }
                  placeholder="Nombres y apellidos"
                  autoComplete="name"
                  required
                />
              </div>
            </label>

            <label>
              <span>Correo electrónico *</span>

              <div className="registro-input">
                <Mail size={18} />

                <input
                  type="email"
                  value={formulario.correo}
                  onChange={(evento) =>
                    cambiarCampo(
                      "correo",
                      evento.target.value,
                    )
                  }
                  placeholder="nombre@empresa.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label>
              <span>Teléfono</span>

              <div className="registro-input">
                <Phone size={18} />

                <input
                  type="tel"
                  value={formulario.telefono}
                  onChange={(evento) =>
                    cambiarTelefono(
                      evento.target.value,
                    )
                  }
                  placeholder="999 999 999"
                  autoComplete="tel"
                  maxLength={20}
                />
              </div>
            </label>

            <label>
              <span>Empresa *</span>

              <div className="registro-input">
                <Building2 size={18} />

                <input
                  type="text"
                  value={formulario.empresa}
                  onChange={(evento) =>
                    cambiarCampo(
                      "empresa",
                      evento.target.value,
                    )
                  }
                  placeholder="Razón social de la empresa"
                  autoComplete="organization"
                  required
                />
              </div>
            </label>

            <label>
              <span>RUC de la empresa *</span>

              <div className="registro-input">
                <Hash size={18} />

                <input
                  type="text"
                  inputMode="numeric"
                  value={formulario.ruc}
                  onChange={(evento) =>
                    cambiarRuc(
                      evento.target.value,
                    )
                  }
                  placeholder="11 números"
                  minLength={11}
                  maxLength={11}
                  pattern="[0-9]{11}"
                  title="Ingresa los 11 números del RUC"
                  required
                />
              </div>
            </label>

            <label>
              <span>Cargo *</span>

              <div className="registro-input">
                <User size={18} />

                <input
                  type="text"
                  value={formulario.cargo}
                  onChange={(evento) =>
                    cambiarCampo(
                      "cargo",
                      evento.target.value,
                    )
                  }
                  placeholder="Cargo que desempeña"
                  autoComplete="organization-title"
                  required
                />
              </div>
            </label>

            <label>
              <span>Contraseña *</span>

              <div className="registro-input">
                <LockKeyhole size={18} />

                <input
                  type={
                    mostrarContrasena
                      ? "text"
                      : "password"
                  }
                  value={formulario.contrasena}
                  onChange={(evento) =>
                    cambiarCampo(
                      "contrasena",
                      evento.target.value,
                    )
                  }
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarContrasena(
                      (anterior) => !anterior,
                    )
                  }
                  aria-label={
                    mostrarContrasena
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarContrasena ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>

            <label>
              <span>
                Confirmar contraseña *
              </span>

              <div className="registro-input">
                <LockKeyhole size={18} />

                <input
                  type={
                    mostrarContrasena
                      ? "text"
                      : "password"
                  }
                  value={
                    formulario.confirmarContrasena
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "confirmarContrasena",
                      evento.target.value,
                    )
                  }
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </label>

            <label className="registro-campo-completo">
              <span>
                Motivo de la solicitud *
              </span>

              <textarea
                value={
                  formulario.motivoSolicitud
                }
                onChange={(evento) =>
                  cambiarCampo(
                    "motivoSolicitud",
                    evento.target.value,
                  )
                }
                placeholder="Explica brevemente por qué necesitas acceder al sistema..."
                rows={4}
                minLength={5}
                maxLength={1000}
                required
              />
            </label>
          </div>

          {error && (
            <div className="registro-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="registro-enviar"
            disabled={enviando}
          >
            {enviando ? (
              <>
                <LoaderCircle
                  className="girando"
                  size={19}
                />
                Enviando solicitud...
              </>
            ) : (
              <>
                <Send size={19} />
                Enviar solicitud
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}