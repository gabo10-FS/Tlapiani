from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_roles
from app.db.session import get_db
from app.models.noticia import Noticia
from app.models.usuario import Usuario
from app.schemas.noticia import NoticiaPayload, NoticiaResponse

router = APIRouter(prefix="/noticias", tags=["noticias"])


@router.get("", response_model=list[NoticiaResponse])
async def listar_noticias(db: AsyncSession = Depends(get_db)) -> list[Noticia]:
    """Público: el sitio de visitantes las muestra sin necesitar sesión.
    Orden por prioridad (asignada a mano por quien publica), no por fecha."""
    resultado = await db.execute(
        select(Noticia).order_by(Noticia.prioridad.desc(), Noticia.fecha.desc())
    )
    return list(resultado.scalars().all())


@router.post("", response_model=NoticiaResponse, status_code=201)
async def crear_noticia(
    payload: NoticiaPayload,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_roles("Administrador")),
) -> Noticia:
    noticia = Noticia(**payload.model_dump())
    db.add(noticia)
    await db.commit()
    await db.refresh(noticia)
    return noticia
