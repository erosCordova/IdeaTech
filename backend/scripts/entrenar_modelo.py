import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (
    OneHotEncoder,
    StandardScaler,
)


SEMILLA = 42
CANTIDAD_REGISTROS = 1000
VERSION_MODELO = "1.1.0"

RUTA_BACKEND = Path(__file__).resolve().parents[1]
CARPETA_DATOS = RUTA_BACKEND / "datos"
CARPETA_MODELOS = RUTA_BACKEND / "modelos"

RUTA_CSV = (
    CARPETA_DATOS
    / "clientes_entrenamiento_1000.csv"
)

RUTA_MODELO = (
    CARPETA_MODELOS
    / "modelo_cancelacion.joblib"
)

RUTA_METRICAS = (
    CARPETA_MODELOS
    / "metricas_modelo.json"
)

COLUMNAS_NUMERICAS = [
    "ingreso_mensual",
    "antiguedad_empresa",
    "cantidad_empleados",
    "monto_suscripcion",
    "accesos_api",
    "servicios_activos",
]

COLUMNAS_CATEGORICAS = [
    "tipo_plan",
    "rubro_empresa",
    "tamano_empresa",
    "servidor_propio",
]

COLUMNAS_MODELO = (
    COLUMNAS_NUMERICAS
    + COLUMNAS_CATEGORICAS
)

COLUMNA_OBJETIVO = "cancelo_servicio"


def generar_datos_empresariales(
    generador: np.random.Generator,
) -> pd.DataFrame:
    tipos_plan = np.array(
        [
            "basico",
            "profesional",
            "empresarial",
            "personalizado",
        ]
    )

    rubros = np.array(
        [
            "tecnologia",
            "comercio",
            "educacion",
            "salud",
            "manufactura",
            "servicios",
        ]
    )

    tamanos = np.array(
        [
            "pequena",
            "mediana",
            "grande",
        ]
    )

    tipo_plan = generador.choice(
        tipos_plan,
        size=CANTIDAD_REGISTROS,
        p=[0.38, 0.32, 0.20, 0.10],
    )

    rubro_empresa = generador.choice(
        rubros,
        size=CANTIDAD_REGISTROS,
        p=[
            0.20,
            0.20,
            0.13,
            0.15,
            0.13,
            0.19,
        ],
    )

    tamano_empresa = generador.choice(
        tamanos,
        size=CANTIDAD_REGISTROS,
        p=[0.55, 0.30, 0.15],
    )

    servidor_propio = generador.choice(
        [False, True],
        size=CANTIDAD_REGISTROS,
        p=[0.68, 0.32],
    )

    antiguedad_empresa = generador.integers(
        0,
        31,
        size=CANTIDAD_REGISTROS,
    )

    cantidad_empleados = np.where(
        tamano_empresa == "pequena",
        generador.integers(
            2,
            50,
            CANTIDAD_REGISTROS,
        ),
        np.where(
            tamano_empresa == "mediana",
            generador.integers(
                50,
                250,
                CANTIDAD_REGISTROS,
            ),
            generador.integers(
                250,
                1500,
                CANTIDAD_REGISTROS,
            ),
        ),
    )

    ingreso_mensual = np.where(
        tamano_empresa == "pequena",
        generador.normal(
            25000,
            10000,
            CANTIDAD_REGISTROS,
        ),
        np.where(
            tamano_empresa == "mediana",
            generador.normal(
                110000,
                35000,
                CANTIDAD_REGISTROS,
            ),
            generador.normal(
                500000,
                140000,
                CANTIDAD_REGISTROS,
            ),
        ),
    )

    ingreso_mensual = np.clip(
        ingreso_mensual,
        3000,
        None,
    ).round(2)

    precios_plan = {
        "basico": 150.0,
        "profesional": 450.0,
        "empresarial": 1100.0,
        "personalizado": 2300.0,
    }

    monto_suscripcion = np.array(
        [
            precios_plan[plan]
            for plan in tipo_plan
        ],
        dtype=float,
    )

    monto_suscripcion *= generador.uniform(
        0.85,
        1.30,
        CANTIDAD_REGISTROS,
    )

    monto_suscripcion = (
        monto_suscripcion.round(2)
    )

    accesos_api = np.where(
        tipo_plan == "basico",
        generador.integers(
            0,
            4,
            CANTIDAD_REGISTROS,
        ),
        np.where(
            tipo_plan == "profesional",
            generador.integers(
                2,
                12,
                CANTIDAD_REGISTROS,
            ),
            generador.integers(
                8,
                50,
                CANTIDAD_REGISTROS,
            ),
        ),
    )

    servicios_activos = generador.integers(
        0,
        9,
        CANTIDAD_REGISTROS,
    )

    return pd.DataFrame(
        {
            "ingreso_mensual":
                ingreso_mensual,
            "antiguedad_empresa":
                antiguedad_empresa,
            "tipo_plan":
                tipo_plan,
            "servidor_propio":
                servidor_propio,
            "accesos_api":
                accesos_api,
            "servicios_activos":
                servicios_activos,
            "monto_suscripcion":
                monto_suscripcion,
            "rubro_empresa":
                rubro_empresa,
            "tamano_empresa":
                tamano_empresa,
            "cantidad_empleados":
                cantidad_empleados,
        }
    )


