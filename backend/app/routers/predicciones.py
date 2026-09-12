from typing import Any, Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from pydantic import BaseModel

from app.core.seguridad import obtener_usuario_actual
from app.core.supabase_client import supabase
from app.services.prediccion_service import (
    obtener_informacion_modelo,
    predecir_cancelacion,
)


router = APIRouter(
    prefix="/api/v1/predicciones",
    tags=["Predicciones ML"],
)


class PrediccionRespuesta(BaseModel):
    id: int
    cliente_id: int
    cliente: str
    empresa: str
    modelo: str
    version_modelo: str
    clase_predicha: bool
    probabilidad_cancelacion: float
    nivel_riesgo: Literal[
        "bajo",
        "medio",
        "alto",
    ]
    fecha_prediccion: str
    mensaje: str


def validar_rol_prediccion(
    usuario: dict[str, Any],
) -> None:
    roles_permitidos = {
        "administrador",
        "analista",
    }

    if usuario.get("rol") not in roles_permitidos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Solo administradores y analistas "
                "pueden generar predicciones."
            ),
        )


def validar_cliente_para_prediccion(
    cliente: dict[str, Any],
) -> None:
    if cliente.get("estado") != "activo":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Solo se pueden generar predicciones "
                "para clientes activos."
            ),
        )

    if cliente.get("estado_datos") != "verificado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Los datos empresariales del cliente "
                "todavía no han sido verificados."
            ),
        )

    campos_obligatorios = {
        "ingreso_mensual": "Ingreso mensual",
        "antiguedad_empresa": "Antigüedad de la empresa",
        "cantidad_empleados": "Cantidad de empleados",
        "monto_suscripcion": "Monto de suscripción",
        "accesos_api": "Accesos API",
        "servicios_activos": "Servicios activos",
        "tipo_plan": "Tipo de plan",
        "rubro_empresa": "Rubro de la empresa",
        "tamano_empresa": "Tamaño de la empresa",
        "servidor_propio": "Servidor propio",
    }

    campos_faltantes: list[str] = []

    for campo, etiqueta in campos_obligatorios.items():
        if cliente.get(campo) is None:
            campos_faltantes.append(etiqueta)

    if campos_faltantes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No se puede generar la predicción porque "
                "faltan los siguientes datos: "
                + ", ".join(campos_faltantes)
                + "."
            ),
        )


@router.get(
    "/modelo",
    summary="Consultar información del modelo",
)
def consultar_modelo(
    usuario: dict[str, Any] = Depends(
        obtener_usuario_actual,
    ),
) -> dict[str, Any]:
    validar_rol_prediccion(usuario)

    try:
        return obtener_informacion_modelo()

    except Exception as excepcion:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "No se pudo cargar la información "
                f"del modelo: {str(excepcion)}"
            ),
        ) from excepcion


@router.post(
    "/cliente/{cliente_id}",
    response_model=PrediccionRespuesta,
    summary=(
        "Predecir la cancelación de un cliente "
        "y guardar el resultado"
    ),
)
def predecir_cliente(
    cliente_id: int,
    usuario: dict[str, Any] = Depends(
        obtener_usuario_actual,
    ),
) -> PrediccionRespuesta:
    validar_rol_prediccion(usuario)

    try:
        respuesta_cliente = (
            supabase.table("clientes")
            .select(
                "id, "
                "nombre, "
                "empresa, "
                "estado, "
                "estado_datos, "
                "ingreso_mensual, "
                "antiguedad_empresa, "
                "cantidad_empleados, "
                "monto_suscripcion, "
                "accesos_api, "
                "servicios_activos, "
                "tipo_plan, "
                "rubro_empresa, "
                "tamano_empresa, "
                "servidor_propio"
            )
            .eq("id", cliente_id)
            .maybe_single()
            .execute()
        )

        cliente = respuesta_cliente.data

        if not cliente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El cliente no existe.",
            )

        validar_cliente_para_prediccion(cliente)

        resultado = predecir_cancelacion(cliente)

        respuesta_registro = (
            supabase.table("predicciones")
            .insert(
                {
                    "cliente_id": cliente_id,
                    "usuario_id": usuario["id"],
                    "modelo": resultado["modelo"],
                    "clase_predicha": resultado[
                        "clase_predicha"
                    ],
                    "probabilidad_cancelacion": resultado[
                        "probabilidad_cancelacion"
                    ],
                    "nivel_riesgo": resultado[
                        "nivel_riesgo"
                    ],
                    "version_modelo": resultado[
                        "version_modelo"
                    ],
                }
            )
            .execute()
        )

        if not respuesta_registro.data:
            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Supabase no devolvió la "
                    "predicción registrada."
                ),
            )

        prediccion = respuesta_registro.data[0]

        return PrediccionRespuesta(
            id=prediccion["id"],
            cliente_id=cliente_id,
            cliente=cliente["nombre"],
            empresa=cliente["empresa"],
            modelo=prediccion["modelo"],
            version_modelo=prediccion[
                "version_modelo"
            ],
            clase_predicha=prediccion[
                "clase_predicha"
            ],
            probabilidad_cancelacion=float(
                prediccion[
                    "probabilidad_cancelacion"
                ]
            ),
            nivel_riesgo=prediccion[
                "nivel_riesgo"
            ],
            fecha_prediccion=str(
                prediccion["fecha_prediccion"]
            ),
            mensaje=(
                "Predicción generada y registrada "
                "correctamente."
            ),
        )

    except HTTPException:
        raise

    except ValueError as excepcion:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(excepcion),
        ) from excepcion

    except Exception as excepcion:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "No se pudo generar la predicción: "
                f"{str(excepcion)}"
            ),
        ) from excepcion