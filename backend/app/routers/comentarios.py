from typing import Any, Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from pydantic import BaseModel, Field

from app.core.seguridad import (
    comprobar_acceso_comentario,
    obtener_usuario_actual,
)
from app.core.supabase_client import supabase
from app.services.nlp_service import (
    analizar_comentario,
)


router = APIRouter(
    prefix="/api/v1/comentarios",
    tags=["Comentarios y NLP"],
)


class AnalisisTextoEntrada(BaseModel):
    contenido: str = Field(
        min_length=3,
        max_length=2000,
    )


class ResultadoNLPRespuesta(BaseModel):
    categoria: str
    sentimiento: Literal[
        "positivo",
        "neutral",
        "negativo",
    ]
    polaridad: float
    palabras_positivas: list[str]
    palabras_negativas: list[str]


class ComentarioAnalizadoRespuesta(BaseModel):
    id: int
    cliente_id: int
    contenido: str
    categoria: str
    sentimiento: Literal[
        "positivo",
        "neutral",
        "negativo",
    ]
    polaridad: float
    procesado: bool
    mensaje: str


@router.post(
    "/analizar-texto",
    response_model=ResultadoNLPRespuesta,
    summary="Analizar un texto sin guardarlo",
)
def analizar_texto(
    datos: AnalisisTextoEntrada,
    _usuario: dict[str, Any] = Depends(
        obtener_usuario_actual,
    ),
) -> ResultadoNLPRespuesta:
    try:
        resultado = analizar_comentario(
            datos.contenido,
        )

        return ResultadoNLPRespuesta(**resultado)

    except ValueError as excepcion:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(excepcion),
        ) from excepcion


@router.post(
    "/{comentario_id}/analizar",
    response_model=ComentarioAnalizadoRespuesta,
    summary=(
        "Analizar un comentario y guardar "
        "el resultado"
    ),
)
def analizar_comentario_guardado(
    comentario_id: int,
    usuario: dict[str, Any] = Depends(
        obtener_usuario_actual,
    ),
) -> ComentarioAnalizadoRespuesta:
    try:
        respuesta_comentario = (
            supabase.table("comentarios")
            .select(
                "id, cliente_id, usuario_id, "
                "contenido, procesado"
            )
            .eq("id", comentario_id)
            .maybe_single()
            .execute()
        )

        comentario = respuesta_comentario.data

        if not comentario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El comentario no existe.",
            )

        comprobar_acceso_comentario(
            comentario,
            usuario,
        )

        resultado = analizar_comentario(
            comentario["contenido"],
        )

        respuesta_actualizacion = (
            supabase.table("comentarios")
            .update(
                {
                    "categoria": resultado[
                        "categoria"
                    ],
                    "sentimiento": resultado[
                        "sentimiento"
                    ],
                    "polaridad": resultado[
                        "polaridad"
                    ],
                    "procesado": True,
                }
            )
            .eq("id", comentario_id)
            .execute()
        )

        if not respuesta_actualizacion.data:
            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Supabase no devolvió el comentario "
                    "actualizado."
                ),
            )

        comentario_actualizado = (
            respuesta_actualizacion.data[0]
        )

        return ComentarioAnalizadoRespuesta(
            id=comentario_actualizado["id"],
            cliente_id=comentario_actualizado[
                "cliente_id"
            ],
            contenido=comentario_actualizado[
                "contenido"
            ],
            categoria=comentario_actualizado[
                "categoria"
            ],
            sentimiento=comentario_actualizado[
                "sentimiento"
            ],
            polaridad=float(
                comentario_actualizado["polaridad"]
            ),
            procesado=comentario_actualizado[
                "procesado"
            ],
            mensaje=(
                "Comentario analizado y actualizado "
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
                "No se pudo analizar el comentario: "
                f"{str(excepcion)}"
            ),
        ) from excepcion