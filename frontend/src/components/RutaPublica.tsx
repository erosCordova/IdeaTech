import { UserPlus } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import Login from "../pages/Login";
import "../styles/Registro.css";

export default function RutaPublica() {
  const { cargando, estaAutenticado } = useAuth();

  if (cargando) {
    return null;
  }

  if (estaAutenticado) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Login />

      <Link
        to="/registro"
        className="registro-enlace-flotante"
      >
        <UserPlus size={18} />
        Solicitar registro
      </Link>
    </>
  );
}