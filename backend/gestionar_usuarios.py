from datetime import datetime, timezone
from getpass import getpass
from typing import Any

from app.core.supabase_client import supabase


CAMBIOS_CORREO = {
    "eroscordova27@gmail.com": "eros@ideatech.com",
    "analista@ideatech.com": "dulce@ideatech.com",
    "operador@ideatech.com": "mariela@ideatech.com",
}

CORREO_EDWIN = "edwin@ideatech.com"
NOMBRE_EDWIN = "Edwin Jesus Manrique Javier"


def obtener_lista_usuarios() -> list[Any]:
    respuesta = (
        supabase.auth.admin.list_users()
    )

    if isinstance(respuesta, list):
        return respuesta

    usuarios = getattr(
        respuesta,
        "users",
        None,
    )

    if usuarios is None:
        raise RuntimeError(
            "No se pudo obtener la lista de usuarios.",
        )

    return list(usuarios)


def buscar_usuario_por_correo(
    correo: str,
    usuarios: list[Any],
) -> Any | None:
    correo_buscado = (
        correo.strip().lower()
    )

    for usuario in usuarios:
        correo_usuario = (
            getattr(
                usuario,
                "email",
                None,
            )
            or ""
        ).lower()

        if correo_usuario == correo_buscado:
            return usuario

    return None


def cambiar_correos() -> None:
    usuarios = obtener_lista_usuarios()

    for (
        correo_anterior,
        correo_nuevo,
    ) in CAMBIOS_CORREO.items():
        usuario_anterior = (
            buscar_usuario_por_correo(
                correo_anterior,
                usuarios,
            )
        )

        usuario_nuevo = (
            buscar_usuario_por_correo(
                correo_nuevo,
                usuarios,
            )
        )

        if usuario_nuevo:
            print(
                f"El correo {correo_nuevo} "
                "ya está configurado.",
            )
            continue

        if not usuario_anterior:
            print(
                f"No se encontró el usuario "
                f"{correo_anterior}.",
            )
            continue

        supabase.auth.admin.update_user_by_id(
            usuario_anterior.id,
            {
                "email": correo_nuevo,
                "email_confirm": True,
            },
        )

        (
            supabase.table("perfiles")
            .update(
                {
                    "correo": correo_nuevo,
                    "fecha_actualizacion": (
                        datetime.now(
                            timezone.utc,
                        ).isoformat()
                    ),
                },
            )
            .eq(
                "id",
                usuario_anterior.id,
            )
            .execute()
        )

        print(
            "Correo actualizado: "
            f"{correo_anterior} → "
            f"{correo_nuevo}",
        )

        usuarios = obtener_lista_usuarios()


def crear_edwin() -> None:
    usuarios = obtener_lista_usuarios()

    usuario_edwin = (
        buscar_usuario_por_correo(
            CORREO_EDWIN,
            usuarios,
        )
    )

    if usuario_edwin:
        print(
            f"El usuario {CORREO_EDWIN} "
            "ya existe.",
        )
        return

    contrasena = getpass(
        "Crea una contraseña para Edwin: ",
    )

    confirmacion = getpass(
        "Repite la contraseña para Edwin: ",
    )

    if contrasena != confirmacion:
        raise ValueError(
            "Las contraseñas no coinciden.",
        )

    if len(contrasena) < 8:
        raise ValueError(
            "La contraseña debe tener "
            "al menos 8 caracteres.",
        )

    respuesta = (
        supabase.auth.admin.create_user(
            {
                "email": CORREO_EDWIN,
                "password": contrasena,
                "email_confirm": True,
                "user_metadata": {
                    "nombre_completo": (
                        NOMBRE_EDWIN
                    ),
                    "telefono": "",
                    "empresa": "IdeaTech",
                    "cargo": "Operador",
                    "motivo_solicitud": (
                        "Usuario operador "
                        "autorizado por IdeaTech"
                    ),
                },
            },
        )
    )

    usuario_creado = getattr(
        respuesta,
        "user",
        None,
    )

    if usuario_creado is None:
        raise RuntimeError(
            "Supabase no devolvió el "
            "usuario creado.",
        )

    usuarios_actualizados = (
        obtener_lista_usuarios()
    )

    administrador = (
        buscar_usuario_por_correo(
            "eros@ideatech.com",
            usuarios_actualizados,
        )
    )

    fecha_actual = datetime.now(
        timezone.utc,
    ).isoformat()

    datos_perfil: dict[str, Any] = {
        "nombre_completo": NOMBRE_EDWIN,
        "correo": CORREO_EDWIN,
        "empresa": "IdeaTech",
        "cargo": "Operador",
        "rol": "operador",
        "activo": True,
        "estado_solicitud": "aprobado",
        "motivo_rechazo": None,
        "fecha_revision": fecha_actual,
        "fecha_actualizacion": fecha_actual,
    }

    if administrador:
        datos_perfil["revisado_por"] = (
            administrador.id
        )

    (
        supabase.table("perfiles")
        .update(datos_perfil)
        .eq(
            "id",
            usuario_creado.id,
        )
        .execute()
    )

    print(
        "Usuario creado y aprobado: "
        f"{NOMBRE_EDWIN} "
        f"<{CORREO_EDWIN}>",
    )


def mostrar_usuarios() -> None:
    respuesta = (
        supabase.table("perfiles")
        .select(
            "id,nombre_completo,correo,rol,"
            "activo,estado_solicitud",
        )
        .order("nombre_completo")
        .execute()
    )

    print(
        "\nUSUARIOS CONFIGURADOS\n",
    )

    for perfil in respuesta.data:
        print(
            f"- {perfil['nombre_completo']} | "
            f"{perfil['correo']} | "
            f"{perfil['rol']} | "
            f"{perfil['estado_solicitud']}",
        )


def ejecutar() -> None:
    print(
        "Configurando usuarios "
        "de IdeaTech...\n",
    )

    cambiar_correos()
    crear_edwin()
    mostrar_usuarios()

    print(
        "\nProceso terminado correctamente.",
    )


if __name__ == "__main__":
    try:
        ejecutar()
    except (
        RuntimeError,
        ValueError,
    ) as error:
        print(
            f"\nERROR: {error}",
        )