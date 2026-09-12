import type { ReactNode } from "react";
import {
  Navigate,
  useLocation,
} from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";

import type { RolUsuario } from "../types/database";

interface RutaPorRolProps {
  children: ReactNode;
  rolesPermitidos: RolUsuario[];
}

export default function RutaPorRol({
  children,
  rolesPermitidos,
}: RutaPorRolProps) {
  const {
    cargando,
    estaAutenticado,
    perfil,
  } = useAuth();

  const ubicacion = useLocation();

  if (cargando) {
    return (
      <main className="ruta-cargando">
        <LoaderCircle
          className="girando"
          size={40}
        />

        <p>Verificando permisos...</p>
      </main>
    );
  }

  if (!estaAutenticado) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          desde: ubicacion.pathname,
        }}
      />
    );
  }

  if (!perfil?.activo) {
    return (
      <main className="ruta-cargando">
        <h1>Cuenta inactiva</h1>

        <p>
          Comunícate con el administrador del sistema.
        </p>
      </main>
    );
  }

  if (!rolesPermitidos.includes(perfil.rol)) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          accesoDenegado: true,
        }}
      />
    );
  }

  return children;
}