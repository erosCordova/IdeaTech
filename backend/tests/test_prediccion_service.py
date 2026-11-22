"""Tests del servicio de predicción de cancelación.

Incluye una prueba end-to-end que carga el pipeline real guardado en
`backend/modelos/modelo_cancelacion.joblib`: no requiere Supabase ni red.
"""

from __future__ import annotations

import pytest
from app.services.prediccion_service import (
    COLUMNAS_MODELO,
    determinar_nivel_riesgo,
    obtener_informacion_modelo,
    predecir_cancelacion,
    preparar_cliente,
)

CLIENTE_RIESGOSO: dict[str, object] = {
    "ingreso_mensual": 350.0,
    "antiguedad_empresa": 1,
    "cantidad_empleados": 2,
    "monto_suscripcion": 90.0,
    "accesos_api": 15,
    "servicios_activos": 1,
    "tipo_plan": "basico",
    "rubro_empresa": "comercio",
    "tamano_empresa": "micro",
    "servidor_propio": False,
}

CLIENTE_FIEL: dict[str, object] = {
    "ingreso_mensual": 25000.0,
    "antiguedad_empresa": 9,
    "cantidad_empleados": 120,
    "monto_suscripcion": 4500.0,
    "accesos_api": 950,
    "servicios_activos": 12,
    "tipo_plan": "empresarial",
    "rubro_empresa": "tecnologia",
    "tamano_empresa": "grande",
    "servidor_propio": True,
}


@pytest.mark.parametrize(
    ("probabilidad", "esperado"),
    [
        (0.0, "bajo"),
        (0.34, "bajo"),
        (0.35, "medio"),
        (0.69, "medio"),
        (0.70, "alto"),
        (1.0, "alto"),
    ],
)
def test_determinar_nivel_riesgo(
    probabilidad: float, esperado: str
) -> None:
    assert determinar_nivel_riesgo(probabilidad) == esperado


def test_preparar_cliente_exige_campos_completos() -> None:
    cliente_incompleto = dict(CLIENTE_RIESGOSO)
    del cliente_incompleto["accesos_api"]
    del cliente_incompleto["tipo_plan"]

    with pytest.raises(ValueError, match="accesos_api, tipo_plan"):
        preparar_cliente(cliente_incompleto)


def test_preparar_cliente_normaliza_textos() -> None:
    datos = preparar_cliente(
        {**CLIENTE_RIESGOSO, "tipo_plan": "  Premium "}
    )

    assert datos["tipo_plan"].iloc[0] == "premium"
    assert list(datos.columns) == COLUMNAS_MODELO


def test_prediccion_end_to_end_usando_el_modelo_real() -> None:
    resultado_riesgoso = predecir_cancelacion(CLIENTE_RIESGOSO)
    resultado_fiel = predecir_cancelacion(CLIENTE_FIEL)

    for resultado in (resultado_riesgoso, resultado_fiel):
        assert 0.0 <= resultado["probabilidad_cancelacion"] <= 1.0
        assert resultado["nivel_riesgo"] in {"bajo", "medio", "alto"}
        assert isinstance(resultado["clase_predicha"], bool)
        assert resultado["modelo"] == "RandomForestClassifier"
        assert resultado["version_modelo"] == "1.1.0"

    # El cliente de bajo valor/antigüedad debe verse más riesgoso
    # que el cliente empresarial fiel (consistencia del ranking).
    assert (
        resultado_riesgoso["probabilidad_cancelacion"]
        > resultado_fiel["probabilidad_cancelacion"]
    )

    # La clase debe ser coherente con el umbral usado en el servicio.
    assert resultado_riesgoso["clase_predicha"] == (
        resultado_riesgoso["probabilidad_cancelacion"] >= 0.5
    )
    assert resultado_fiel["clase_predicha"] == (
        resultado_fiel["probabilidad_cancelacion"] >= 0.5
    )


def test_informacion_del_modelo_refleja_las_metricas() -> None:
    info = obtener_informacion_modelo()

    assert info["modelo"] == "RandomForestClassifier"
    assert info["registros_totales"] == 1000
    assert 0.0 <= float(info["exactitud"]) <= 1.0
    assert COLUMNAS_MODELO == list(info["columnas_modelo"])
