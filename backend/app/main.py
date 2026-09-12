from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import obtener_configuracion
from app.core.supabase_client import supabase
from app.routers.comentarios import (
    router as comentarios_router,
)
from app.routers.predicciones import (
    router as predicciones_router,
)


configuracion = obtener_configuracion()

app = FastAPI(
    title=configuracion.nombre_aplicacion,
    version=configuracion.version,
    description=(
        "Backend empresarial de IdeaTech conectado con "
        "Supabase, Machine Learning y procesamiento NLP."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        configuracion.frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(comentarios_router)
app.include_router(predicciones_router)


@app.get("/", tags=["General"])
def inicio() -> dict[str, str]:
    return {
        "aplicacion": configuracion.nombre_aplicacion,
        "version": configuracion.version,
        "estado": "funcionando",
    }


@app.get(
    "/api/v1/salud",
    tags=["General"],
)
def comprobar_salud() -> dict[str, str]:
    return {
        "estado": "ok",
        "backend": "FastAPI",
        "base_datos": "Supabase PostgreSQL",
        "despliegue": "Render",
    }


@app.get(
    "/api/v1/supabase/status",
    tags=["Supabase"],
)
def comprobar_supabase() -> dict[str, str | int]:
    try:
        respuesta = (
            supabase.table("perfiles")
            .select("id")
            .limit(1)
            .execute()
        )

        return {
            "estado": "conectado",
            "servicio": "Supabase Data API",
            "registros_consultados": len(
                respuesta.data
            ),
        }

    except Exception as excepcion:
        raise HTTPException(
            status_code=503,
            detail=(
                "No se pudo establecer conexión "
                "con Supabase: "
                f"{str(excepcion)}"
            ),
        ) from excepcion