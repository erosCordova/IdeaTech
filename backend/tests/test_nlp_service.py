"""Tests del servicio NLP de comentarios (lógica pura, sin red)."""

from __future__ import annotations

import pytest
from app.services.nlp_service import (
    analizar_comentario,
    detectar_categoria,
    normalizar_texto,
    tokenizar_texto,
)


def test_normalizar_texto_quita_tildes_y_espacios() -> None:
    assert normalizar_texto("  Acción  RÁPIDA  ") == "accion rapida"


def test_tokenizar_ignora_numeros_y_simbolos() -> None:
    assert tokenizar_texto("¡Excelente! 100% soporte") == [
        "excelente",
        "soporte",
    ]


def test_comentario_positivo_sobre_soporte() -> None:
    resultado = analizar_comentario(
        "El soporte es excelente y muy rápido, todo genial"
    )

    assert resultado["sentimiento"] == "positivo"
    assert resultado["polaridad"] > 0
    assert resultado["categoria"] == "atencion"
    assert "excelente" in resultado["palabras_positivas"]


def test_comentario_negativo_sobre_servicio() -> None:
    resultado = analizar_comentario(
        "El servicio es malo y la atención terrible"
    )

    assert resultado["sentimiento"] == "negativo"
    assert resultado["polaridad"] < 0
    assert "malo" in resultado["palabras_negativas"]


def test_negacion_invierte_sentimiento() -> None:
    resultado = analizar_comentario("un sistema no util")

    assert resultado["sentimiento"] == "negativo"
    assert "util" in resultado["palabras_positivas"]
    assert resultado["polaridad"] < 0


def test_texto_neutral_sin_palabras_valoradas() -> None:
    resultado = analizar_comentario("Solicité la migración de datos")

    assert resultado["sentimiento"] == "neutral"
    assert resultado["polaridad"] == 0.0
    assert resultado["categoria"] == "general"


def test_categoria_facturacion() -> None:
    resultado = analizar_comentario(
        "La factura de este mes trae el cobro de la suscripción"
    )

    assert resultado["categoria"] == "facturacion"


def test_detectar_categoria_devuelve_general_sin_coincidencias() -> None:
    assert detectar_categoria(["hola", "mundo"]) == "general"


def test_comentario_demasiado_corto_falla() -> None:
    with pytest.raises(ValueError, match="al menos"):
        analizar_comentario("h!")