def generar_variable_objetivo(
    dataset: pd.DataFrame,
    generador: np.random.Generator,
) -> pd.Series:
    riesgo = np.zeros(
        len(dataset),
        dtype=float,
    )

    riesgo += np.where(
        dataset["servicios_activos"] <= 1,
        2.0,
        0.0,
    )

    riesgo += np.where(
        dataset["servicios_activos"] >= 5,
        -1.0,
        0.0,
    )

    riesgo += np.where(
        dataset["tipo_plan"] == "basico",
        1.3,
        0.0,
    )

    riesgo += np.where(
        dataset["tipo_plan"].isin(
            ["empresarial", "personalizado"]
        ),
        -0.8,
        0.0,
    )

    riesgo += np.where(
        dataset["antiguedad_empresa"] <= 2,
        1.2,
        0.0,
    )

    riesgo += np.where(
        dataset["antiguedad_empresa"] >= 10,
        -0.5,
        0.0,
    )

    riesgo += np.where(
        dataset["accesos_api"] == 0,
        1.0,
        0.0,
    )

    proporcion_suscripcion = (
        dataset["monto_suscripcion"]
        / dataset["ingreso_mensual"]
    )

    riesgo += np.where(
        proporcion_suscripcion > 0.04,
        1.2,
        0.0,
    )

    riesgo += np.where(
        dataset["servidor_propio"],
        -0.5,
        0.6,
    )

    riesgo += np.where(
        dataset["tamano_empresa"] == "pequena",
        0.5,
        0.0,
    )

    riesgo += np.where(
        dataset["cantidad_empleados"] >= 250,
        -0.4,
        0.0,
    )

    riesgo += np.where(
        dataset["rubro_empresa"] == "comercio",
        0.25,
        0.0,
    )

    riesgo += generador.normal(
        0,
        0.30,
        len(dataset),
    )

    cancelo_servicio = riesgo >= 1.5

    ruido = (
        generador.random(len(dataset))
        < 0.05
    )

    cancelo_servicio = np.where(
        ruido,
        ~cancelo_servicio,
        cancelo_servicio,
    )

    return pd.Series(
        cancelo_servicio,
        name=COLUMNA_OBJETIVO,
        dtype=bool,
    )


def crear_dataset() -> pd.DataFrame:
    generador = np.random.default_rng(SEMILLA)

    dataset = generar_datos_empresariales(
        generador,
    )

    dataset[COLUMNA_OBJETIVO] = (
        generar_variable_objetivo(
            dataset,
            generador,
        )
    )

    return dataset


