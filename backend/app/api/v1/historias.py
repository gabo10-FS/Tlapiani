from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.historia import Historia
from app.models.usuario import Usuario
from app.schemas.historia import HistoriaPayload, HistoriaResponse

router = APIRouter(prefix="/historias", tags=["historias"])


@router.get("", response_model=list[HistoriaResponse])
async def listar_historias(db: AsyncSession = Depends(get_db)) -> list[Historia]:
    """Público: el sitio de visitantes las muestra sin necesitar sesión."""
    resultado = await db.execute(select(Historia).order_by(Historia.created_at.desc()))
    return list(resultado.scalars().all())


@router.post("", response_model=HistoriaResponse, status_code=201)
async def crear_historia(
    payload: HistoriaPayload,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_roles("Administrador")),
) -> Historia:
    historia = Historia(**payload.model_dump())
    db.add(historia)
    await db.commit()
    await db.refresh(historia)
    return historia
