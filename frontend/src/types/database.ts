export type RolUsuario =
  | "administrador"
  | "analista"
  | "operador"
  | "cliente";

export type EstadoSolicitudRegistro =
  | "pendiente"
  | "aprobado"
  | "rechazado";

export type EstadoCliente =
  | "activo"
  | "inactivo";

export type EstadoDatosEmpresa =
  | "incompletos"
  | "pendiente_verificacion"
  | "verificado";

export type RangoIngreso =
  | "menos_10000"
  | "10000_30000"
  | "30001_100000"
  | "100001_500000"
  | "mas_500000";

export type TamanoEmpresa =
  | "pequena"
  | "mediana"
  | "grande";

export type TipoPlan =
  | "basico"
  | "profesional"
  | "empresarial"
  | "personalizado";

export type Sentimiento =
  | "positivo"
  | "neutral"
  | "negativo";

export type PrioridadTicket =
  | "baja"
  | "media"
  | "alta"
  | "critica";

export type EstadoTicket =
  | "pendiente"
  | "en_proceso"
  | "resuelta"
  | "cancelada";

export type PrioridadSolicitud =
  PrioridadTicket;

export type EstadoSolicitud =
  EstadoTicket;

export type NivelRiesgo =
  | "bajo"
  | "medio"
  | "alto";

export interface Perfil {
  id: string;
  correo: string | null;
  nombre_completo: string;
  dni: string | null;
  telefono: string | null;
  empresa: string | null;
  ruc: string | null;
  cargo: string | null;
  motivo_solicitud: string | null;
  rol: RolUsuario;
  activo: boolean;
  estado_solicitud:
    EstadoSolicitudRegistro;
  motivo_rechazo: string | null;
  fecha_revision: string | null;
  revisado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface Cliente {
  id: number;
  usuario_id: string;
  operador_asignado_id: string | null;
  nombre: string;
  correo: string;
  telefono: string | null;
  empresa: string;
  ruc: string | null;
  rubro_empresa: string;
  tamano_empresa: TamanoEmpresa;
  cantidad_empleados: number;
  antiguedad_empresa: number;
  tipo_plan: TipoPlan;
  ingreso_mensual: number;
  rango_ingreso: RangoIngreso | null;
  monto_suscripcion: number;
  servidor_propio: boolean;
  accesos_api: number;
  servicios_activos: number;
  cancelo_servicio: boolean | null;
  estado: EstadoCliente;
  estado_datos: EstadoDatosEmpresa;
  observaciones_verificacion:
    string | null;
  fecha_verificacion: string | null;
  verificado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface NuevoCliente {
  nombre: string;
  correo: string;
  telefono?: string | null;
  empresa: string;
  ruc?: string | null;
  rubro_empresa: string;
  tamano_empresa: TamanoEmpresa;
  cantidad_empleados: number;
  antiguedad_empresa: number;
  tipo_plan: TipoPlan;
  ingreso_mensual: number;
  rango_ingreso?: RangoIngreso | null;
  monto_suscripcion: number;
  servidor_propio: boolean;
  accesos_api: number;
  servicios_activos: number;
  cancelo_servicio?: boolean | null;
  estado?: EstadoCliente;
  estado_datos?: EstadoDatosEmpresa;
}

export interface Comentario {
  id: number;
  cliente_id: number;
  usuario_id: string;
  contenido: string;
  canal: string;
  categoria: string | null;
  sentimiento: Sentimiento | null;
  polaridad: number | null;
  procesado: boolean;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface Ticket {
  id: number;
  cliente_id: number;
  usuario_id: string;
  operador_asignado_id: string | null;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  respuesta: string | null;
  fecha_inicio: string;
  fecha_asignacion: string | null;
  fecha_respuesta: string | null;
  fecha_cierre: string | null;
  fecha_actualizacion: string;
}

export interface NuevoTicket {
  cliente_id: number;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadTicket;
}

export type Solicitud = Ticket;

export interface Prediccion {
  id: number;
  cliente_id: number;
  usuario_id: string;
  modelo: string;
  clase_predicha: boolean;
  probabilidad_cancelacion: number;
  nivel_riesgo: NivelRiesgo;
  version_modelo: string | null;
  fecha_prediccion: string;
}

export interface Documento {
  id: number;
  cliente_id: number | null;
  usuario_id: string;
  nombre_archivo: string;
  ruta_storage: string;
  tipo_archivo: string | null;
  tamano_bytes: number | null;
  fecha_registro: string;
}

export interface Notificacion {
  id: number;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  tipo:
    | "informacion"
    | "advertencia"
    | "riesgo"
    | "exito"
    | "error";
  leida: boolean;
  fecha_registro: string;
}

export interface Auditoria {
  id: number;
  usuario_id: string | null;
  tabla_afectada: string;
  registro_id: string | null;
  accion:
    | "INSERT"
    | "UPDATE"
    | "DELETE";
  datos_anteriores:
    | Record<string, unknown>
    | null;
  datos_nuevos:
    | Record<string, unknown>
    | null;
  fecha_accion: string;
}
