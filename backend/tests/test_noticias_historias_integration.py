"""Integración HTTP real para /api/v1/noticias y /api/v1/historias. Ver tests/conftest.py."""

import pytest

pytestmark = pytest.mark.asyncio


async def test_listar_noticias_sin_token_devuelve_200_vacio(client):
    resp = await client.get("/api/v1/noticias")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_crear_noticia_sin_rol_admin_devuelve_403(client, seed_usuarios, login_as):
    token = await login_as(client, seed_usuarios["Transportista"])
    resp = await client.post(
        "/api/v1/noticias",
        json={
            "titulo": "Alerta por sismo", "resumen": "Resumen de la alerta.",
            "zona": "Oaxaca", "fecha": "2026-08-30", "nivel": "crítica",
            "tipo": "Alerta", "prioridad": 95,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


async def test_crear_noticia_como_administrador_y_orden_por_prioridad(
    client, seed_usuarios, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    headers = {"Authorization": f"Bearer {token}"}

    baja = await client.post(
        "/api/v1/noticias",
        json={
            "titulo": "Actualización de ruta", "resumen": "Resumen.",
            "zona": "Chiapas", "fecha": "2026-08-20", "nivel": "informativa",
            "tipo": "Actualización", "prioridad": 20,
        },
        headers=headers,
    )
    alta = await client.post(
        "/api/v1/noticias",
        json={
            "titulo": "Alerta por sismo", "resumen": "Resumen.",
            "zona": "Oaxaca", "fecha": "2026-08-30", "nivel": "crítica",
            "tipo": "Alerta", "prioridad": 95,
        },
        headers=headers,
    )
    assert baja.status_code == 201
    assert alta.status_code == 201

    listado = await client.get("/api/v1/noticias")
    assert listado.status_code == 200
    titulos = [n["titulo"] for n in listado.json()]
    assert titulos == ["Alerta por sismo", "Actualización de ruta"]  # prioridad desc


async def test_listar_historias_sin_token_devuelve_200_vacio(client):
    resp = await client.get("/api/v1/historias")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_crear_historia_sin_rol_admin_devuelve_403(client, seed_usuarios, login_as):
    token = await login_as(client, seed_usuarios["Donante"])
    resp = await client.post(
        "/api/v1/historias",
        json={
            "titulo": "La ayuda llegó a tiempo", "comunidad": "San Juan Cancuc",
            "resumen": "Resumen.", "cita": "Gracias a todos.",
            "autor": "Comité comunitario", "impacto": "300 familias",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


async def test_crear_historia_como_administrador_y_listar_publico(
    client, seed_usuarios, login_as
):
    token = await login_as(client, seed_usuarios["Administrador"])
    creada = await client.post(
        "/api/v1/historias",
        json={
            "titulo": "La ayuda llegó a tiempo", "comunidad": "San Juan Cancuc",
            "resumen": "Resumen.", "cita": "Gracias a todos.",
            "autor": "Comité comunitario", "impacto": "300 familias",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert creada.status_code == 201

    listado = await client.get("/api/v1/historias")
    assert listado.status_code == 200
    assert len(listado.json()) == 1
    assert listado.json()[0]["titulo"] == "La ayuda llegó a tiempo"
