import { UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import Login from "../pages/Login";

import "../styles/Registro.css";

export default function RutaPublica() {
  const { estaAutenticado } = useAuth();

  return (
    <>
      <Login />

      {!estaAutenticado && (
        <Link
          to="/registro"
          className="registro-enlace-flotante"
        >
          <UserPlus size={18} />
          Solicitar registro
        </Link>
      )}
    </>
  );
}