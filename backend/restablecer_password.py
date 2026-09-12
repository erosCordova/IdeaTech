from getpass import getpass
from typing import Any

from app.core.supabase_client import supabase


def obtener_usuario_por_correo(
    correo: str,
) -> dict[str, Any]:
    respuesta = (
        supabase.table("perfiles")
        .select(
            "id,correo,nombre_completo,"
            "rol,activo",
        )
        .eq("correo", correo)
        .maybe_single()
        .execute()
    )

    if not respuesta.data:
        raise ValueError(
            "No existe un usuario con ese correo.",
        )

    return dict(respuesta.data)


def validar_contrasena(
    contrasena: str,
) -> str | None:
    if len(contrasena) < 8:
        return (
            "La contraseña debe tener al menos "
            "8 caracteres."
        )

    if not any(
        caracter.islower()
        for caracter in contrasena
    ):
        return (
            "La contraseña debe incluir al menos "
            "una letra minúscula."
        )

    if not any(
        caracter.isupper()
        for caracter in contrasena
    ):
        return (
            "La contraseña debe incluir al menos "
            "una letra mayúscula."
        )

    if not any(
        caracter.isdigit()
        for caracter in contrasena
    ):
        return (
            "La contraseña debe incluir al menos "
            "un número."
        )

    return None


def solicitar_contrasena() -> str:
    while True:
        contrasena = getpass(
            "Escribe la nueva contraseña: ",
        )

        confirmacion = getpass(
            "Repite la nueva contraseña: ",
        )

        error_validacion = validar_contrasena(
            contrasena,
        )

        if error_validacion:
            print(
                f"{error_validacion}\n",
            )
            continue

        if contrasena != confirmacion:
            print(
                "Las contraseñas no coinciden.\n",
            )
            continue

        return contrasena


def restablecer_password() -> None:
    print(
        "\nRESTABLECER CONTRASEÑA "
        "DE IDEATECH\n",
    )

    correo = input(
        "Correo del usuario: ",
    ).strip().lower()

    if not correo:
        raise ValueError(
            "Debes indicar el correo "
            "del usuario.",
        )

    usuario = obtener_usuario_por_correo(
        correo,
    )

    print(
        "\nUsuario encontrado:"
        f"\n- Nombre: "
        f"{usuario['nombre_completo']}"
        f"\n- Correo: {usuario['correo']}"
        f"\n- Rol: {usuario['rol']}"
        f"\n- Activo: {usuario['activo']}",
    )

    contrasena = solicitar_contrasena()

    supabase.auth.admin.update_user_by_id(
        str(usuario["id"]),
        {
            "password": contrasena,
        },
    )

    print(
        "\nContraseña actualizada "
        "correctamente para:"
        f"\n{usuario['nombre_completo']} "
        f"<{usuario['correo']}>",
    )


def preguntar_continuar() -> bool:
    respuesta = input(
        "\n¿Deseas actualizar otro usuario? "
        "(s/n): ",
    ).strip().lower()

    return respuesta == "s"


def main() -> None:
    while True:
        try:
            restablecer_password()
        except ValueError as error:
            print(
                "\nNo se pudo actualizar "
                "la contraseña:"
                f"\n{error}",
            )

        if not preguntar_continuar():
            break

    print(
        "\nProceso terminado.\n",
    )


if __name__ == "__main__":
    main()