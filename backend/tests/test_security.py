"""app/core/security.py — hashing de contraseñas (bcrypt) y JWT.

Cobertura previa: 0%. hash_password() estaba roto en la práctica hasta este
mismo cambio (passlib==1.7.4 incompatible con bcrypt>=4.1 instalado) — ver
security.py, que ahora usa bcrypt directo en vez de pasar por passlib.
"""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    settings,
    verify_password,
)


def test_hash_password_no_devuelve_el_password_en_claro():
    hashed = hash_password("mi_password_segura")
    assert hashed != "mi_password_segura"
    assert hashed.startswith("$2b$")  # formato bcrypt


def test_hash_password_es_distinto_cada_vez_mismo_password():
    """bcrypt genera un salt aleatorio por llamada -- dos hashes del mismo
    password no deben coincidir byte a byte (si coincidieran, el salt no
    estaría siendo aleatorio, lo cual sería una regresión de seguridad)."""
    assert hash_password("mismo-password") != hash_password("mismo-password")


def test_verify_password_correcta():
    hashed = hash_password("mi_password_segura")
    assert verify_password("mi_password_segura", hashed) is True


def test_verify_password_incorrecta():
    hashed = hash_password("mi_password_segura")
    assert verify_password("password_equivocada", hashed) is False


def test_create_and_decode_access_token_roundtrip():
    token = create_access_token(subject="42", rol="Administrador")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["rol"] == "Administrador"
    assert "exp" in payload


def test_decode_access_token_string_invalida_devuelve_none():
    assert decode_access_token("esto-no-es-un-jwt-valido") is None


def test_decode_access_token_firmado_con_secreto_distinto_devuelve_none():
    """Un token firmado con otra clave no debe pasar la verificación de firma
    -- si esto fallara, cualquiera podría forjar tokens con su propio secreto."""
    token_ajeno = jwt.encode(
        {
            "sub": "1",
            "rol": "Administrador",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        "un-secreto-completamente-distinto",
        algorithm=settings.JWT_ALGORITHM,
    )
    assert decode_access_token(token_ajeno) is None


def test_decode_access_token_expirado_devuelve_none():
    token_expirado = jwt.encode(
        {
            "sub": "1",
            "rol": "Administrador",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    assert decode_access_token(token_expirado) is None
