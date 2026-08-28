from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models.usuario import ROLES_VALIDOS


class UsuarioRegistroPayload(BaseModel):
    nombre_completo: str
    email: EmailStr
    password: str
    rol: str

    @field_validator("rol")
    @classmethod
    def rol_valido(cls, v: str) -> str:
        if v not in ROLES_VALIDOS:
            raise ValueError(f"rol debe ser uno de: {', '.join(ROLES_VALIDOS)}")
        return v

    @field_validator("password")
    @classmethod
    def password_minima(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password debe tener al menos 8 caracteres")
        return v


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_completo: str
    email: EmailStr
    rol: str
    activo: bool
    created_at: datetime
