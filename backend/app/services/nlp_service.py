import re
import unicodedata
from typing import TypedDict

from nltk.tokenize import RegexpTokenizer


class ResultadoAnalisis(TypedDict):
    categoria: str
    sentimiento: str
    polaridad: float
    palabras_positivas: list[str]
    palabras_negativas: list[str]


TOKENIZADOR = RegexpTokenizer(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")

PALABRAS_POSITIVAS = {
    "agradable",
    "bien",
    "buena",
    "bueno",
    "calidad",
    "correcto",
    "eficiente",
    "encanta",
    "excelente",
    "feliz",
    "genial",
    "increible",
    "rapida",
    "rapido",
    "recomendable",
    "satisfecho",
    "satisfecha",
    "util",
}

PALABRAS_NEGATIVAS = {
    "deficiente",
    "demora",
    "dificil",
    "error",
    "fallo",
    "lenta",
    "lento",
    "mala",
    "malo",
    "molesto",
    "problema",
    "pesimo",
    "retraso",
    "terrible",
    "inutil",
}

INTENSIFICADORES = {
    "demasiado",
    "extremadamente",
    "muy",
    "realmente",
    "totalmente",
}

NEGACIONES = {
    "jamas",
    "no",
    "nunca",
    "tampoco",
}

CATEGORIAS: dict[str, set[str]] = {
    "atencion": {
        "asesor",
        "atencion",
        "consulta",
        "personal",
        "respuesta",
        "soporte",
    },
    "facturacion": {
        "cobro",
        "factura",
        "facturacion",
        "pago",
        "precio",
        "suscripcion",
    },
    "plataforma": {
        "aplicacion",
        "error",
        "pagina",
        "plataforma",
        "sistema",
        "web",
    },
    "rendimiento": {
        "demora",
        "lenta",
        "lento",
        "rapida",
        "rapido",
        "rendimiento",
        "velocidad",
    },
    "servicio": {
        "calidad",
        "plan",
        "producto",
        "servicio",
        "solucion",
    },
}


def normalizar_texto(texto: str) -> str:
    texto_minuscula = texto.lower().strip()

    texto_sin_tildes = "".join(
        caracter
        for caracter in unicodedata.normalize(
            "NFD",
            texto_minuscula,
        )
        if unicodedata.category(caracter) != "Mn"
    )

    return re.sub(
        r"\s+",
        " ",
        texto_sin_tildes,
    )


def tokenizar_texto(texto: str) -> list[str]:
    texto_normalizado = normalizar_texto(texto)

    return [
        token.lower()
        for token in TOKENIZADOR.tokenize(
            texto_normalizado,
        )
    ]


def detectar_categoria(
    tokens: list[str],
) -> str:
    puntuaciones: dict[str, int] = {}

    for categoria, palabras in CATEGORIAS.items():
        puntuaciones[categoria] = sum(
            1
            for token in tokens
            if token in palabras
        )

    categoria_detectada = max(
        puntuaciones,
        key=puntuaciones.get,
    )

    if puntuaciones[categoria_detectada] == 0:
        return "general"

    return categoria_detectada


def calcular_sentimiento(
    tokens: list[str],
) -> tuple[str, float, list[str], list[str]]:
    puntuacion = 0.0
    positivas_detectadas: list[str] = []
    negativas_detectadas: list[str] = []

    for indice, token in enumerate(tokens):
        palabra_anterior = (
            tokens[indice - 1]
            if indice > 0
            else ""
        )

        tiene_intensificador = (
            palabra_anterior in INTENSIFICADORES
        )
        tiene_negacion = (
            palabra_anterior in NEGACIONES
        )

        peso = 1.5 if tiene_intensificador else 1.0

        if token in PALABRAS_POSITIVAS:
            positivas_detectadas.append(token)

            if tiene_negacion:
                puntuacion -= peso
            else:
                puntuacion += peso

        elif token in PALABRAS_NEGATIVAS:
            negativas_detectadas.append(token)

            if tiene_negacion:
                puntuacion += peso
            else:
                puntuacion -= peso

    cantidad_palabras_valoradas = (
        len(positivas_detectadas)
        + len(negativas_detectadas)
    )

    if cantidad_palabras_valoradas == 0:
        polaridad = 0.0
    else:
        polaridad = puntuacion / max(
            cantidad_palabras_valoradas,
            1,
        )

    polaridad = max(-1.0, min(1.0, polaridad))
    polaridad = round(polaridad, 4)

    if polaridad > 0.1:
        sentimiento = "positivo"
    elif polaridad < -0.1:
        sentimiento = "negativo"
    else:
        sentimiento = "neutral"

    return (
        sentimiento,
        polaridad,
        positivas_detectadas,
        negativas_detectadas,
    )


def analizar_comentario(
    contenido: str,
) -> ResultadoAnalisis:
    contenido_limpio = contenido.strip()

    if len(contenido_limpio) < 3:
        raise ValueError(
            "El comentario debe tener al menos "
            "3 caracteres."
        )

    tokens = tokenizar_texto(contenido_limpio)
    categoria = detectar_categoria(tokens)

    (
        sentimiento,
        polaridad,
        palabras_positivas,
        palabras_negativas,
    ) = calcular_sentimiento(tokens)

    return {
        "categoria": categoria,
        "sentimiento": sentimiento,
        "polaridad": polaridad,
        "palabras_positivas": palabras_positivas,
        "palabras_negativas": palabras_negativas,
    }