// RF-2.1 — Tipos del módulo de Inventario

export type EstadoLote =
  | "Creado"
  | "En Ruta"
  | "Entregado Exitosamente"
  | "Alerta de Manipulación";

export type TipoBien =
  | "Alimentos"
  | "Medicamentos"
  | "Ropa"
  | "Agua"
  | "Herramientas"
  | "Otro";

export type RolUsuario = "Administrador" | "Donante" | "Transportista";

export interface Lote {
  id: string;
  tipoBien: TipoBien;
  cantidad: number;
  unidad: string;
  idComunidadDestino: string;
  nombreComunidad: string;
  estado: EstadoLote;
  hash: string;           // SHA-256 generado por el backend — RF-1.2
  timestamp: string;      // ISO 8601
  idTransportista?: string;
  nombreTransportista?: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string;
}

export interface RegistroLotePayload {
  tipoBien: TipoBien;
  cantidad: number;
  unidad: string;
  idComunidadDestino: string;
  nombreComunidad: string;
}

export interface FiltrosInventario {
  estado?: EstadoLote | "Todos";
  tipoBien?: TipoBien | "Todos";
  busqueda?: string;
}
