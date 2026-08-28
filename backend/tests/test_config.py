import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_acepta_pesos_que_suman_uno():
    settings = Settings(PRIORIDAD_ALPHA=0.4, PRIORIDAD_BETA=0.4, PRIORIDAD_GAMMA=0.2)
    assert settings.PRIORIDAD_ALPHA + settings.PRIORIDAD_BETA + settings.PRIORIDAD_GAMMA == pytest.approx(1.0)


def test_settings_rechaza_pesos_que_no_suman_uno():
    with pytest.raises(ValidationError, match="debe sumar 1.0"):
        Settings(PRIORIDAD_ALPHA=0.5, PRIORIDAD_BETA=0.4, PRIORIDAD_GAMMA=0.2)


def test_settings_tolera_error_de_redondeo_flotante():
    # 0.1 + 0.7 + 0.2 no da exactamente 1.0 en punto flotante binario;
    # la tolerancia debe absorber ese ruido sin rechazar una config válida.
    Settings(PRIORIDAD_ALPHA=0.1, PRIORIDAD_BETA=0.7, PRIORIDAD_GAMMA=0.2)
