from fastapi import APIRouter

from app.api.v1 import auth, comunidades, donaciones, envios, usuarios

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(comunidades.router)
api_router.include_router(donaciones.router)
api_router.include_router(envios.router)
