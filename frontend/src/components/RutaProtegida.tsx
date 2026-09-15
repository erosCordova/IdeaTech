import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

interface RutaProtegidaProps {
  children: ReactNode;
}

export default function RutaProtegida({
  children,
}: RutaProtegidaProps) {
  const {
    cargando,
    estaAutenticado,
    perfil,
  } = useAuth();

  if (cargando) {
    return (
      <main className="ruta-cargando">
        <LoaderCircle
          className="girando"
          size={40}
        />

        <p>Preparando IdeaTech...</p>
      </main>
    );
  }

  if (!estaAutenticado) {
    return (
      <Navigate
        to="/presentacion"
        replace
      />
    );
  }

  if (!perfil) {
    return (
      <main className="ruta-cargando">
        <h1>Perfil no disponible</h1>

        <p>
          No se pudo cargar la información de tu
          cuenta. Recarga la página o comunícate
          con el administrador.
        </p>
      </main>
    );
  }

  if (!perfil.activo) {
    return (
      <main className="ruta-cargando">
        <h1>Cuenta inactiva</h1>

        <p>
          Comunícate con el administrador del
          sistema.
        </p>
      </main>
    );
  }

  return children;
}