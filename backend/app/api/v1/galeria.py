import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models.comunidad import Comunidad
from app.models.foto_comunidad import FotoComunidad
from app.models.usuario import Usuario
from app.schemas.galeria import FotoComunidadResponse

router = APIRouter(prefix="/comunidades", tags=["galeria"])

_EXTENSIONES_PERMITIDAS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@router.get("/{comunidad_id}/galeria", response_model=list[FotoComunidadResponse])
async def listar_galeria(comunidad_id: int, db: AsyncSession = Depends(get_db)) -> list[FotoComunidad]:
    """Público a propósito (igual que /donaciones/historial/{lote_id}): el
    sitio de visitantes muestra estas fotos en la ficha de cada comunidad."""
    resultado = await db.execute(
        select(FotoComunidad)
        .where(FotoComunidad.comunidad_id == comunidad_id)
        .order_by(FotoComunidad.created_at.desc())
    )
    return list(resultado.scalars().all())


@router.post("/{comunidad_id}/galeria", response_model=FotoComunidadResponse, status_code=201)
async def subir_foto(
    comunidad_id: int,
    caption: str = Form(..., min_length=1, max_length=255),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: Usuario = Depends(require_roles("Administrador")),
) -> FotoComunidad:
    comunidad = await db.get(Comunidad, comunidad_id)
    if comunidad is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comunidad no encontrada")

    extension = _EXTENSIONES_PERMITIDAS.get(file.content_type)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de archivo no soportado: {file.content_type!r}. Usa JPG, PNG, WEBP o GIF.",
        )

    settings = get_settings()
    contenido = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(contenido) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo excede el máximo de {settings.MAX_UPLOAD_MB} MB.",
        )

    galeria_dir = Path(settings.UPLOAD_DIR) / "galeria"
    galeria_dir.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    (galeria_dir / nombre_archivo).write_bytes(contenido)

    foto = FotoComunidad(
        comunidad_id=comunidad_id,
        url=f"/uploads/galeria/{nombre_archivo}",
        caption=caption,
        subido_por_id=admin.id,
    )
    db.add(foto)
    await db.commit()
    await db.refresh(foto)
    return foto
