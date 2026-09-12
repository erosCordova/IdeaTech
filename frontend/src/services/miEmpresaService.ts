import { supabase } from "../lib/supabase";

import type {
  Cliente,
  RangoIngreso,
  TamanoEmpresa,
} from "../types/database";

export interface DatosMiEmpresa {
  empresa: string;
  ruc: string;
  rubro_empresa: string;
  tamano_empresa: TamanoEmpresa;
  cantidad_empleados: number;
  antiguedad_empresa: number;
  rango_ingreso: RangoIngreso;
  servidor_propio: boolean;
}

async function obtenerUsuarioId(): Promise<string> {
  const { data, error } =
    await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error(
      "No se pudo identificar al usuario conectado.",
    );
  }

  return data.user.id;
}

export async function obtenerMiEmpresa(): Promise<Cliente> {
  const usuarioId = await obtenerUsuarioId();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar la empresa: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Tu cuenta todavía no tiene una empresa asociada.",
    );
  }

  return {
    ...data,
    ingreso_mensual: Number(
      data.ingreso_mensual,
    ),
    monto_suscripcion: Number(
      data.monto_suscripcion,
    ),
  } as Cliente;
}

function validarDatos(
  datos: DatosMiEmpresa,
): void {
  if (datos.empresa.trim().length < 3) {
    throw new Error(
      "El nombre de la empresa debe tener al menos 3 caracteres.",
    );
  }

  if (!/^\d{11}$/.test(datos.ruc)) {
    throw new Error(
      "El RUC debe contener exactamente 11 números.",
    );
  }

  if (datos.rubro_empresa.trim().length < 3) {
    throw new Error(
      "El rubro debe tener al menos 3 caracteres.",
    );
  }

  if (
    datos.cantidad_empleados < 1 ||
    datos.cantidad_empleados > 1000000
  ) {
    throw new Error(
      "La cantidad de empleados no es válida.",
    );
  }

  if (
    datos.antiguedad_empresa < 0 ||
    datos.antiguedad_empresa > 200
  ) {
    throw new Error(
      "La antigüedad de la empresa no es válida.",
    );
  }
}

export async function actualizarMiEmpresa(
  datos: DatosMiEmpresa,
): Promise<Cliente> {
  validarDatos(datos);

  const { data, error } = await supabase.rpc(
    "actualizar_mi_empresa",
    {
      empresa_nombre: datos.empresa.trim(),
      ruc_empresa: datos.ruc.trim(),
      rubro: datos.rubro_empresa
        .trim()
        .toLowerCase(),
      tamano: datos.tamano_empresa,
      empleados: datos.cantidad_empleados,
      antiguedad: datos.antiguedad_empresa,
      rango: datos.rango_ingreso,
      tiene_servidor:
        datos.servidor_propio,
    },
  );

  if (error) {
    throw new Error(
      `No se pudieron actualizar los datos: ${error.message}`,
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      "Supabase no devolvió la empresa actualizada.",
    );
  }

  return {
    ...data[0],
    ingreso_mensual: Number(
      data[0].ingreso_mensual,
    ),
    monto_suscripcion: Number(
      data[0].monto_suscripcion,
    ),
  } as Cliente;
}

export function obtenerNombreRangoIngreso(
  rango: RangoIngreso | null,
): string {
  const nombres: Record<RangoIngreso, string> = {
    menos_10000: "Menos de S/ 10,000",
    "10000_30000": "S/ 10,000 a S/ 30,000",
    "30001_100000": "S/ 30,001 a S/ 100,000",
    "100001_500000":
      "S/ 100,001 a S/ 500,000",
    mas_500000: "Más de S/ 500,000",
  };

  return rango
    ? nombres[rango]
    : "No declarado";
}