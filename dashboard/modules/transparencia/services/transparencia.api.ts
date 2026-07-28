import type { PasaporteDigital } from "../types/auditoria.types";

// Mock data — en producción, llama a FastAPI /api/v1/pasaportes
const MOCK_PASAPORTES: PasaporteDigital[] = [
  {
    id:               "LOT-20240115-001",
    hash:             "a3f8d2c1b4e7f9a0c2d5e8f1b3a6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0",
    tipoBien:         "Alimentos",
    cantidad:         500,
    unidad:           "kg",
    comunidadDestino: "San Mateo del Mar",
    idComunidad:      "COM-OAX-001",
    estadoActual:     "Entregado Exitosamente",
    nivelUrgencia:    "critica",
    fechaCreacion:    "2024-01-15T08:00:00Z",
    operador:         "Ruben Guzmán",
    timeline: [
      { id:"EVT-001", tipo:"creacion",    descripcion:"Lote registrado en sistema",        timestamp:"2024-01-15T08:00:00Z", actor:"Ruben Guzmán",   hashBloque:"0000000000000001" },
      { id:"EVT-002", tipo:"transito",    descripcion:"Lote en tránsito hacia destino",    timestamp:"2024-01-15T10:30:00Z", actor:"Carlos Mendoza", hashBloque:"a3f8d2c1b4e7f9a0" },
      { id:"EVT-003", tipo:"verificacion",descripcion:"Verificación GPS en ruta",          timestamp:"2024-01-15T13:15:00Z", actor:"Sistema",        hashBloque:"c2d5e8f1b3a6c9d2" },
      { id:"EVT-004", tipo:"entrega",     descripcion:"Entrega confirmada con QR scan",    timestamp:"2024-01-15T16:45:00Z", actor:"Carlos Mendoza", hashBloque:"e5f8a1b4c7d0e3f6" },
    ],
  },
  {
    id:               "LOT-20240116-002",
    hash:             "b5c9e3f7a1d4b8c2e6a0d4f8b2c6e0a4d8f2b6c0e4a8d2f6b0c4e8a2d6f0b4c8",
    tipoBien:         "Medicamentos",
    cantidad:         200,
    unidad:           "unidades",
    comunidadDestino: "Guerrero Negro",
    idComunidad:      "COM-GRO-001",
    estadoActual:     "En Ruta",
    nivelUrgencia:    "alta",
    fechaCreacion:    "2024-01-16T09:00:00Z",
    operador:         "Admin Tlapiani",
    timeline: [
      { id:"EVT-005", tipo:"creacion", descripcion:"Lote registrado en sistema",     timestamp:"2024-01-16T09:00:00Z", actor:"Admin Tlapiani", hashBloque:"0000000000000002" },
      { id:"EVT-006", tipo:"transito", descripcion:"Lote en tránsito hacia destino", timestamp:"2024-01-16T11:00:00Z", actor:"Carlos Mendoza", hashBloque:"b5c9e3f7a1d4b8c2" },
    ],
  },
  {
    id:               "LOT-20240117-003",
    hash:             "c7a2d5f8b3e6a1d4c7a0e3f6b9c2e5a8d1f4b7c0e3a6d9f2b5c8e1a4d7f0b3c6",
    tipoBien:         "Agua",
    cantidad:         10000,
    unidad:           "L",
    comunidadDestino: "La Montaña",
    idComunidad:      "COM-CHI-001",
    estadoActual:     "Creado",
    nivelUrgencia:    "media",
    fechaCreacion:    "2024-01-17T07:30:00Z",
    timeline: [
      { id:"EVT-007", tipo:"creacion", descripcion:"Lote registrado en sistema", timestamp:"2024-01-17T07:30:00Z", actor:"Admin Tlapiani", hashBloque:"0000000000000003" },
    ],
  },
];

export const transparenciaService = {
  buscarPasaporte: (id: string) => getPasaporteById(id),
};

export async function getPasaporteById(id: string): Promise<PasaporteDigital | null> {
  await new Promise((r) => setTimeout(r, 600)); // sim latencia
  return MOCK_PASAPORTES.find((p) => p.id === id || p.hash === id) ?? null;
}

export async function getRecentePasaportes(limit = 10): Promise<PasaporteDigital[]> {
  await new Promise((r) => setTimeout(r, 400));
  return MOCK_PASAPORTES.slice(0, limit);
}
