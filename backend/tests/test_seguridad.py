"""Tests de las utilidades de seguridad que no requieren red.

`extraer_token` valida el encabezado Authorization y
`comprobar_acceso_comentario` aplica la política de acceso por rol.
Ambas son funciones puras: la validación contra Supabase
(`obtener_usuario_actual`) sí requeriría un mock y queda fuera.
"""

from __future__ import annotations

import pytest
from app.core.seguridad import (
    comprobar_acceso_comentario,
    extraer_token,
)
from fastapi import HTTPException


def test_extraer_token_acepta_bearer_insensible_a_mayusculas() -> None:
    assert extraer_token("Bearer abc.def.ghi") == "abc.def.ghi"
    assert extraer_token("bearer xyz") == "xyz"


@pytest.mark.parametrize(
    "encabezado",
    [
        None,
        "",
        "Token abc",
        "Bearer",
        "Bearer ",
        "Bearer a b",
    ],
)
def test_extraer_token_rechaza_formatos_invalidos(
    encabezado: str | None,
) -> None:
    with pytest.raises(HTTPException) as error:
        extraer_token(encabezado)

    assert error.value.status_code == 401


def _comentario(de_otro_usuario: dict[str, object]) -> dict[str, object]:
    return {"usuario_id": "usuario-dueño", **de_otro_usuario}


@pytest.mark.parametrize("rol", ["administrador", "analista"])
def test_rol_privilegiado_accede_a_cualquier_comentario(
    rol: str,
) -> None:
    comprobar_acceso_comentario(
        _comentario({}),
        {"rol": rol, "id": "otro"},
    )


def test_cliente_accede_a_su_propio_comentario() -> None:
    comprobar_acceso_comentario(
        _comentario({}),
        {"rol": "cliente", "id": "usuario-dueño"},
    )


def test_cliente_no_accede_al_comentario_ajeno() -> None:
    with pytest.raises(HTTPException) as error:
        comprobar_acceso_comentario(
            _comentario({}),
            {"rol": "cliente", "id": "intruso"},
        )

    assert error.value.status_code == 403
