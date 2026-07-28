// RF-2.3 — Servicio de Despacho

import type { Despacho, DespachoPayload } from "../types/despacho.types";

const MOCK_DESPACHOS: Despacho[] = [
  {
    id: "DSP-001",
    idLote: "LOTE-001",
    idComunidad: "COM-OAX-01",
    nombreComunidad: "San Marcos Tlapazola, Oaxaca",
    operador: "Ruben Guzmán",
    hashLote: "a3f5c8d2e1b4a7f0c9d2e5b8a1f4c7d0e3b6a9f2c5d8e1b4a7f0c3d6e9b2a5f8",
    qrData: { idLote: "LOTE-001", hash: "a3f5c8d2e1b4a7f0c9d2e5b8a1f4c7d0e3b6a9f2c5d8e1b4a7f0c3d6e9b2a5f8", comunidadDestino: "San Marcos Tlapazola, Oaxaca", timestamp: "2026-06-25T14:30:00Z", version: "1.0" },
    estado: "En Camino",
    timestamp: "2026-06-25T14:30:00Z",
  },
  {
    id: "DSP-002",
    idLote: "LOTE-003",
    idComunidad: "COM-CHIS-12",
    nombreComunidad: "Ocosingo, Chiapas",
    operador: "Admin Tlapiani",
    hashLote: "c5h7e0f3d6b9a2c5e8f1b4d7a0c3f6b9d2e5a8c1f4b7d0e3a6f9b2c5d8e1f4a7",
    qrData: { idLote: "LOTE-003", hash: "c5h7e0f3d6b9a2c5e8f1b4d7a0c3f6b9d2e5a8c1f4b7d0e3a6f9b2c5d8e1f4a7", comunidadDestino: "Ocosingo, Chiapas", timestamp: "2026-06-18T09:00:00Z", version: "1.0" },
    estado: "Completado",
    timestamp: "2026-06-18T09:00:00Z",
  },
];

export const despachoService = {
  async getDespachos(): Promise<Despacho[]> {
    return MOCK_DESPACHOS;
  },

  async crearDespacho(payload: DespachoPayload): Promise<Despacho> {
    // TODO: await browserClient.post("/despacho", payload)
    const hash = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const ts = new Date().toISOString();
    const nuevo: Despacho = {
      id: `DSP-${String(MOCK_DESPACHOS.length + 1).padStart(3, "0")}`,
      ...payload,
      hashLote: hash,
      qrData: { idLote: payload.idLote, hash, comunidadDestino: payload.nombreComunidad, timestamp: ts, version: "1.0" },
      estado: "Pendiente",
      timestamp: ts,
    };
    MOCK_DESPACHOS.push(nuevo);
    return nuevo;
  },
};

export const crearDespacho = (payload: DespachoPayload) =>
  despachoService.crearDespacho(payload);
