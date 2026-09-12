import json
from functools import lru_cache
from pathlib import Path
from typing import Any, TypedDict

import joblib
import pandas as pd
from sklearn.pipeline import Pipeline


RUTA_BACKEND = Path(__file__).resolve().parents[2]

RUTA_MODELO = (
    RUTA_BACKEND
    / "modelos"
    / "modelo_cancelacion.joblib"
)

RUTA_METRICAS = (
    RUTA_BACKEND
    / "modelos"
    / "metricas_modelo.json"
)

COLUMNAS_MODELO = [
    "ingreso_mensual",
    "antiguedad_empresa",
    "cantidad_empleados",
    "monto_suscripcion",
    "accesos_api",
    "servicios_activos",
    "tipo_plan",
    "rubro_empresa",
    "tamano_empresa",
    "servidor_propio",
]


class ResultadoPrediccion(TypedDict):
    clase_predicha: bool
    probabilidad_cancelacion: float
    nivel_riesgo: str
    modelo: str
    version_modelo: str


def validar_archivos_modelo() -> None:
    if not RUTA_MODELO.exists():
        raise FileNotFoundError(
            "No se encontró el modelo entrenado en "
            f"{RUTA_MODELO}."
        )

    if not RUTA_METRICAS.exists():
        raise FileNotFoundError(
            "No se encontró el archivo de métricas en "
            f"{RUTA_METRICAS}."
        )


@lru_cache
def cargar_modelo() -> Pipeline:
    validar_archivos_modelo()

    modelo = joblib.load(RUTA_MODELO)

    if not isinstance(modelo, Pipeline):
        raise TypeError(
            "El archivo cargado no contiene un "
            "Pipeline válido de Scikit-learn."
        )

    return modelo


@lru_cache
def cargar_metricas() -> dict[str, Any]:
    validar_archivos_modelo()

    with RUTA_METRICAS.open(
        "r",
        encoding="utf-8",
    ) as archivo:
        return json.load(archivo)


def determinar_nivel_riesgo(
    probabilidad: float,
) -> str:
    if probabilidad < 0.35:
        return "bajo"

    if probabilidad < 0.70:
        return "medio"

    return "alto"


def preparar_cliente(
    cliente: dict[str, Any],
) -> pd.DataFrame:
    campos_faltantes = [
        columna
        for columna in COLUMNAS_MODELO
        if cliente.get(columna) is None
    ]

    if campos_faltantes:
        raise ValueError(
            "Faltan datos obligatorios del cliente: "
            + ", ".join(campos_faltantes)
        )

    registro = {
        "ingreso_mensual": float(
            cliente["ingreso_mensual"]
        ),
        "antiguedad_empresa": int(
            cliente["antiguedad_empresa"]
        ),
        "cantidad_empleados": int(
            cliente["cantidad_empleados"]
        ),
        "monto_suscripcion": float(
            cliente["monto_suscripcion"]
        ),
        "accesos_api": int(
            cliente["accesos_api"]
        ),
        "servicios_activos": int(
            cliente["servicios_activos"]
        ),
        "tipo_plan": str(
            cliente["tipo_plan"]
        ).lower(),
        "rubro_empresa": str(
            cliente["rubro_empresa"]
        ).lower(),
        "tamano_empresa": str(
            cliente["tamano_empresa"]
        ).lower(),
        "servidor_propio": bool(
            cliente["servidor_propio"]
        ),
    }

    return pd.DataFrame(
        [registro],
        columns=COLUMNAS_MODELO,
    )


def predecir_cancelacion(
    cliente: dict[str, Any],
) -> ResultadoPrediccion:
    modelo = cargar_modelo()
    metricas = cargar_metricas()

    datos_cliente = preparar_cliente(cliente)

    probabilidad = float(
        modelo.predict_proba(
            datos_cliente,
        )[0][1]
    )

    clase_predicha = probabilidad >= 0.50

    return {
        "clase_predicha": clase_predicha,
        "probabilidad_cancelacion": round(
            probabilidad,
            5,
        ),
        "nivel_riesgo":
            determinar_nivel_riesgo(
                probabilidad,
            ),
        "modelo": str(
            metricas.get(
                "modelo",
                "RandomForestClassifier",
            )
        ),
        "version_modelo": str(
            metricas.get(
                "version",
                "1.1.0",
            )
        ),
    }


def obtener_informacion_modelo() -> dict[str, Any]:
    metricas = cargar_metricas()

    return {
        "modelo": metricas.get("modelo"),
        "version": metricas.get("version"),
        "registros_totales": metricas.get(
            "registros_totales"
        ),
        "exactitud": metricas.get("exactitud"),
        "roc_auc": metricas.get("roc_auc"),
        "columnas_modelo": metricas.get(
            "columnas_modelo"
        ),
    }