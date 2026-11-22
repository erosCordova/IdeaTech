# IdeaTech — Frontend (React + Vite + TypeScript)

SPA del panel de gestión: clientes, suscripciones, tickets, comentarios con
análisis NLP, predicciones de cancelación ML, reportes PDF, auditoría y
acceso por reconocimiento facial.

## Comandos

```bash
npm ci              # instalar dependencias (lockfile)
npm run dev          # servidor de desarrollo en http://localhost:5173
npm run lint         # oxlint (reglas react + typescript; ignora public/)
npm run typecheck    # tsc -b sin emitir
npm run build        # tsc -b && vite build → dist/
npm run preview      # servir dist/ localmente
```

## Variables de entorno

Copia `.env.example` a `.env`:

| Variable | Descripción |
| --- | --- |
| `VITE_SUPABASE_URL` | URL pública del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave *publishable* (nunca la secret) |
| `VITE_API_URL` | URL del backend FastAPI (`http://127.0.0.1:8000` en local; en Render, el dominio público) |

Las tres son obligatorias: `src/lib/supabase.ts` falla al arrancar si
faltan las dos primeras y los servicios de API usan `VITE_API_URL`.

## Estructura relevante

- `src/App.tsx` — rutas perezosas (`lazy`) con guardas:
  `RutaProtegida` (sesión) y `RutaPorRol` (permisos por rol).
- `src/contexts/AuthContext.tsx` — sesión de Supabase, carga del perfil y
  refresco ante cambios de autenticación. Si la cuenta está inactiva o su
  solicitud no fue aprobada, `RutaProtegida` muestra la pantalla
  «Cuenta no habilitada» y `RutaPorRol` bloquea los módulos sin permiso.
- `src/services/` — una capa por módulo; combinan consultas directas a
  Supabase (RLS) con llamadas `fetch` al backend FastAPI (NLP, ML, facial).
- `src/types/database.ts` — tipos del esquema; mantenlos al día si cambias
  tablas en Supabase.
- `public/mediapipe/` y `public/models/` — runtime WASM y modelo de
  detección facial (vendorizados a propósito; excluidos del lint).

## Convenciones

- TypeScript en modo `strict`; el build falla si hay errores de tipos.
- Todo el texto de interfaz está en español, igual que los identificadores.
- Estilos CSS por módulo en `src/styles/` (sin framework CSS).

## Despliegue en Vercel

Framework **Vite**, root **frontend**. El rewrite SPA de `vercel.json`
sirve `index.html` para las rutas del router. Define las tres `VITE_*` en
el dashboard; no hace falta ninguna clave de Supabase del lado servidor.
