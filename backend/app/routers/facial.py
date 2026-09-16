import base64
import binascii
import json
from typing import Any

import cv2
import face_recognition
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.seguridad import obtener_usuario_actual
from app.core.supabase_client import supabase


router = APIRouter(
    prefix="/api/v1/facial",
    tags=["Reconocimiento Facial"],
)


# ============================================================
# CONFIGURACIÓN
# ============================================================

# face_recognition trabaja con distancia:
# menor distancia = rostros más parecidos.
#
# Por requisito del proyecto se utilizará 0.82.
UMBRAL_FACIAL = 0.82

DIMENSION_VECTOR = 128


# ============================================================
# MODELOS
# ============================================================

class ImagenFacialEntrada(BaseModel):
    imagen: str = Field(min_length=20)


class RegistroFacialEntrada(ImagenFacialEntrada):
    usuario_id: str = Field(min_length=1)


class RegistroFacialRespuesta(BaseModel):
    usuario_id: str
    nombre: str
    mensaje: str


class ReconocimientoFacialRespuesta(BaseModel):
    rostro_detectado: bool = False
    reconocido: bool

    nombre: str | None = None
    dni: str | None = None
    correo: str | None = None
    rol: str | None = None
    estado: str | None = None

    coincidencia: float | None = None
    distancia: float | None = None

    mensaje: str


# ============================================================
# UTILIDADES SUPABASE
# ============================================================

def obtener_primer_registro(
    respuesta: Any,
) -> dict[str, Any] | None:
    datos = getattr(respuesta, "data", None)

    if not datos:
        return None

    if isinstance(datos, list):
        if not datos:
            return None

        return datos[0]

    if isinstance(datos, dict):
        return datos

    return None


def obtener_perfil(
    usuario_id: str,
) -> dict[str, Any] | None:
    respuesta = (
        supabase.table("perfiles")
        .select(
            "id,nombre_completo,dni,correo,"
            "rol,activo,estado_solicitud"
        )
        .eq("id", usuario_id)
        .limit(1)
        .execute()
    )

    return obtener_primer_registro(respuesta)


def comprobar_administrador(
    usuario: dict[str, Any],
) -> dict[str, Any]:
    usuario_id = (
        usuario.get("id")
        or usuario.get("sub")
    )

    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo identificar al usuario.",
        )

    perfil = obtener_perfil(str(usuario_id))

    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el perfil del usuario.",
        )

    if perfil.get("rol") != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Solo un administrador puede "
                "realizar esta operación."
            ),
        )

    if not perfil.get("activo", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta del administrador está inactiva.",
        )

    return perfil


# ============================================================
# CONVERSIÓN DE IMAGEN BASE64
# ============================================================

def decodificar_imagen(
    imagen_base64: str,
) -> np.ndarray:
    contenido = imagen_base64.strip()

    if "," in contenido:
        contenido = contenido.split(",", 1)[1]

    try:
        bytes_imagen = base64.b64decode(
            contenido,
            validate=True,
        )

    except (
        binascii.Error,
        ValueError,
    ) as excepcion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen recibida no es válida.",
        ) from excepcion

    array = np.frombuffer(
        bytes_imagen,
        dtype=np.uint8,
    )

    imagen = cv2.imdecode(
        array,
        cv2.IMREAD_COLOR,
    )

    if imagen is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No fue posible interpretar "
                "la imagen recibida."
            ),
        )

    return imagen


# ============================================================
# GENERAR VECTOR FACIAL
# ============================================================

def generar_vector_facial(
    imagen: np.ndarray,
) -> list[float]:
    imagen_rgb = cv2.cvtColor(
        imagen,
        cv2.COLOR_BGR2RGB,
    )

    # Dejamos que face_recognition detecte
    # directamente el rostro y genere el encoding.
    codificaciones = (
        face_recognition.face_encodings(
            imagen_rgb,
        )
    )

    if not codificaciones:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se detectó ningún rostro.",
        )

    if len(codificaciones) > 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Se detectó más de un rostro. "
                "Debe aparecer una sola persona."
            ),
        )

    vector = codificaciones[0]

    if len(vector) != DIMENSION_VECTOR:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "El vector facial generado "
                "no tiene 128 dimensiones."
            ),
        )

    return vector.astype(
        np.float64,
    ).tolist()


# ============================================================
# CONVERTIR VECTOR GUARDADO
# ============================================================

