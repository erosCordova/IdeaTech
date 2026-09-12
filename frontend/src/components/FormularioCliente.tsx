import {
  LoaderCircle,
  Save,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  Cliente,
  NuevoCliente,
  RangoIngreso,
  TamanoEmpresa,
  TipoPlan,
} from "../types/database";

interface FormularioClienteProps {
  cliente: Cliente | null;
  guardando: boolean;
  onGuardar: (
    datos: NuevoCliente,
  ) => Promise<void>;
  onCerrar: () => void;
}

const datosIniciales: NuevoCliente = {
  nombre: "",
  correo: "",
  telefono: "",
  empresa: "",
  ruc: null,
  rubro_empresa: "",
  tamano_empresa: "pequena",
  cantidad_empleados: 0,
  antiguedad_empresa: 0,
  tipo_plan: "basico",
  ingreso_mensual: 0,
  rango_ingreso: null,
  monto_suscripcion: 0,
  servidor_propio: false,
  accesos_api: 0,
  servicios_activos: 0,
  cancelo_servicio: false,
  estado: "activo",
  estado_datos: "incompletos",
};

export default function FormularioCliente({
  cliente,
  guardando,
  onGuardar,
  onCerrar,
}: FormularioClienteProps) {
  const [formulario, setFormulario] =
    useState<NuevoCliente>(
      datosIniciales,
    );

  const [errorLocal, setErrorLocal] =
    useState("");

  useEffect(() => {
    setErrorLocal("");

    if (!cliente) {
      setFormulario(datosIniciales);
      return;
    }

    setFormulario({
      nombre: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono ?? "",
      empresa: cliente.empresa,
      ruc: cliente.ruc,
      rubro_empresa:
        cliente.rubro_empresa,
      tamano_empresa:
        cliente.tamano_empresa,
      cantidad_empleados:
        cliente.cantidad_empleados,
      antiguedad_empresa:
        cliente.antiguedad_empresa,
      tipo_plan: cliente.tipo_plan,
      ingreso_mensual:
        cliente.ingreso_mensual,
      rango_ingreso:
        cliente.rango_ingreso,
      monto_suscripcion:
        cliente.monto_suscripcion,
      servidor_propio:
        cliente.servidor_propio,
      accesos_api: cliente.accesos_api,
      servicios_activos:
        cliente.servicios_activos,
      cancelo_servicio:
        cliente.cancelo_servicio ?? false,
      estado: cliente.estado,
      estado_datos:
        cliente.estado_datos,
    });
  }, [cliente]);

  const cambiarTexto = (
    campo:
      | "nombre"
      | "correo"
      | "telefono"
      | "empresa"
      | "ruc"
      | "rubro_empresa",
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

    cambiarTexto("ruc", soloNumeros);
  };

  const cambiarNumero = (
    campo:
      | "cantidad_empleados"
      | "antiguedad_empresa"
      | "ingreso_mensual"
      | "monto_suscripcion"
      | "accesos_api"
      | "servicios_activos",
    valor: string,
  ) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: Number(valor),
    }));
  };

  const manejarEnvio = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();
    setErrorLocal("");

    const ruc = formulario.ruc?.trim();

    if (ruc && !/^\d{11}$/.test(ruc)) {
      setErrorLocal(
        "El RUC debe contener exactamente 11 números.",
      );
      return;
    }

    if (
      formulario.nombre.trim().length < 3 ||
      formulario.empresa.trim().length < 3 ||
      formulario.rubro_empresa.trim().length < 3
    ) {
      setErrorLocal(
        "Completa correctamente el nombre, la empresa y el rubro.",
      );
      return;
    }

    if (
      formulario.cantidad_empleados < 0 ||
      formulario.antiguedad_empresa < 0 ||
      formulario.ingreso_mensual < 0 ||
      formulario.monto_suscripcion < 0 ||
      formulario.accesos_api < 0 ||
      formulario.servicios_activos < 0
    ) {
      setErrorLocal(
        "Los valores numéricos no pueden ser negativos.",
      );
      return;
    }

    await onGuardar({
      ...formulario,
      ruc: ruc || null,
    });
  };

  return (
    <div className="clientes-modal-fondo">
      <section className="clientes-modal">
        <header className="clientes-modal-header">
          <div>
            <p>
              {cliente
                ? "Editar registro"
                : "Nuevo registro"}
            </p>

            <h2>
              {cliente
                ? "Actualizar cliente"
                : "Registrar cliente"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar formulario"
          >
            <X size={21} />
          </button>
        </header>

        <form
          className="clientes-formulario"
          onSubmit={manejarEnvio}
        >
          <div className="clientes-formulario-grid">
            <label>
              <span>Nombre del cliente</span>

              <input
                type="text"
                value={formulario.nombre}
                onChange={(evento) =>
                  cambiarTexto(
                    "nombre",
                    evento.target.value,
                  )
                }
                minLength={3}
                required
              />
            </label>

            <label>
              <span>Correo electrónico</span>

              <input
                type="email"
                value={formulario.correo}
                onChange={(evento) =>
                  cambiarTexto(
                    "correo",
                    evento.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              <span>Teléfono</span>

              <input
                type="tel"
                value={
                  formulario.telefono ?? ""
                }
                onChange={(evento) =>
                  cambiarTexto(
                    "telefono",
                    evento.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>Empresa</span>

              <input
                type="text"
                value={formulario.empresa}
                onChange={(evento) =>
                  cambiarTexto(
                    "empresa",
                    evento.target.value,
                  )
                }
                minLength={3}
                required
              />
            </label>

            <label>
              <span>RUC</span>

              <input
                type="text"
                inputMode="numeric"
                value={formulario.ruc ?? ""}
                onChange={(evento) =>
                  cambiarRuc(
                    evento.target.value,
                  )
                }
                minLength={11}
                maxLength={11}
                placeholder="11 números"
              />
            </label>

            <label>
              <span>Rubro empresarial</span>

              <input
                type="text"
                value={
                  formulario.rubro_empresa
                }
                onChange={(evento) =>
                  cambiarTexto(
                    "rubro_empresa",
                    evento.target.value,
                  )
                }
                minLength={3}
                required
              />
            </label>

            <label>
              <span>Tamaño de empresa</span>

              <select
                value={
                  formulario.tamano_empresa
                }
                onChange={(evento) =>
                  setFormulario((anterior) => ({
                    ...anterior,
                    tamano_empresa:
                      evento.target
                        .value as TamanoEmpresa,
                  }))
                }
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
              <span>
                Cantidad de empleados
              </span>

              <input
                type="number"
                min="0"
                value={
                  formulario.cantidad_empleados
                }
                onChange={(evento) =>
                  cambiarNumero(
                    "cantidad_empleados",
                    evento.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              <span>
                Antigüedad de la empresa
              </span>

              <input
                type="number"
                min="0"
                value={
                  formulario.antiguedad_empresa
                }
                onChange={(evento) =>
                  cambiarNumero(
                    "antiguedad_empresa",
                    evento.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              <span>Rango de ingresos</span>

              <select
                value={
                  formulario.rango_ingreso ?? ""
                }
                onChange={(evento) =>
                  setFormulario((anterior) => ({
                    ...anterior,
                    rango_ingreso:
                      evento.target.value
                        ? (evento.target
                            .value as RangoIngreso)
                        : null,
                  }))
                }
              >
                <option value="">
                  No declarado
                </option>
                <option value="menos_10000">
                  Menos de S/ 10,000
                </option>
                <option value="10000_30000">
                  S/ 10,000 a S/ 30,000
                </option>
                <option value="30001_100000">
                  S/ 30,001 a S/ 100,000
                </option>
                <option value="100001_500000">
                  S/ 100,001 a S/ 500,000
                </option>
                <option value="mas_500000">
                  Más de S/ 500,000
                </option>
              </select>
            </label>

            <label>
              <span>Ingreso mensual (S/)</span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  formulario.ingreso_mensual
                }
                onChange={(evento) =>
                  cambiarNumero(
                    "ingreso_mensual",
                    evento.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              <span>Tipo de plan</span>

              <select
                value={formulario.tipo_plan}
                onChange={(evento) =>
                  setFormulario((anterior) => ({
                    ...anterior,
                    tipo_plan:
                      evento.target
                        .value as TipoPlan,
                  }))
                }
              >
                <option value="basico">
                  Básico
                </option>
                <option value="profesional">
                  Profesional
                </option>
                <option value="empresarial">
                  Empresarial
                </option>
                <option value="personalizado">
                  Personalizado
                </option>
              </select>
            </label>

            <label>
              <span>
                Monto de suscripción (S/)
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  formulario.monto_suscripcion
                }
                onChange={(evento) =>
                  cambiarNumero(
                    "monto_suscripcion",
                    evento.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              <span>Accesos a la API</span>

              <input
                type="number"
                min="0"
                value={formulario.accesos_api}
                onChange={(evento) =>
                  cambiarNumero(
                    "accesos_api",
                    evento.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              <span>Servicios activos</span>

              <input
                type="number"
                min="0"
                value={
                  formulario.servicios_activos
                }
                onChange={(evento) =>
                  cambiarNumero(
                    "servicios_activos",
                    evento.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              <span>Estado</span>

              <select
                value={formulario.estado}
                onChange={(evento) =>
                  setFormulario((anterior) => ({
                    ...anterior,
                    estado:
                      evento.target.value ===
                      "activo"
                        ? "activo"
                        : "inactivo",
                  }))
                }
              >
                <option value="activo">
                  Activo
                </option>
                <option value="inactivo">
                  Inactivo
                </option>
              </select>
            </label>
          </div>

          <div className="clientes-formulario-opciones">
            <label>
              <input
                type="checkbox"
                checked={
                  formulario.servidor_propio
                }
                onChange={(evento) =>
                  setFormulario((anterior) => ({
                    ...anterior,
                    servidor_propio:
                      evento.target.checked,
                  }))
                }
              />

              <span>Tiene servidor propio</span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={
                  formulario.cancelo_servicio ??
                  false
                }
                onChange={(evento) =>
                  setFormulario((anterior) => ({
                    ...anterior,
                    cancelo_servicio:
                      evento.target.checked,
                  }))
                }
              />

              <span>
                Canceló anteriormente
              </span>
            </label>
          </div>

          {cliente && (
            <div className="clientes-formulario-estado-datos">
              Estado de información:{" "}
              <strong>
                {cliente.estado_datos.replaceAll(
                  "_",
                  " ",
                )}
              </strong>
            </div>
          )}

          {errorLocal && (
            <div className="clientes-mensaje error">
              {errorLocal}
            </div>
          )}

          <footer className="clientes-formulario-acciones">
            <button
              type="button"
              className="clientes-boton-secundario"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="clientes-boton-principal"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <LoaderCircle
                    className="girando"
                    size={18}
                  />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {cliente
                    ? "Guardar cambios"
                    : "Registrar"}
                </>
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}