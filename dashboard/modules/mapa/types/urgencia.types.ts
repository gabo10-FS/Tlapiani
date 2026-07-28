// RF-2.2 — Tipos del módulo de Mapa de Prioridad

export type NivelUrgencia = "critica" | "alta" | "media" | "baja" | "segura";

export interface ComunidadUrgencia {
  id: string;
  nombre: string;
  estado: string;           // Estado de México (ej. "Oaxaca")
  municipio: string;
  lat: number;
  lng: number;
  scoreUrgencia: number;    // 0–100 — calculado por RF-1.1
  nivelUrgencia: NivelUrgencia;
  poblacion: number;
  indiceMarginacion: number;
  ultimaActualizacion: string;
  alertaActiva: boolean;    // alerta CENAPRED vigente
}

export interface MapaStats {
  totalComunidades: number;
  criticas: number;
  enAtencion: number;
  suministroSeguro: number;
}
