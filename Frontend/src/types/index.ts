export type RolUsuario = 'visitante' | 'Ciudadano' | 'Moderador' | 'Coordinador' | 'Enlace_Municipal' | 'Administrador';

export type TipoDano = 'bache' | 'hundimiento' | 'grieta' | 'alcantarilla_sin_tapa';
export type TamanoBache = 'chico' | 'mediano' | 'grande';
export type SeveridadBache = 'Baja' | 'Media' | 'Alta';
export type EstadoBache = 'Recibido' | 'Validado' | 'Programado' | 'En reparación' | 'Reparado' | 'Rechazado';

export type NivelAgua = 'a un lado de la calle' | 'cubre un carril' | 'a media llanta' | 'intransitable';
export type EstadoEncharcamiento = 'Activo' | 'Histórico' | 'Rechazado';

export interface Colonia {
  id_colonia: number;
  nombre: string;
  sector: string;
  activa: boolean;
}

export type EstadoReporte =
  | 'Recibido'
  | 'Validado'
  | 'Programado'
  | 'En reparación'
  | 'Reparado'
  | 'Rechazado'
  | 'Activo'
  | 'Histórico';

export interface ReporteItem {
  id: number;
  kind: 'pavimento' | 'encharcamiento';
  folio: string;
  colonia_id: number;
  colonia_nombre: string;
  calle: string;
  latitud: number;
  longitud: number;
  estado: EstadoReporte;
  tipo_dano?: string;
  severidad?: string;
  nivel_agua?: string;
  riesgo_alto?: boolean;
  fecha_creacion: string;
  confirmaciones: number;
}