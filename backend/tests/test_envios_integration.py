"""Integración HTTP real para /api/v1/envios/sincronizar. Ver tests/conftest.py.

Cubre la defensa en profundidad de sync_service de punta a punta: el sello que
el cliente manda en el payload se compara contra el que el servidor recalcula a
partir del lote realmente guardado (incluido su created_at), no sólo contra sí
mismo.
"""

import pytest

pytestmark = pytest.mark.asyncio


def _payload_lote(comunidad_id: int) -> dict:
    return {
        "tipo_bien": "Canasta Básica Alimentos",
        "cantidad_kg": 25.0,
        "comunidad_destino_id": comunidad_id,
        "origen_acopio": "Centro de Acopio Puebla Centro",
    }


async def _registrar_lote(client, token: str, comunidad_id: int) -> dict:
    resp = await client.post(
        "/api/v1/donaciones/registrar",
        json=_payload_lote(comunidad_id),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _payload_sync(lote_id: str, hash_origen: str, hash_recepcion: str) -> dict:
    return {
        "dispositivo_uuid": "99f4c331-8822-4cba-a111-d002f1a92a88",
        "timestamp_sincronizacion": "2026-06-29T09:45:12Z",
        "entregas": [
            {
                "lote_id": lote_id,
                "hash_origen": hash_origen,
                "hash_calculado_recepcion": hash_recepcion,
                "integridad_validada": True,
                "timestamp_entrega": "2026-06-29T06:30:00Z",
                "receptor_firma_id": "CURP_RECEPTOR_VALIDADO",
            }
        ],
    }


async def test_sincronizar_con_sello_real_del_lote_no_marca_alerta(
    client, seed_usuarios, seed_comunidad, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    lote = await _registrar_lote(client, token, seed_comunidad)
    sello_real = lote["hash_sha256"]

    resp = await client.post(
        "/api/v1/envios/sincronizar",
        json=_payload_sync(lote["lote_id"], sello_real, sello_real),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["registros_procesados"] == 1
    assert body["alertas_manipulacion_detectadas"] == 0

    historial = await client.get(f"/api/v1/donaciones/historial/{lote['lote_id']}")
    assert historial.json()["estado_actual"] == "Entregado Exitosamente"


async def test_sincronizar_con_par_de_hashes_iguales_pero_falso_marca_alerta(
    client, seed_usuarios, seed_comunidad, login_as
):
    """hash_origen == hash_calculado_recepcion pero el valor no es el sello real
    del lote -> el servidor lo recalcula y lo detecta como manipulación."""
    token = await login_as(client, seed_usuarios["Administrador"])
    lote = await _registrar_lote(client, token, seed_comunidad)
    hash_falso = "f" * 64

    resp = await client.post(
        "/api/v1/envios/sincronizar",
        json=_payload_sync(lote["lote_id"], hash_falso, hash_falso),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["registros_procesados"] == 1
    assert body["alertas_manipulacion_detectadas"] == 1

    historial = await client.get(f"/api/v1/donaciones/historial/{lote['lote_id']}")
    assert historial.json()["estado_actual"] == "Alerta de Manipulación"