def convertir_vector_guardado(
    patrones: Any,
) -> np.ndarray | None:
    try:
        if patrones is None:
            return None

        if isinstance(patrones, str):
            patrones = json.loads(patrones)

        vector = np.asarray(
            patrones,
            dtype=np.float64,
        ).reshape(-1)

        if len(vector) != DIMENSION_VECTOR:
            return None

        return vector

    except (
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ):
        return None


# ============================================================
# COINCIDENCIA VISUAL
# ============================================================

def calcular_coincidencia(
    distancia: float,
) -> float:
    """
    Valor visual para la interfaz.

    No representa una probabilidad estadística
    ni debe interpretarse como confianza del modelo.
    """

    coincidencia = (
        1.0 - distancia
    ) * 100.0

    coincidencia = max(
        0.0,
        min(100.0, coincidencia),
    )

    return round(
        coincidencia,
        2,
    )


# ============================================================
# BUSCAR MEJOR COINCIDENCIA
# ============================================================

def buscar_mejor_coincidencia(
    vector_actual: list[float],
    registros: list[dict[str, Any]],
) -> dict[str, Any] | None:
    vectores_conocidos: list[np.ndarray] = []
    registros_validos: list[dict[str, Any]] = []

    for registro in registros:
        vector = convertir_vector_guardado(
            registro.get("rostro_patrones"),
        )

        if vector is None:
            continue

        vectores_conocidos.append(vector)
        registros_validos.append(registro)

    if not vectores_conocidos:
        return None

    vector_actual_numpy = np.asarray(
        vector_actual,
        dtype=np.float64,
    ).reshape(-1)

    distancias = face_recognition.face_distance(
        vectores_conocidos,
        vector_actual_numpy,
    )

    if len(distancias) == 0:
        return None

    mejor_indice = int(
        np.argmin(distancias),
    )

    menor_distancia = float(
        distancias[mejor_indice],
    )

    mejor_registro = (
        registros_validos[mejor_indice]
    )

    return {
        "registro": mejor_registro,
        "distancia": menor_distancia,
        "coincidencia": calcular_coincidencia(
            menor_distancia,
        ),
        "reconocido": (
            menor_distancia
            <= UMBRAL_FACIAL
        ),
    }


# ============================================================
# REGISTRAR ROSTRO
# ============================================================

@router.post(
    "/registrar",
    response_model=RegistroFacialRespuesta,
)
def registrar_rostro(
    datos: RegistroFacialEntrada,
    usuario_actual: dict[str, Any] = Depends(
        obtener_usuario_actual,
    ),
) -> RegistroFacialRespuesta:

    # Solo administrador.
    comprobar_administrador(
        usuario_actual,
    )

    perfil = obtener_perfil(
        datos.usuario_id,
    )

    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "El usuario seleccionado "
                "no existe."
            ),
        )

    if (
        perfil.get("estado_solicitud")
        != "aprobado"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "El usuario todavía no "
                "ha sido aprobado."
            ),
        )

    if not perfil.get("activo", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "El usuario seleccionado "
                "se encuentra inactivo."
            ),
        )

    imagen = decodificar_imagen(
        datos.imagen,
    )

    vector = generar_vector_facial(
        imagen,
    )

    nombre = (
        perfil.get("nombre_completo")
        or perfil.get("correo")
        or "Usuario"
    )

    respuesta_existente = (
        supabase.table("usuarios_rostros")
        .select("id")
        .eq(
            "usuario_id",
            datos.usuario_id,
        )
        .limit(1)
        .execute()
    )

    existente = obtener_primer_registro(
        respuesta_existente,
    )

    # Se guarda como JSON porque rostro_patrones
    # está definido actualmente como text.
    patrones_json = json.dumps(
        vector,
    )

    datos_rostro = {
        "usuario_id": datos.usuario_id,
        "nombre": nombre,
        "rostro_patrones": patrones_json,
    }

    if existente:
        (
            supabase.table("usuarios_rostros")
            .update(datos_rostro)
            .eq(
                "id",
                existente["id"],
            )
            .execute()
        )

        mensaje = (
            "Rostro actualizado correctamente."
        )

    else:
        (
            supabase.table("usuarios_rostros")
            .insert(datos_rostro)
            .execute()
        )

        mensaje = (
            "Rostro registrado correctamente."
        )

    return RegistroFacialRespuesta(
        usuario_id=datos.usuario_id,
        nombre=str(nombre),
        mensaje=mensaje,
    )


# ============================================================
# RECONOCER ROSTRO
# ============================================================

