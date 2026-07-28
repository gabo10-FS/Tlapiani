// RF-2.1 — Servicio de Inventario
// En producción reemplazar los mocks con llamadas reales a browserClient

import { browserClient } from "@/lib/api/client";
import type { Lote, RegistroLotePayload, FiltrosInventario } from "../types/lote.types";

// --- Mock data -----------------------------------------------------------
const MOCK_LOTES: Lote[] = [
  {
    id: "LOTE-001",
    tipoBien: "Alimentos",
    cantidad: 500,
    unidad: "kg",
    idComunidadDestino: "COM-OAX-01",
    nombreComunidad: "San Marcos Tlapazola, Oaxaca",
    estado: "En Ruta",
    hash: "a3f5c8d2e1b4a7f0c9d2e5b8a1f4c7d0e3b6a9f2c5d8e1b4a7f0c3d6e9b2a5f8",
    timestamp: "2026-06-25T14:30:00Z",
    idTransportista: "USR-003",
    nombreTransportista: "Carlos Mendoza",
  },
  {
    id: "LOTE-002",
    tipoBien: "Medicamentos",
    cantidad: 120,
    unidad: "cajas",
    idComunidadDestino: "COM-GRO-07",
    nombreComunidad: "Tlapa de Comonfort, Guerrero",
    estado: "Creado",
    hash: "b4g6d9e2c5a8f1b4d7e0c3a6f9b2d5e8a1c4f7b0d3e6a9f2c5b8d1e4a7f0c3d6",
    timestamp: "2026-06-26T09:15:00Z",
  },
  {
    id: "LOTE-003",
    tipoBien: "Agua",
    cantidad: 2000,
    unidad: "litros",
    idComunidadDestino: "COM-CHIS-12",
    nombreComunidad: "Ocosingo, Chiapas",
    estado: "Entregado Exitosamente",
    hash: "c5h7e0f3d6b9a2c5e8f1b4d7a0c3f6b9d2e5a8c1f4b7d0e3a6f9b2c5d8e1f4a7",
    timestamp: "2026-06-20T11:00:00Z",
    idTransportista: "USR-004",
    nombreTransportista: "Sofía Ramírez",
  },
  {
    id: "LOTE-004",
    tipoBien: "Ropa",
    cantidad: 300,
    unidad: "prendas",
    idComunidadDestino: "COM-VER-03",
    nombreComunidad: "Tehuipango, Veracruz",
    estado: "Alerta de Manipulación",
    hash: "d6i8f1g4e7c0b3d6f9g2a5d8f1b4e7c0a3d6g9b2e5a8d1g4b7e0c3f6g9b2e5a8",
    timestamp: "2026-06-22T16:45:00Z",
    idTransportista: "USR-005",
    nombreTransportista: "Miguel Torres",
  },
  {
    id: "LOTE-005",
    tipoBien: "Alimentos",
    cantidad: 800,
    unidad: "kg",
    idComunidadDestino: "COM-HGO-09",
    nombreComunidad: "Cardonal, Hidalgo",
    estado: "En Ruta",
    hash: "e7j9g2h5f8d1c4e7g0h3b6e9g2c5a8e1h4c7g0b3f6h9c2f5a8e1h4b7e0d3g6h9",
    timestamp: "2026-06-27T08:00:00Z",
    idTransportista: "USR-003",
    nombreTransportista: "Carlos Mendoza",
  },
];

// -------------------------------------------------------------------------

export const inventarioService = {
  async getLotes(filtros?: FiltrosInventario): Promise<Lote[]> {
    // TODO: reemplazar con → await browserClient.get("/inventario/lotes", { params: filtros })
    let resultado = [...MOCK_LOTES];
    if (filtros?.estado && filtros.estado !== "Todos") {
      resultado = resultado.filter((l) => l.estado === filtros.estado);
    }
    if (filtros?.tipoBien && filtros.tipoBien !== "Todos") {
      resultado = resultado.filter((l) => l.tipoBien === filtros.tipoBien);
    }
    if (filtros?.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.nombreComunidad.toLowerCase().includes(q) ||
          l.hash.toLowerCase().includes(q)
      );
    }
    return resultado;
  },

  async getLoteById(id: string): Promise<Lote | null> {
    // TODO: await browserClient.get(`/inventario/lotes/${id}`)
    return MOCK_LOTES.find((l) => l.id === id) ?? null;
  },

  async registrarLote(payload: RegistroLotePayload): Promise<Lote> {
    // TODO: await browserClient.post("/inventario/lotes", payload)
    const nuevo: Lote = {
      id: `LOTE-${String(MOCK_LOTES.length + 1).padStart(3, "0")}`,
      ...payload,
      estado: "Creado",
      hash: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
    };
    MOCK_LOTES.push(nuevo);
    return nuevo;
  },
};

export const registrarLote = (payload: RegistroLotePayload) =>
  inventarioService.registrarLote(payload);
