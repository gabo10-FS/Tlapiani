from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.usuario import Usuario

# tokenUrl es solo referencial para /docs; el login real es JSON en /api/v1/auth/login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)


async def get_current_usuario(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credenciales_invalidas

    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise credenciales_invalidas

    usuario = await db.get(Usuario, int(payload["sub"]))
    if usuario is None or not usuario.activo:
        raise credenciales_invalidas

    return usuario


def require_roles(*roles_permitidos: str):
    async def verificador(usuario: Usuario = Depends(get_current_usuario)) -> Usuario:
        if usuario.rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{usuario.rol}' no autorizado para esta operación",
            )
        return usuario

    return verificador
