from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_TOLERANCIA_SUMA_PESOS = 1e-6


class Settings(BaseSettings):
    """Variables de entorno del backend. Ver backend/.env.example."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Base de datos — driver async (aiomysql) para cumplir RNF-2.2 (concurrencia).
    # Alembic deriva su propia URL síncrona (pymysql) a partir de esta en migrations/env.py.
    DATABASE_URL: str = "mysql+aiomysql://tlapiani_user:password_seguro@localhost:3306/tlapiani_db"

    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Pesos del Score de Urgencia — RF-1.1. Deben sumar 1.0 (validado abajo).
    PRIORIDAD_ALPHA: float = 0.4  # Índice de Marginación (CONAPO)
    PRIORIDAD_BETA: float = 0.4  # Índice de Pobreza (CONEVAL)
    PRIORIDAD_GAMMA: float = 0.2  # Coeficiente de Emergencia (CENAPRED)

    # Orígenes permitidos para el dashboard (CORS). Coma-separado en .env.
    CORS_ORIGINS: str = "http://localhost:3000"

    # Fotos de galería (app/api/v1/galeria.py) se guardan en disco bajo esta
    # carpeta (relativa al cwd del proceso, normalmente backend/) y se sirven
    # como estáticos en /uploads (ver app/main.py). En el deploy bare-metal
    # de producción, Apache puede servir esta ruta directamente en vez de
    # pasar por FastAPI — ver backend/deploy/tlapiani.conf.
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 5

    @model_validator(mode="after")
    def _validar_pesos_score_urgencia(self) -> "Settings":
        suma = self.PRIORIDAD_ALPHA + self.PRIORIDAD_BETA + self.PRIORIDAD_GAMMA
        if abs(suma - 1.0) > _TOLERANCIA_SUMA_PESOS:
            raise ValueError(
                "PRIORIDAD_ALPHA + PRIORIDAD_BETA + PRIORIDAD_GAMMA debe sumar 1.0 "
                f"(actual: {suma}). Revisa el .env."
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
