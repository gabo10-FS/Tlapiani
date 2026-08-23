import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.envio import SincronizarEnviosPayload, SincronizarEnviosResponse
from app.services.sync_service import consolidar_entrega

router = APIRouter(prefix="/envios", tags=["envios"])


@router.post("/sincronizar", response_model=SincronizarEnviosResponse)
async def sincronizar_envios(
    payload: SincronizarEnviosPayload,
    db: AsyncSession = Depends(get_db),
    _actor: Usuario = Depends(require_roles("Administrador", "Transportista")),
) -> SincronizarEnviosResponse:
    alertas = 0
    for entrega in payload.entregas:
        integridad_ok = await consolidar_entrega(db, payload.dispositivo_uuid, entrega)
        if not integridad_ok:
            alertas += 1
    await db.commit()

    return SincronizarEnviosResponse(
        sincronizacion_id=f"SYNC-{uuid.uuid4().hex[:8].upper()}",
        registros_procesados=len(payload.entregas),
        alertas_manipulacion_detectadas=alertas,
        status="Consolidado exitosamente en MariaDB",
    )
