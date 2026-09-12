from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    nombre_aplicacion: str = "IdeaTech API"
    version: str = "1.0.0"
    entorno: str = "desarrollo"

    supabase_url: str
    supabase_secret_key: str

    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def obtener_configuracion() -> Configuracion:
    return Configuracion()