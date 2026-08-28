from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.auth import LoginPayload, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginPayload, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    resultado = await db.execute(select(Usuario).where(Usuario.email == payload.email))
    usuario = resultado.scalar_one_or_none()

    if usuario is None or not usuario.activo or not verify_password(payload.password, usuario.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos")

    access_token = create_access_token(subject=str(usuario.id), rol=usuario.rol)
    return TokenResponse(access_token=access_token, rol=usuario.rol)
