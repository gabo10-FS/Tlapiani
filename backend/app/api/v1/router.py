from fastapi import APIRouter

from app.api.v1 import (
    auth,
    centros_acopio,
    comunidades,
    donaciones,
    envios,
    galeria,
    historias,
    noticias,
    usuarios,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(comunidades.router)
api_router.include_router(donaciones.router)
api_router.include_router(envios.router)
api_router.include_router(centros_acopio.router)
api_router.include_router(galeria.router)
api_router.include_router(noticias.router)
api_router.include_router(historias.router)
