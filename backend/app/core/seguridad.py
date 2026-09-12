from typing import Any

from fastapi import Header, HTTPException, status

from app.core.supabase_client import supabase


def extraer_token(
    authorization: str | None,
) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Debes enviar el token de acceso "
                "en el encabezado Authorization."
            ),
        )

    partes = authorization.strip().split(" ")

    if (
        len(partes) != 2
        or partes[0].lower() != "bearer"
        or not partes[1]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "El encabezado Authorization "
                "no tiene un formato válido."
            ),
        )

    return partes[1]


def obtener_usuario_actual(
    authorization: str | None = Header(
        default=None,
        alias="Authorization",
    ),
) -> dict[str, Any]:
    token = extraer_token(authorization)

    try:
        respuesta_usuario = (
            supabase.auth.get_user(token)
        )

        usuario = respuesta_usuario.user

        if usuario is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail="La sesión no es válida.",
            )

        respuesta_perfil = (
            supabase.table("perfiles")
            .select(
                "id, nombre_completo, rol, "
                "activo, estado_solicitud"
            )
            .eq("id", str(usuario.id))
            .maybe_single()
            .execute()
        )

        perfil = respuesta_perfil.data

        if not perfil:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "El usuario no tiene un perfil "
                    "registrado."
                ),
            )

        if not perfil.get("activo", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta está inactiva.",
            )

        if (
            perfil.get("estado_solicitud")
            != "aprobado"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "La cuenta todavía no ha sido "
                    "aprobada."
                ),
            )

        return {
            "id": str(usuario.id),
            "email": usuario.email,
            "nombre_completo": perfil.get(
                "nombre_completo",
            ),
            "rol": perfil.get("rol"),
            "token": token,
        }

    except HTTPException:
        raise

    except Exception as excepcion:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "No fue posible validar la sesión "
                "con Supabase."
            ),
        ) from excepcion


def comprobar_acceso_comentario(
    comentario: dict[str, Any],
    usuario: dict[str, Any],
) -> None:
    roles_con_acceso_total = {
        "administrador",
        "analista",
    }

    if usuario["rol"] in roles_con_acceso_total:
        return

    if comentario.get("usuario_id") != usuario["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "No tienes permiso para analizar "
                "este comentario."
            ),
        )