@router.post(
    "/reconocer",
    response_model=ReconocimientoFacialRespuesta,
)
def reconocer_rostro(
    datos: ImagenFacialEntrada,
    usuario_actual: dict[str, Any] = Depends(
        obtener_usuario_actual,
    ),
) -> ReconocimientoFacialRespuesta:

    # Por ahora la prueba facial sigue protegida.
    comprobar_administrador(
        usuario_actual,
    )

    imagen = decodificar_imagen(
        datos.imagen,
    )

    try:
        vector_actual = generar_vector_facial(
            imagen,
        )

    except HTTPException as excepcion:
        # Para reconocimiento continuo no queremos
        # convertir cada frame sin rostro en un
        # error general de la interfaz.
        if excepcion.status_code == (
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ):
            return ReconocimientoFacialRespuesta(
                rostro_detectado=False,
                reconocido=False,
                coincidencia=0.0,
                mensaje=str(excepcion.detail),
            )

        raise

    respuesta_rostros = (
        supabase.table("usuarios_rostros")
        .select(
            "id,usuario_id,nombre,"
            "rostro_patrones,created_at"
        )
        .execute()
    )

    registros = (
        respuesta_rostros.data
        if respuesta_rostros.data
        else []
    )

    if not registros:
        return ReconocimientoFacialRespuesta(
            rostro_detectado=True,
            reconocido=False,
            coincidencia=0.0,
            mensaje=(
                "No existen rostros "
                "registrados."
            ),
        )

    mejor_resultado = (
        buscar_mejor_coincidencia(
            vector_actual,
            registros,
        )
    )

    if not mejor_resultado:
        return ReconocimientoFacialRespuesta(
            rostro_detectado=True,
            reconocido=False,
            coincidencia=0.0,
            mensaje=(
                "No existen vectores faciales "
                "válidos para comparar."
            ),
        )

    distancia = float(
        mejor_resultado["distancia"],
    )

    coincidencia = float(
        mejor_resultado["coincidencia"],
    )

    if not mejor_resultado["reconocido"]:
        return ReconocimientoFacialRespuesta(
            rostro_detectado=True,
            reconocido=False,
            coincidencia=coincidencia,
            distancia=round(
                distancia,
                4,
            ),
            mensaje=(
                "El rostro no coincide con "
                "ningún usuario registrado."
            ),
        )

    registro = mejor_resultado[
        "registro"
    ]

    usuario_id = registro.get(
        "usuario_id",
    )

    if not usuario_id:
        return ReconocimientoFacialRespuesta(
            rostro_detectado=True,
            reconocido=False,
            coincidencia=coincidencia,
            distancia=round(
                distancia,
                4,
            ),
            mensaje=(
                "El rostro coincide con un "
                "registro antiguo que no está "
                "vinculado a un usuario."
            ),
        )

    perfil = obtener_perfil(
        str(usuario_id),
    )

    if not perfil:
        return ReconocimientoFacialRespuesta(
            rostro_detectado=True,
            reconocido=False,
            coincidencia=coincidencia,
            distancia=round(
                distancia,
                4,
            ),
            mensaje=(
                "El rostro fue reconocido, "
                "pero no se encontró su perfil."
            ),
        )

    if not perfil.get("activo", False):
        return ReconocimientoFacialRespuesta(
            rostro_detectado=True,
            reconocido=False,
            coincidencia=coincidencia,
            distancia=round(
                distancia,
                4,
            ),
            mensaje=(
                "El rostro pertenece a un "
                "usuario inactivo."
            ),
        )

    estado = (
        perfil.get("estado_solicitud")
        or (
            "activo"
            if perfil.get("activo")
            else "inactivo"
        )
    )

    return ReconocimientoFacialRespuesta(
        rostro_detectado=True,
        reconocido=True,
        nombre=perfil.get(
            "nombre_completo",
        ),
        dni=perfil.get("dni"),
        correo=perfil.get("correo"),
        rol=perfil.get("rol"),
        estado=str(estado),
        coincidencia=coincidencia,
        distancia=round(
            distancia,
            4,
        ),
        mensaje=(
            "Rostro reconocido correctamente."
        ),
    )
# ============================================================
# ACCESO FACIAL DESDE LOGIN
# ============================================================

class EstadoFacialPropioRespuesta(BaseModel):
    registrado: bool
    mensaje: str


class LoginFacialRespuesta(BaseModel):
    autenticado: bool
    token_hash: str | None = None
    tipo_verificacion: str | None = None
    mensaje: str


