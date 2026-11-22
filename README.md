# IdeaTech — Plataforma de gestión de clientes con IA

Aplicación full-stack para la gestión de clientes, suscripciones y soporte,
con tres capacidades diferenciales:

1. **Predicción de cancelación (ML).** Un Random Forest entrenado en
   `backend/` estima la probabilidad de que un cliente cancele y clasifica
   su riesgo en bajo / medio / alto. Cada predicción queda registrada.
2. **Análisis de comentarios (NLP).** Un motor de léxico en español
   clasifica cada comentario por sentimiento, polaridad y categoría
   (soporte, facturación, plataforma, rendimiento, servicio).
3. **Acceso por reconocimiento facial.** Registro y login facial con
   MediaPipe en el navegador y `face_recognition` (dlib) en el servidor,
   integrado con la autenticación de Supabase mediante tokens de un solo uso.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + TypeScript (strict) + Vite, React Router, Recharts, lucide-react, exportación PDF con jsPDF + html2canvas |
| Backend | FastAPI + Pydantic v2, scikit-learn, pandas, NLTK-free (léxico propio), face_recognition + OpenCV headless |
| Datos y auth | Supabase (PostgreSQL, Auth con roles, RLS) |
| Despliegue | Vercel (frontend) · Render (backend) |

## Estructura del repositorio

```
.
├── backend/
│   ├── app/
│   │   ├── main.py                  # instancia FastAPI, CORS, routers
│   │   ├── core/                    # config, seguridad (JWT/roles), cliente Supabase
│   │   ├── routers/                 # comentarios (NLP), predicciones (ML), facial
│   │   └── services/                # nlp_service, prediccion_service
│   ├── datos/                       # dataset de entrenamiento (CSV)
│   ├── modelos/                     # pipeline .joblib + métricas .json
│   ├── scripts/entrenar_modelo.py   # reentrena y revalida el modelo
│   ├── tests/                       # pytest (30 tests, sin necesidad de red)
│   └── requirements*.txt            # producción, facial y desarrollo
└── frontend/
    ├── src/
    │   ├── pages/                   # 18 módulos (Inicio, Clientes, Tickets…)
    │   ├── components/              # layout, guardas de ruta por rol
    │   ├── contexts/AuthContext.tsx # sesión, perfil y refresco de Supabase
    │   ├── services/                # acceso a Supabase y a la API FastAPI
    │   ├── styles/                  # CSS por módulo
    │   └── types/database.ts        # tipos del esquema de Supabase
    └── public/mediapipe/            # runtime WASM del detector facial
```

## Puesta en marcha local

### Requisitos

- Python **3.12+** (se recomienda 3.13, ver `backend/.python-version`)
- Node.js **22+**
- Un proyecto de Supabase con las tablas `perfiles`, `clientes`,
  `comentarios`, `predicciones`, `tickets`, etc.

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate

# dlib-bin provee el módulo compilado; face_recognition se instala después
# con --no-deps para no compilar dlib desde el fuente.
pip install -r requirements.txt
pip install --no-deps -r requirements-facial.txt
pip install -r requirements-dev.txt        # solo para tests/lint

cp .env.example .env                       # y completa las claves
uvicorn app.main:app --reload
```

- Docs interactivas: `http://127.0.0.1:8000/docs`
- Salud: `GET /api/v1/salud` · estado de Supabase: `GET /api/v1/supabase/status`

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env       # con VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
                           #  y VITE_API_URL (http://127.0.0.1:8000 en local)
npm run dev                # http://localhost:5173
```

Scripts útiles: `npm run lint`, `npm run typecheck`, `npm run build`.

### Tests y lint del backend

```bash
cd backend
ruff check .    # estilo y errores estáticos
pytest          # 30 tests de NLP, ML y seguridad (funcionan sin red)
```

## Modelo de machine learning

- **Qué predice:** probabilidad de que un cliente activo cancele el servicio.
- **Entrenamiento:** `python scripts/entrenar_modelo.py` sobre
  `datos/clientes_entrenamiento_1000.csv` (1 000 registros; 80/20 train/test).
- **Artefactos:** `modelos/modelo_cancelacion.joblib` (pipeline
  ColumnTransformer + OneHotEncoder + RandomForest) y
  `modelos/metricas_modelo.json`.
- **Métricas actuales (test):** exactitud 0.88 · ROC-AUC 0.926.
- **Umbrales de riesgo:** < 0.35 bajo · < 0.70 medio · ≥ 0.70 alto.
- Los campos obligatorios para poder predecir se validan en
  `POST /api/v1/predicciones/cliente/{id}` y el resultado se audita en la
  tabla `predicciones`.

## Reconocimiento facial

1. El navegador detecta y recorta el rostro con **MediaPipe**
   (`public/models/blaze_face_short_range.tflite`).
2. La imagen viaja en base64 al backend, que genera un vector de 128
   dimensiones con **face_recognition/dlib** y lo compara con los patrones
   almacenados en `usuarios_rostros` (distancia euclidiana, umbral 0.82).
3. Para el login (`POST /api/v1/facial/login`) el servidor **no devuelve
   datos personales**: si el rostro coincide y la cuenta está activa y
   aprobada, emite un `token_hash` de un solo uso vía la API admin de
   Supabase, que el frontend canjea con `supabase.auth.verifyOtp`.

## Roles y rutas

| Rol | Alcance |
| --- | --- |
| `administrador` | Todo: usuarios, solicitudes de registro, auditoría, facial, predicciones, reportes |
| `analista` | Clientes, comentarios, predicciones, reportes, tickets |
| `operador` | Clientes y tickets |
| `cliente` | Mi empresa, tickets, sus propios comentarios |

El registro nuevo queda en estado `pendiente` hasta que un administrador lo
aprueba en **Solicitudes de acceso**; el backend rechaza tokens de cuentas
no aprobadas o inactivas en cada petición.

## Despliegue

- **Frontend → Vercel:** el proyecto apunta a `frontend/`; las variables
  `VITE_*` se configuran en el dashboard. El rewrite de SPA ya está en
  `vercel.json`.
- **Backend → Render:** servicio web con root `backend/`, build:
  `pip install -r requirements.txt && pip install --no-deps -r requirements-facial.txt`,
  start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, y las variables
  `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FRONTEND_URL` (origen CORS de
  Vercel).

## Seguridad

- La `secret`/`service_role` key de Supabase solo vive en el backend
  (`.env`, nunca en el repo). El frontend usa la *publishable key*.
- Todos los endpoints salvo `GET /`, `/api/v1/salud`,
  `/api/v1/supabase/status` y `POST /api/v1/facial/login` validan el token
  Bearer contra Supabase, el perfil, el estado de la cuenta y el rol. El
  login facial es público por necesidad (quien inicia sesión aún no tiene
  token), pero no revela datos personales: solo emite un token de un solo
  uso y las respuestas son genéricas para no delinear estados de cuenta.
- `vercel.json`/`render.yaml` no exponen secretos; `.env*` está gitignored.

## CI

`.github/workflows/ci.yml` ejecuta en cada push/PR: lint + typecheck +
build del frontend, y `ruff` + `pytest` del backend.
