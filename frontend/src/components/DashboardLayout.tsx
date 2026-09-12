import {
  Bell,
  CalendarDays,
  Menu,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  const { perfil } = useAuth();
  const ubicacion = useLocation();

  const [
    menuMovilAbierto,
    setMenuMovilAbierto,
  ] = useState(false);

  const fechaActual =
    new Intl.DateTimeFormat("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

  useEffect(() => {
    setMenuMovilAbierto(false);
  }, [ubicacion.pathname]);

  useEffect(() => {
    const manejarTecla = (
      evento: KeyboardEvent,
    ) => {
      if (
        evento.key === "Escape" &&
        menuMovilAbierto
      ) {
        setMenuMovilAbierto(false);
      }
    };

    document.addEventListener(
      "keydown",
      manejarTecla,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        manejarTecla,
      );
    };
  }, [menuMovilAbierto]);

  useEffect(() => {
    if (menuMovilAbierto) {
      document.body.classList.add(
        "ideatech-menu-bloqueado",
      );
    } else {
      document.body.classList.remove(
        "ideatech-menu-bloqueado",
      );
    }

    return () => {
      document.body.classList.remove(
        "ideatech-menu-bloqueado",
      );
    };
  }, [menuMovilAbierto]);

  const abrirMenu = () => {
    setMenuMovilAbierto(true);
  };

  const cerrarMenu = () => {
    setMenuMovilAbierto(false);
  };

  return (
    <div className="ideatech-layout">
      <Sidebar
        abierto={menuMovilAbierto}
        onCerrar={cerrarMenu}
      />

      {menuMovilAbierto && (
        <button
          type="button"
          className="ideatech-sidebar-fondo"
          onClick={cerrarMenu}
          aria-label="Cerrar menú lateral"
          tabIndex={-1}
        />
      )}

      <div className="ideatech-layout-principal">
        <header className="ideatech-header">
          <div className="ideatech-header-identidad">
            <button
              type="button"
              className="ideatech-menu-boton"
              onClick={abrirMenu}
              aria-label="Abrir menú principal"
              aria-controls="ideatech-menu-principal"
              aria-expanded={menuMovilAbierto}
            >
              <Menu size={22} />
            </button>

            <div>
              <p>Panel empresarial</p>

              <h2>
                Hola,{" "}
                {perfil?.nombre_completo
                  ?.trim()
                  .split(/\s+/)[0] ||
                  "usuario"}
              </h2>
            </div>
          </div>

          <div className="ideatech-header-acciones">
            <div className="ideatech-header-fecha">
              <CalendarDays size={18} />
              <span>{fechaActual}</span>
            </div>

            <Link
              to="/notificaciones"
              className="ideatech-header-notificaciones"
              aria-label="Abrir notificaciones"
              title="Notificaciones"
            >
              <Bell size={20} />
            </Link>
          </div>
        </header>

        <main className="ideatech-contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}