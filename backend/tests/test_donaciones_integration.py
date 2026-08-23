"""Integración HTTP real para /api/v1/donaciones/*. Ver tests/conftest.py."""

import pytest

from app.core.security import decode_access_token

pytestmark = pytest.mark.asyncio


def _payload_lote(comunidad_id: int) -> dict:
    return {
        "tipo_bien": "Canasta Básica Alimentos",
        "cantidad_kg": 25.0,
        "comunidad_destino_id": comunidad_id,
        "origen_acopio": "Centro de Acopio Puebla Centro",
    }


def _id_desde_token(token: str) -> int:
    """conftest.py no expone el id de usuario que sembró seed_usuarios (solo
    email/password/nombre_completo) -- el JWT ya lo trae en "sub", así que se
    decodifica en vez de tocar el fixture solo para este caso puntual."""
    payload = decode_access_token(token)
    return int(payload["sub"])


async def test_registrar_lote_sin_token_devuelve_401(client, seed_comunidad):
    resp = await client.post("/api/v1/donaciones/registrar", json=_payload_lote(seed_comunidad))
    assert resp.status_code == 401


async def test_registrar_lote_con_rol_no_autorizado_devuelve_403(
    client, seed_usuarios, seed_comunidad, login_as
):
    # registrar_lote exige rol Administrador -- Transportista debe ser rechazado
    token = await login_as(client, seed_usuarios["Transportista"])
    resp = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


async def test_registrar_lote_como_administrador_devuelve_201(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    resp = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["lote_id"].startswith("TLAP-")
    assert len(body["hash_sha256"]) == 64
    assert body["status"] == "Creado"


async def test_registrar_lote_con_token_invalido_devuelve_401(client, seed_comunidad):
    resp = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": "Bearer esto-no-es-un-token-valido"},
    )
    assert resp.status_code == 401


async def test_registrar_lote_con_comunidad_inexistente_devuelve_404(
    client, seed_usuarios, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    resp = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(999999),  # ninguna comunidad con este id existe
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


async def test_despachar_lote_con_rol_no_autorizado_devuelve_403(
    client, seed_usuarios, seed_comunidad, login_as
):
    # despachar_lote acepta Administrador o Transportista -- Donante no
    token_admin = await login_as(client, seed_usuarios["Administrador"])
    registro = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    lote_id = registro.json()["lote_id"]

    token_donante = await login_as(client, seed_usuarios["Donante"])
    resp = await client.post(
        f"/api/v1/donaciones/{lote_id}/despachar",
        json={"transportista_id": 1},
        headers={"Authorization": f"Bearer {token_donante}"},
    )
    assert resp.status_code == 403


async def test_despachar_lote_camino_feliz_devuelve_200_y_actualiza_estado(
    client, seed_usuarios, seed_comunidad, login_as
):
    token_admin = await login_as(client, seed_usuarios["Administrador"])
    registro = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    lote_id = registro.json()["lote_id"]

    token_transportista = await login_as(client, seed_usuarios["Transportista"])
    transportista_id = _id_desde_token(token_transportista)

    resp = await client.post(
        f"/api/v1/donaciones/{lote_id}/despachar",
        json={"transportista_id": transportista_id, "notas": "Ruta hacia San Juan Cancuc"},
        headers={"Authorization": f"Bearer {token_admin}"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["lote_id"] == lote_id
    assert body["estado_actual"] == "En Ruta"
    assert body["transportista_id"] == transportista_id
    assert body["despachado_en"] is not None

    # el historial público debe reflejar la transición, no solo la respuesta del POST
    historial = await client.get(f"/api/v1/donaciones/historial/{lote_id}")
    assert historial.json()["estado_actual"] == "En Ruta"


async def test_despachar_lote_ya_despachado_devuelve_409(
    client, seed_usuarios, seed_comunidad, login_as
):
    token_admin = await login_as(client, seed_usuarios["Administrador"])
    registro = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    lote_id = registro.json()["lote_id"]

    token_transportista = await login_as(client, seed_usuarios["Transportista"])
    transportista_id = _id_desde_token(token_transportista)
    payload_despacho = {"transportista_id": transportista_id}

    primer_despacho = await client.post(
        f"/api/v1/donaciones/{lote_id}/despachar",
        json=payload_despacho,
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert primer_despacho.status_code == 200  # confirma el estado de partida del 409

    segundo_despacho = await client.post(
        f"/api/v1/donaciones/{lote_id}/despachar",
        json=payload_despacho,
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert segundo_despacho.status_code == 409


async def test_historial_lote_es_publico_sin_token(client, seed_usuarios, seed_comunidad, login_as):
    token_admin = await login_as(client, seed_usuarios["Administrador"])
    registro = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(seed_comunidad),
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    lote_id = registro.json()["lote_id"]

    # Sin header Authorization -- RF-2.4, portal público de transparencia
    resp = await client.get(f"/api/v1/donaciones/historial/{lote_id}")
    assert resp.status_code == 200
    assert resp.json()["lote_id"] == lote_id