def obtener_registro_facial_usuario(
    usuario_id: str,
) -> dict[str, Any] | None:
    respuesta = (
        supabase.table("usuarios_rostros")
        .select("id,usuario_id,nombre,created_at")
        .eq("usuario_id", usuario_id)
        .limit(1)
        .execute()
    )

    return obtener_primer_registro(respuesta)


def obtener_token_hash_enlace(
    respuesta: Any,
) -> str | None:
    """
    Extrae hashed_token de la respuesta de generate_link()
    sin exponer action_link, OTP ni la secret key.
    """
    propiedades = getattr(
        respuesta,
        "properties",
        None,
    )

    if propiedades is not None:
        token_hash = getattr(
            propiedades,
            "hashed_token",
            None,
        )

        if token_hash:
            return str(token_hash)

        if isinstance(propiedades, dict):
            token_hash = propiedades.get(
                "hashed_token",
            )

            if token_hash:
                return str(token_hash)

    datos = getattr(
        respuesta,
        "data",
        None,
    )

    if datos is not None:
        propiedades_datos = getattr(
            datos,
            "properties",
            None,
        )

        if propiedades_datos is not None:
            token_hash = getattr(
                propiedades_datos,
                "hashed_token",
                None,
            )

            if token_hash:
                return str(token_hash)

            if isinstance(
                propiedades_datos,
                dict,
            ):
                token_hash = (
                    propiedades_datos.get(
                        "hashed_token",
                    )
                )

                if token_hash:
                    return str(token_hash)

        if isinstance(datos, dict):
            propiedades_dict = datos.get(
                "properties",
            )

            if isinstance(
                propiedades_dict,
                dict,
            ):
                token_hash = (
                    propiedades_dict.get(
                        "hashed_token",
                    )
                )

                if token_hash:
                    return str(token_hash)

            token_hash = datos.get(
                "hashed_token",
            )

            if token_hash:
                return str(token_hash)

    return None


@router.get(
    "/estado-propio",
    response_model=EstadoFacialPropioRespuesta,
)
def consultar_estado_facial_propio(
    usuario_actual: dict[str, Any] = Depends(
        obtener_usuario_actual,
    ),
) -> EstadoFacialPropioRespuesta:
    usuario_id = str(
        usuario_actual["id"],
    )

    registro = obtener_registro_facial_usuario(
        usuario_id,
    )

    if registro:
        return EstadoFacialPropioRespuesta(
            registrado=True,
            mensaje=(
                "El acceso facial ya está "
                "activado para esta cuenta."
            ),
        )

    return EstadoFacialPropioRespuesta(
        registrado=False,
        mensaje=(
            "La cuenta todavía no tiene "
            "un rostro registrado."
        ),
    )


@router.post(
    "/registrar-propio",
    response_model=RegistroFacialRespuesta,
)
def registrar_rostro_propio(
    datos: ImagenFacialEntrada,
    usuario_actual: dict[str, Any] = Depends(
        obtener_usuario_actual,
    ),
) -> RegistroFacialRespuesta:
    usuario_id = str(
        usuario_actual["id"],
    )

    # obtener_usuario_actual ya valida que la cuenta
    # esté activa y que su solicitud esté aprobada.
    perfil = obtener_perfil(
        usuario_id,
    )

    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No se encontró el perfil "
                "del usuario autenticado."
            ),
        )

    existente = obtener_registro_facial_usuario(
        usuario_id,
    )

    # En el autorregistro NO se actualiza ni se crea
    # una segunda fila. Un usuario solo puede tener
    # un registro facial.
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ya tienes el acceso facial "
                "activado."
            ),
        )

    imagen = decodificar_imagen(
        datos.imagen,
    )

    vector = generar_vector_facial(
        imagen,
    )

    nombre = (
        perfil.get("nombre_completo")
        or perfil.get("correo")
        or "Usuario"
    )

    patrones_json = json.dumps(
        vector,
    )

    try:
        (
            supabase.table("usuarios_rostros")
            .insert(
                {
                    "usuario_id": usuario_id,
                    "nombre": nombre,
                    "rostro_patrones": patrones_json,
                }
            )
            .execute()
        )

    except Exception as excepcion:
        # El índice UNIQUE de usuario_id actúa como
        # segunda barrera frente a registros duplicados.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se pudo registrar el rostro. "
                "Es posible que esta cuenta ya "
                "tenga acceso facial activado."
            ),
        ) from excepcion

    return RegistroFacialRespuesta(
        usuario_id=usuario_id,
        nombre=str(nombre),
        mensaje=(
            "Acceso facial activado correctamente."
        ),
    )


