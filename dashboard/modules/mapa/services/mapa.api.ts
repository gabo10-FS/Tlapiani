// RF-2.2 — Servicio de datos geográficos de urgencia

import type { ComunidadUrgencia, MapaStats } from "../types/urgencia.types";

const MOCK_COMUNIDADES: ComunidadUrgencia[] = [
  { id: "COM-OAX-01", nombre: "San Marcos Tlapazola", estado: "Oaxaca", municipio: "Tlacolula",
    lat: 16.8937, lng: -96.3791, scoreUrgencia: 92, nivelUrgencia: "critica",
    poblacion: 2300, indiceMarginacion: 0.87, ultimaActualizacion: "2026-06-28T06:00:00Z", alertaActiva: true },
  { id: "COM-GRO-07", nombre: "Tlapa de Comonfort", estado: "Guerrero", municipio: "Tlapa",
    lat: 17.5431, lng: -98.5782, scoreUrgencia: 85, nivelUrgencia: "critica",
    poblacion: 45000, indiceMarginacion: 0.82, ultimaActualizacion: "2026-06-28T06:00:00Z", alertaActiva: false },
  { id: "COM-CHIS-12", nombre: "Ocosingo", estado: "Chiapas", municipio: "Ocosingo",
    lat: 16.9033, lng: -92.0975, scoreUrgencia: 78, nivelUrgencia: "alta",
    poblacion: 32000, indiceMarginacion: 0.79, ultimaActualizacion: "2026-06-27T18:00:00Z", alertaActiva: false },
  { id: "COM-VER-03", nombre: "Tehuipango", estado: "Veracruz", municipio: "Tehuipango",
    lat: 18.6524, lng: -97.0558, scoreUrgencia: 70, nivelUrgencia: "alta",
    poblacion: 18000, indiceMarginacion: 0.75, ultimaActualizacion: "2026-06-27T18:00:00Z", alertaActiva: true },
  { id: "COM-HGO-09", nombre: "Cardonal", estado: "Hidalgo", municipio: "Cardonal",
    lat: 20.6198, lng: -99.1279, scoreUrgencia: 55, nivelUrgencia: "media",
    poblacion: 12000, indiceMarginacion: 0.62, ultimaActualizacion: "2026-06-27T12:00:00Z", alertaActiva: false },
  { id: "COM-PUE-05", nombre: "Zoquitlán", estado: "Puebla", municipio: "Zoquitlán",
    lat: 18.2833, lng: -97.2000, scoreUrgencia: 41, nivelUrgencia: "baja",
    poblacion: 9500, indiceMarginacion: 0.50, ultimaActualizacion: "2026-06-26T10:00:00Z", alertaActiva: false },
  { id: "COM-SON-02", nombre: "Álamos", estado: "Sonora", municipio: "Álamos",
    lat: 27.0186, lng: -108.9364, scoreUrgencia: 18, nivelUrgencia: "segura",
    poblacion: 25000, indiceMarginacion: 0.22, ultimaActualizacion: "2026-06-25T08:00:00Z", alertaActiva: false },
];

export const mapaService = {
  async getComunidades(): Promise<ComunidadUrgencia[]> {
    // TODO: await browserClient.get("/mapa/comunidades")
    return MOCK_COMUNIDADES;
  },

  async getStats(): Promise<MapaStats> {
    return {
      totalComunidades: MOCK_COMUNIDADES.length,
      criticas: MOCK_COMUNIDADES.filter((c) => c.nivelUrgencia === "critica").length,
      enAtencion: MOCK_COMUNIDADES.filter((c) => ["alta", "media"].includes(c.nivelUrgencia)).length,
      suministroSeguro: MOCK_COMUNIDADES.filter((c) => ["baja", "segura"].includes(c.nivelUrgencia)).length,
    };
  },
};
