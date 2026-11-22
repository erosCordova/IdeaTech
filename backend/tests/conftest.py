"""Configuración compartida de los tests.

Inyecta credenciales falsas ANTES de importar el paquete `app`,
porque `app.core.supabase_client` crea el cliente de Supabase en
importación y exige las variables de entorno. Ningún test hace
llamadas de red: se prueba solo lógica pura (NLP, predicción ML,
validaciones de seguridad).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "test-service-role-key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
