"""Integración HTTP real para /api/v1/comunidades/{id}/galeria. Ver tests/conftest.py."""

import base64

import pytest

from app.core.config import Settings

pytestmark = pytest.mark.asyncio

# PNG 1x1 válido más pequeño posible -- suficiente para pasar la validación
# de content-type sin necesitar una librería de imágenes en los tests.
_PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
    "+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


@pytest.fixture(autouse=True)
def _uploads_en_tmp(tmp_path, monkeypatch):
    """Evita que estos tests escriban archivos reales en backend/uploads/."""
    monkeypatch.setattr(
        "app.api.v1.galeria.get_settings",
        lambda: Settings(UPLOAD_DIR=str(tmp_path / "uploads")),
    )


async def test_listar_sin_token_devuelve_200_vacio(client, seed_comunidad):
    resp = await client.get(f"/api/v1/comunidades/{seed_comunidad}/galeria")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_subir_sin_rol_admin_devuelve_403(client, seed_usuarios, seed_comunidad, login_as):
    token = await login_as(client, seed_usuarios["Donante"])
    resp = await client.post(
        f"/api/v1/comunidades/{seed_comunidad}/galeria",
        data={"caption": "Entrega de despensas"},
        files={"file": ("foto.png", _PNG_1X1, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


async def test_subir_comunidad_inexistente_devuelve_404(client, seed_usuarios, login_as):
    token = await login_as(client, seed_usuarios["Administrador"])
    resp = await client.post(
        "/api/v1/comunidades/999999/galeria",
        data={"caption": "Entrega de despensas"},
        files={"file": ("foto.png", _PNG_1X1, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


async def test_subir_tipo_no_soportado_devuelve_415(client, seed_usuarios, seed_comunidad, login_as):
    token = await login_as(client, seed_usuarios["Administrador"])
    resp = await client.post(
        f"/api/v1/comunidades/{seed_comunidad}/galeria",
        data={"caption": "Entrega de despensas"},
        files={"file": ("archivo.txt", b"no es una imagen", "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 415


async def test_subir_como_administrador_y_listar_publico(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    subida = await client.post(
        f"/api/v1/comunidades/{seed_comunidad}/galeria",
        data={"caption": "Entrega de despensas en el centro comunitario"},
        files={"file": ("foto.png", _PNG_1X1, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert subida.status_code == 201
    body = subida.json()
    assert body["comunidad_id"] == seed_comunidad
    assert body["url"].startswith("/uploads/galeria/")
    assert body["url"].endswith(".png")

    listado = await client.get(f"/api/v1/comunidades/{seed_comunidad}/galeria")
    assert listado.status_code == 200
    assert len(listado.json()) == 1
    assert listado.json()[0]["caption"] == "Entrega de despensas en el centro comunitario"
