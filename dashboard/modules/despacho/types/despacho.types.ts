// RF-2.3 — Tipos del módulo de Despacho y QR

export interface Despacho {
  id: string;
  idLote: string;
  idComunidad: string;
  nombreComunidad: string;
  operador: string;
  hashLote: string;
  qrData: QRData;
  estado: "Pendiente" | "En Camino" | "Completado" | "Cancelado";
  notas?: string;
  timestamp: string;
}

export interface DespachoPayload {
  idLote: string;
  idComunidad: string;
  nombreComunidad: string;
  operador: string;
  notas?: string;
}

export interface QRData {
  idLote: string;
  hash: string;
  comunidadDestino: string;
  timestamp: string;
  version: "1.0";
}