@router.post(
    "/login",
    response_model=LoginFacialRespuesta,
)
def iniciar_sesion_facial(
    datos: ImagenFacialEntrada,
) -> LoginFacialRespuesta:
    """
    Endpoint público exclusivamente para iniciar sesión.

    No devuelve nombre, DNI, correo, rol ni otros datos
    personales. Solo entrega un token_hash de un solo uso
    cuando el rostro coincide con un usuario válido.
    """
    imagen = decodificar_imagen(
        datos.imagen,
    )

    try:
        vector_actual = generar_vector_facial(
            imagen,
        )

    except HTTPException as excepcion:
        if excepcion.status_code == (
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ):
            return LoginFacialRespuesta(
                autenticado=False,
                mensaje=str(excepcion.detail),
            )

        raise

    respuesta_rostros = (
        supabase.table("usuarios_rostros")
        .select(
            "id,usuario_id,rostro_patrones"
        )
        .execute()
    )

    registros = (
        respuesta_rostros.data
        if respuesta_rostros.data
        else []
    )

    # Para login ignoramos registros antiguos que no
    # estén vinculados a un usuario real.
    registros_vinculados = [
        registro
        for registro in registros
        if registro.get("usuario_id")
    ]

    if not registros_vinculados:
        return LoginFacialRespuesta(
            autenticado=False,
            mensaje=(
                "No hay usuarios con acceso "
                "facial registrado."
            ),
        )

    mejor_resultado = buscar_mejor_coincidencia(
        vector_actual,
        registros_vinculados,
    )

    if (
        not mejor_resultado
        or not mejor_resultado["reconocido"]
    ):
        return LoginFacialRespuesta(
            autenticado=False,
            mensaje=(
                "No se pudo verificar el rostro."
            ),
        )

    registro = mejor_resultado["registro"]

    usuario_id = str(
        registro.get("usuario_id") or "",
    )

    if not usuario_id:
        return LoginFacialRespuesta(
            autenticado=False,
            mensaje=(
                "No se pudo verificar el rostro."
            ),
        )

    perfil = obtener_perfil(
        usuario_id,
    )

    # Usamos respuestas genéricas para no revelar desde
    # un endpoint público el estado interno de una cuenta.
    if not perfil:
        return LoginFacialRespuesta(
            autenticado=False,
            mensaje=(
                "No se pudo autorizar el acceso."
            ),
        )

    if not perfil.get("activo", False):
        return LoginFacialRespuesta(
            autenticado=False,
            mensaje=(
                "No se pudo autorizar el acceso."
            ),
        )

    if (
        perfil.get("estado_solicitud")
        != "aprobado"
    ):
        return LoginFacialRespuesta(
            autenticado=False,
            mensaje=(
                "No se pudo autorizar el acceso."
            ),
        )

    try:
        # Verificamos que usuario_id realmente exista en
        # Supabase Auth. Así evitamos generar acceso para
        # un perfil huérfano o inconsistente.
        respuesta_auth = (
            supabase.auth.admin.get_user_by_id(
                usuario_id,
            )
        )

        usuario_auth = getattr(
            respuesta_auth,
            "user",
            None,
        )

        if usuario_auth is None:
            datos_auth = getattr(
                respuesta_auth,
                "data",
                None,
            )

            if datos_auth is not None:
                usuario_auth = getattr(
                    datos_auth,
                    "user",
                    None,
                )

        correo_auth = getattr(
            usuario_auth,
            "email",
            None,
        )

        if not correo_auth:
            raise ValueError(
                "El usuario de Auth no tiene correo."
            )

        respuesta_enlace = (
            supabase.auth.admin.generate_link(
                {
                    "type": "magiclink",
                    "email": str(correo_auth),
                }
            )
        )

        token_hash = obtener_token_hash_enlace(
            respuesta_enlace,
        )

        if not token_hash:
            raise ValueError(
                "Supabase no devolvió token_hash."
            )

    except Exception as excepcion:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "El rostro fue verificado, pero "
                "no fue posible crear la sesión."
            ),
        ) from excepcion

    return LoginFacialRespuesta(
        autenticado=True,
        token_hash=token_hash,
        tipo_verificacion="email",
        mensaje=(
            "Identidad facial verificada."
        ),
    )
