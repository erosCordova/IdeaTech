from supabase import Client, create_client

from app.core.config import obtener_configuracion


configuracion = obtener_configuracion()


def crear_cliente_supabase() -> Client:
    return create_client(
        configuracion.supabase_url,
        configuracion.supabase_secret_key,
    )


supabase: Client = crear_cliente_supabase()