"""bootstrap_admin.py valida el email antes de insertar (con SQLAlchemy crudo no
pasa por el schema UsuarioRegistroPayload). Un TLD reservado como '.test' entraría
a la BD y luego GET /usuarios daría 500 al serializar esa fila con EmailStr."""

import pytest
from pydantic import ValidationError

from bootstrap_admin import _validar_email


def test_validar_email_acepta_correo_normal():
    assert _validar_email("  Admin@Tlapiani.MX ") == "Admin@tlapiani.mx"


@pytest.mark.parametrize("malo", ["admin@tlapiani.test", "sin-arroba", "admin@localhost", ""])
def test_validar_email_rechaza_invalidos(malo):
    with pytest.raises(ValidationError):
        _validar_email(malo)
