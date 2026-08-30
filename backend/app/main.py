from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Tlapiani API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# Fotos de galería subidas por Administradores (app/api/v1/galeria.py). En
# producción (deploy bare-metal, ver backend/deploy/), Apache puede servir
# /uploads directamente en vez de pasar por este StaticFiles de desarrollo.
_uploads_dir = Path(settings.UPLOAD_DIR)
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
