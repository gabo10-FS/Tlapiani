export interface EventoAuditoria {
  id?:         string;
  tipo:        "creacion" | "transito" | "entrega" | "alerta" | "verificacion";
  descripcion: string;
  timestamp:   string;       // ISO 8601
  actor?:      string;
  hashBloque?: string;       // hash del bloque anterior (cadena de custodia)
}

export interface PasaporteDigital {
  id:               string;  // LOT-YYYYMMDD-XXX
  hash:             string;  // SHA-256 del lote (RF-1.2)
  tipoBien:         string;
  cantidad:         number;
  unidad:           string;
  comunidadDestino: string;
  idComunidad:      string;
  estadoActual:     "Creado" | "En Ruta" | "Entregado Exitosamente" | "Alerta de Manipulación";
  nivelUrgencia:    "critica" | "alta" | "media" | "baja" | "segura";
  fechaCreacion:    string;
  operador?:        string;
  timeline:         EventoAuditoria[];
}
