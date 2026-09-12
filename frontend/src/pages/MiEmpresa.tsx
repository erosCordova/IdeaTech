import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Hash,
  LoaderCircle,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Users,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  actualizarMiEmpresa,
  obtenerMiEmpresa,
  obtenerNombreRangoIngreso,
} from "../services/miEmpresaService";

import type {
  DatosMiEmpresa,
} from "../services/miEmpresaService";

import type {
  Cliente,
  RangoIngreso,
  TamanoEmpresa,
} from "../types/database";

import "../styles/MiEmpresa.css";

const formularioInicial: DatosMiEmpresa = {
  empresa: "",
  ruc: "",
  rubro_empresa: "",
  tamano_empresa: "pequena",
  cantidad_empleados: 1,
  antiguedad_empresa: 0,
  rango_ingreso: "menos_10000",
  servidor_propio: false,
};

const rangosIngreso: {
  valor: RangoIngreso;
  nombre: string;
}[] = [
  {
    valor: "menos_10000",
    nombre: "Menos de S/ 10,000",
  },
  {
    valor: "10000_30000",
    nombre: "S/ 10,000 a S/ 30,000",
  },
  {
    valor: "30001_100000",
    nombre: "S/ 30,001 a S/ 100,000",
  },
  {
    valor: "100001_500000",
    nombre: "S/ 100,001 a S/ 500,000",
  },
  {
    valor: "mas_500000",
    nombre: "Más de S/ 500,000",
  },
];

function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

function formatearDinero(valor: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(Number(valor));
}

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "Pendiente";
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fechaConvertida);
}

