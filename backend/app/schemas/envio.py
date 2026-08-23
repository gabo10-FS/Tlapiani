from datetime import datetime

from pydantic import BaseModel


class EntregaSincronizada(BaseModel):
    lote_id: str
    hash_origen: str
    hash_calculado_recepcion: str
    integridad_validada: bool
    timestamp_entrega: datetime
    receptor_firma_id: str


class SincronizarEnviosPayload(BaseModel):
    dispositivo_uuid: str
    timestamp_sincronizacion: datetime
    entregas: list[EntregaSincronizada]


class SincronizarEnviosResponse(BaseModel):
    sincronizacion_id: str
    registros_procesados: int
    alertas_manipulacion_detectadas: int
    status: str