def crear_pipeline() -> Pipeline:
    preprocesamiento = ColumnTransformer(
        transformers=[
            (
                "numericas",
                StandardScaler(),
                COLUMNAS_NUMERICAS,
            ),
            (
                "categoricas",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
                COLUMNAS_CATEGORICAS,
            ),
        ],
        remainder="drop",
    )

    clasificador = RandomForestClassifier(
        n_estimators=350,
        max_depth=14,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=SEMILLA,
        n_jobs=-1,
    )

    return Pipeline(
        steps=[
            (
                "preprocesamiento",
                preprocesamiento,
            ),
            (
                "clasificador",
                clasificador,
            ),
        ]
    )


def entrenar_modelo(
    dataset: pd.DataFrame,
) -> tuple[Pipeline, dict[str, object]]:
    variables = dataset[COLUMNAS_MODELO]
    objetivo = dataset[COLUMNA_OBJETIVO]

    (
        variables_entrenamiento,
        variables_prueba,
        objetivo_entrenamiento,
        objetivo_prueba,
    ) = train_test_split(
        variables,
        objetivo,
        test_size=0.20,
        random_state=SEMILLA,
        stratify=objetivo,
    )

    modelo = crear_pipeline()

    modelo.fit(
        variables_entrenamiento,
        objetivo_entrenamiento,
    )

    predicciones = modelo.predict(
        variables_prueba,
    )

    probabilidades = modelo.predict_proba(
        variables_prueba,
    )[:, 1]

    exactitud = accuracy_score(
        objetivo_prueba,
        predicciones,
    )

    roc_auc = roc_auc_score(
        objetivo_prueba,
        probabilidades,
    )

    metricas: dict[str, object] = {
        "modelo": "RandomForestClassifier",
        "version": VERSION_MODELO,
        "registros_totales": len(dataset),
        "registros_entrenamiento":
            len(variables_entrenamiento),
        "registros_prueba":
            len(variables_prueba),
        "cancelaron":
            int(objetivo.sum()),
        "no_cancelaron":
            int((~objetivo).sum()),
        "exactitud":
            round(float(exactitud), 4),
        "roc_auc":
            round(float(roc_auc), 4),
        "matriz_confusion":
            confusion_matrix(
                objetivo_prueba,
                predicciones,
            ).tolist(),
        "reporte_clasificacion":
            classification_report(
                objetivo_prueba,
                predicciones,
                output_dict=True,
                zero_division=0,
            ),
        "columnas_modelo":
            COLUMNAS_MODELO,
    }

    return modelo, metricas


def guardar_resultados(
    dataset: pd.DataFrame,
    modelo: Pipeline,
    metricas: dict[str, object],
) -> None:
    CARPETA_DATOS.mkdir(
        parents=True,
        exist_ok=True,
    )

    CARPETA_MODELOS.mkdir(
        parents=True,
        exist_ok=True,
    )

    dataset.to_csv(
        RUTA_CSV,
        index=False,
        encoding="utf-8",
    )

    joblib.dump(
        modelo,
        RUTA_MODELO,
    )

    with RUTA_METRICAS.open(
        "w",
        encoding="utf-8",
    ) as archivo:
        json.dump(
            metricas,
            archivo,
            ensure_ascii=False,
            indent=2,
        )


def main() -> None:
    print(
        "Generando 1,000 registros "
        "de entrenamiento..."
    )

    dataset = crear_dataset()

    print("Entrenando Random Forest...")

    modelo, metricas = entrenar_modelo(
        dataset,
    )

    guardar_resultados(
        dataset,
        modelo,
        metricas,
    )

    print("\nENTRENAMIENTO TERMINADO")
    print(
        f"Registros: "
        f"{metricas['registros_totales']}"
    )
    print(
        f"Cancelaron: "
        f"{metricas['cancelaron']}"
    )
    print(
        f"No cancelaron: "
        f"{metricas['no_cancelaron']}"
    )
    print(
        f"Exactitud: "
        f"{metricas['exactitud']}"
    )
    print(
        f"ROC AUC: "
        f"{metricas['roc_auc']}"
    )
    print(f"CSV: {RUTA_CSV}")
    print(f"Modelo: {RUTA_MODELO}")
    print(f"Métricas: {RUTA_METRICAS}")


if __name__ == "__main__":
    main()