export default function MiEmpresa() {
  const [empresa, setEmpresa] =
    useState<Cliente | null>(null);

  const [formulario, setFormulario] =
    useState<DatosMiEmpresa>(
      formularioInicial,
    );

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarEmpresa = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const datos = await obtenerMiEmpresa();

      setEmpresa(datos);

      setFormulario({
        empresa: datos.empresa || "",
        ruc: datos.ruc || "",
        rubro_empresa:
          datos.rubro_empresa || "",
        tamano_empresa:
          datos.tamano_empresa || "pequena",
        cantidad_empleados:
          datos.cantidad_empleados > 0
            ? datos.cantidad_empleados
            : 1,
        antiguedad_empresa:
          datos.antiguedad_empresa || 0,
        rango_ingreso:
          datos.rango_ingreso ||
          "menos_10000",
        servidor_propio:
          datos.servidor_propio,
      });
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarEmpresa();
  }, [cargarEmpresa]);

  const cambiarCampo = (
    campo: keyof DatosMiEmpresa,
    valor: string | number | boolean,
  ) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const cambiarRuc = (valor: string) => {
    const soloNumeros = valor
      .replace(/\D/g, "")
      .slice(0, 11);

    cambiarCampo("ruc", soloNumeros);
  };

  const manejarGuardado = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const empresaActualizada =
        await actualizarMiEmpresa(
          formulario,
        );

      setEmpresa(empresaActualizada);

      setMensaje(
        "Los datos fueron enviados para verificación.",
      );
    } catch (errorGuardado) {
      setError(
        obtenerMensajeError(errorGuardado),
      );
    } finally {
      setGuardando(false);
    }
  };

  const obtenerEstado = () => {
    if (
      empresa?.estado_datos === "verificado"
    ) {
      return {
        nombre: "Datos verificados",
        descripcion:
          "La información fue revisada por IdeaTech.",
        clase: "verificado",
        icono: BadgeCheck,
      };
    }

    if (
      empresa?.estado_datos ===
      "pendiente_verificacion"
    ) {
      return {
        nombre: "Pendiente de verificación",
        descripcion:
          "Un administrador revisará la información.",
        clase: "pendiente",
        icono: Clock3,
      };
    }

    return {
      nombre: "Datos incompletos",
      descripcion:
        "Completa el formulario empresarial.",
      clase: "incompleto",
      icono: XCircle,
    };
  };

  const estado = obtenerEstado();
  const IconoEstado = estado.icono;

  if (cargando) {
    return (
      <main className="mi-empresa-cargando">
        <LoaderCircle
          className="girando"
          size={40}
        />
        <p>Cargando información empresarial...</p>
      </main>
    );
  }

  return (
    <section className="mi-empresa-pagina">
      <header className="mi-empresa-encabezado">
        <div>
          <span className="mi-empresa-etiqueta">
            Perfil empresarial
          </span>

          <h1>Mi empresa</h1>

          <p>
            Completa los datos que IdeaTech necesita para
            evaluar los servicios y generar análisis.
          </p>
        </div>

        <button
          type="button"
          className="mi-empresa-actualizar"
          onClick={() => void cargarEmpresa()}
          disabled={guardando}
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </header>

      {mensaje && (
        <div className="mi-empresa-alerta exito">
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
        <div className="mi-empresa-alerta error">
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

      <div
        className={`mi-empresa-estado ${estado.clase}`}
      >
        <div>
          <IconoEstado size={24} />
        </div>

        <span>
          <strong>{estado.nombre}</strong>
          <small>{estado.descripcion}</small>
        </span>

        {empresa?.estado_datos ===
          "verificado" && (
          <small>
            Verificada el{" "}
            {formatearFecha(
              empresa.fecha_verificacion,
            )}
          </small>
        )}
      </div>

      <div className="mi-empresa-contenido">
        <form
          className="mi-empresa-formulario"
          onSubmit={manejarGuardado}
        >
          <div className="mi-empresa-formulario-titulo">
            <div>
              <Building2 size={24} />
            </div>

            <span>
              <strong>Información declarada</strong>
              <small>
                Estos datos serán revisados antes de
                habilitar las predicciones.
              </small>
            </span>
          </div>

          <div className="mi-empresa-grid">
            <label>
              <span>Razón social *</span>

              <div className="mi-empresa-input">
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
                  minLength={3}
                  maxLength={150}
                  disabled={guardando}
                  required
                />
              </div>
            </label>

            <label>
              <span>RUC *</span>

              <div className="mi-empresa-input">
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
                  minLength={11}
                  maxLength={11}
                  pattern="[0-9]{11}"
                  disabled={
                    guardando ||
                    Boolean(empresa?.ruc)
                  }
                  required
                />
              </div>

              {empresa?.ruc && (
                <small className="mi-empresa-ayuda">
                  Para cambiar el RUC, comunícate con el
                  administrador.
                </small>
              )}
            </label>

            <label>
              <span>Rubro o actividad *</span>

              <div className="mi-empresa-input">
                <WalletCards size={18} />

                <input
                  type="text"
                  value={
                    formulario.rubro_empresa
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "rubro_empresa",
                      evento.target.value,
                    )
                  }
                  placeholder="Ejemplo: tecnología"
                  minLength={3}
                  maxLength={100}
                  disabled={guardando}
                  required
                />
              </div>
            </label>

            <label>
              <span>Tamaño de empresa *</span>

              <select
                value={
                  formulario.tamano_empresa
                }
                onChange={(evento) =>
                  cambiarCampo(
                    "tamano_empresa",
                    evento.target
                      .value as TamanoEmpresa,
                  )
                }
                disabled={guardando}
              >
                <option value="pequena">
                  Pequeña
                </option>
                <option value="mediana">
                  Mediana
                </option>
                <option value="grande">
                  Grande
                </option>
              </select>
            </label>

            <label>
              <span>Cantidad de empleados *</span>

              <div className="mi-empresa-input">
                <Users size={18} />

                <input
                  type="number"
                  value={
                    formulario.cantidad_empleados
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "cantidad_empleados",
                      Number(evento.target.value),
                    )
                  }
                  min={1}
                  max={1000000}
                  disabled={guardando}
                  required
                />
              </div>
            </label>

            <label>
              <span>
                Antigüedad de la empresa *
              </span>

              <div className="mi-empresa-input">
                <Clock3 size={18} />

                <input
                  type="number"
                  value={
                    formulario.antiguedad_empresa
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "antiguedad_empresa",
                      Number(evento.target.value),
                    )
                  }
                  min={0}
                  max={200}
                  disabled={guardando}
                  required
                />
              </div>
            </label>

            <label className="mi-empresa-campo-completo">
              <span>
                Rango de ingresos mensuales *
              </span>

              <select
                value={
                  formulario.rango_ingreso
                }
                onChange={(evento) =>
                  cambiarCampo(
                    "rango_ingreso",
                    evento.target
                      .value as RangoIngreso,
                  )
                }
                disabled={guardando}
              >
                {rangosIngreso.map((rango) => (
                  <option
                    key={rango.valor}
                    value={rango.valor}
                  >
                    {rango.nombre}
                  </option>
                ))}
              </select>

              <small className="mi-empresa-ayuda">
                IdeaTech utiliza un rango para proteger la
                privacidad financiera de tu empresa.
              </small>
            </label>

            <label className="mi-empresa-campo-completo mi-empresa-interruptor">
              <input
                type="checkbox"
                checked={
                  formulario.servidor_propio
                }
                onChange={(evento) =>
                  cambiarCampo(
                    "servidor_propio",
                    evento.target.checked,
                  )
                }
                disabled={guardando}
              />

              <span>
                <Server size={21} />

                <span>
                  <strong>
                    La empresa posee servidor propio
                  </strong>
                  <small>
                    Selecciona esta opción si administra
                    infraestructura propia.
                  </small>
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="mi-empresa-guardar"
            disabled={guardando}
          >
            {guardando ? (
              <LoaderCircle
                className="girando"
                size={19}
              />
            ) : (
              <Save size={19} />
            )}

            {guardando
              ? "Guardando..."
              : "Guardar y enviar a verificación"}
          </button>
        </form>

        <aside className="mi-empresa-datos-internos">
          <div className="mi-empresa-datos-titulo">
            <ShieldCheck size={23} />

            <div>
              <strong>Datos del servicio</strong>
              <small>
                Administrados por IdeaTech
              </small>
            </div>
          </div>

          <div className="mi-empresa-dato">
            <span>Plan contratado</span>
            <strong>
              {empresa?.tipo_plan ||
                "Sin asignar"}
            </strong>
          </div>

          <div className="mi-empresa-dato">
            <span>Suscripción mensual</span>
            <strong>
              {formatearDinero(
                empresa?.monto_suscripcion || 0,
              )}
            </strong>
          </div>

          <div className="mi-empresa-dato">
            <span>Accesos API</span>
            <strong>
              {empresa?.accesos_api || 0}
            </strong>
          </div>

          <div className="mi-empresa-dato">
            <span>Servicios activos</span>
            <strong>
              {empresa?.servicios_activos || 0}
            </strong>
          </div>

          <div className="mi-empresa-dato">
            <span>Ingreso declarado</span>
            <strong>
              {obtenerNombreRangoIngreso(
                empresa?.rango_ingreso || null,
              )}
            </strong>
          </div>

          <p>
            El administrador verificará la información y
            configurará el plan, la suscripción y los
            servicios contratados.
          </p>
        </aside>
      </div>
    </section>
  );
}