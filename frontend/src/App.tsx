import {
  lazy,
  Suspense,
} from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { LoaderCircle } from "lucide-react";

import DashboardLayout from "./components/DashboardLayout";
import RutaPorRol from "./components/RutaPorRol";
import RutaProtegida from "./components/RutaProtegida";
import RutaPublica from "./components/RutaPublica";

import "./styles/Layout.css";

const Auditoria = lazy(
  () => import("./pages/Auditoria"),
);

const Clientes = lazy(
  () => import("./pages/Clientes"),
);

const Comentarios = lazy(
  () => import("./pages/Comentarios"),
);

const Documentos = lazy(
  () => import("./pages/Documentos"),
);

const Inicio = lazy(
  () => import("./pages/Inicio"),
);

const MiEmpresa = lazy(
  () => import("./pages/MiEmpresa"),
);

const Notificaciones = lazy(
  () => import("./pages/Notificaciones"),
);

const Predicciones = lazy(
  () => import("./pages/Predicciones"),
);

const Registro = lazy(
  () => import("./pages/Registro"),
);

const Reportes = lazy(
  () => import("./pages/Reportes"),
);

const RestablecerPassword = lazy(
  () =>
    import(
      "./pages/RestablecerPassword"
    ),
);

const SolicitudesRegistro = lazy(
  () =>
    import(
      "./pages/SolicitudesRegistro"
    ),
);

const Tickets = lazy(
  () => import("./pages/Tickets"),
);

const Usuarios = lazy(
  () => import("./pages/Usuarios"),
);

function CargandoPagina() {
  return (
    <main className="ruta-cargando">
      <LoaderCircle
        className="girando"
        size={40}
      />

      <p>
        Cargando módulo de IdeaTech...
      </p>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<CargandoPagina />}>
        <Routes>
          <Route
            path="/login"
            element={<RutaPublica />}
          />

          <Route
            path="/registro"
            element={<Registro />}
          />

          <Route
            path="/restablecer-password"
            element={<RestablecerPassword />}
          />

          <Route
            path="/"
            element={
              <RutaProtegida>
                <DashboardLayout />
              </RutaProtegida>
            }
          >
            <Route
              index
              element={<Inicio />}
            />

            <Route
              path="mi-empresa"
              element={
                <RutaPorRol
                  rolesPermitidos={[
                    "cliente",
                  ]}
                >
                  <MiEmpresa />
                </RutaPorRol>
              }
            />

            <Route
              path="clientes"
              element={
                <RutaPorRol
                  rolesPermitidos={[
                    "administrador",
                    "analista",
                    "operador",
                  ]}
                >
                  <Clientes />
                </RutaPorRol>
              }
            />

            <Route
              path="comentarios"
              element={<Comentarios />}
            />

            <Route
              path="tickets"
              element={
                <RutaPorRol
                  rolesPermitidos={[
                    "administrador",
                    "analista",
                    "operador",
                    "cliente",
                  ]}
                >
                  <Tickets />
                </RutaPorRol>
              }
            />

            <Route
              path="solicitudes-acceso"
              element={
                <RutaPorRol
                  rolesPermitidos={[
                    "administrador",
                  ]}
                >
                  <SolicitudesRegistro />
                </RutaPorRol>
              }
            />

            <Route
              path="solicitudes"
              element={
                <Navigate
                  to="/solicitudes-acceso"
                  replace
                />
              }
            />

            <Route
              path="predicciones"
              element={
                <RutaPorRol
                  rolesPermitidos={[
                    "administrador",
                    "analista",
                  ]}
                >
                  <Predicciones />
                </RutaPorRol>
              }
            />

            <Route
              path="documentos"
              element={<Documentos />}
            />

            <Route
              path="reportes"
              element={
                <RutaPorRol
                  rolesPermitidos={[
                    "administrador",
                    "analista",
                  ]}
                >
                  <Reportes />
                </RutaPorRol>
              }
            />

            <Route
              path="usuarios"
              element={
                <RutaPorRol
                  rolesPermitidos={[
                    "administrador",
                  ]}
                >
                  <Usuarios />
                </RutaPorRol>
              }
            />

            <Route
              path="auditoria"
              element={
                <RutaPorRol
                  rolesPermitidos={[
                    "administrador",
                  ]}
                >
                  <Auditoria />
                </RutaPorRol>
              }
            />

            <Route
              path="notificaciones"
              element={<Notificaciones />}
            />
          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}