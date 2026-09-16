import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  ClipboardList,
  Database,
  FileText,
  Headphones,
  Home,
  LogOut,
  MessageSquareText,
  ScanFace,
  ShieldCheck,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

import type {
  RolUsuario,
} from "../types/database";

interface SidebarProps {
  abierto: boolean;
  onCerrar: () => void;
}

interface EnlaceMenu {
  ruta: string;
  nombre: string;
  icono: typeof Home;
  roles?: RolUsuario[];
}

const enlaces: EnlaceMenu[] = [
  {
    ruta: "/",
    nombre: "Inicio",
    icono: Home,
  },
  {
    ruta: "/mi-empresa",
    nombre: "Mi empresa",
    icono: Building2,
    roles: ["cliente"],
  },
  {
    ruta: "/clientes",
    nombre: "Clientes",
    icono: Users,
    roles: [
      "administrador",
      "analista",
      "operador",
    ],
  },
  {
    ruta: "/comentarios",
    nombre: "Comentarios",
    icono: MessageSquareText,
    roles: [
      "administrador",
      "analista",
      "operador",
      "cliente",
    ],
  },
  {
    ruta: "/tickets",
    nombre: "Tickets de soporte",
    icono: Headphones,
    roles: [
      "administrador",
      "analista",
      "operador",
      "cliente",
    ],
  },
  {
    ruta: "/solicitudes-acceso",
    nombre: "Solicitudes de acceso",
    icono: ClipboardList,
    roles: ["administrador"],
  },
  {
    ruta: "/predicciones",
    nombre: "Predicciones",
    icono: BrainCircuit,
    roles: [
      "administrador",
      "analista",
    ],
  },
  {
    ruta: "/documentos",
    nombre: "Documentos",
    icono: FileText,
    roles: [
      "administrador",
      "analista",
      "operador",
      "cliente",
    ],
  },
  {
    ruta: "/reportes",
    nombre: "Reportes",
    icono: BarChart3,
    roles: [
      "administrador",
      "analista",
    ],
  },
  {
    ruta: "/usuarios",
    nombre: "Usuarios",
    icono: ShieldCheck,
    roles: ["administrador"],
  },

  /* =====================================================
     RECONOCIMIENTO FACIAL
  ===================================================== */

  {
    ruta: "/registro-facial",
    nombre: "Registro Facial",
    icono: ScanFace,
    roles: ["administrador"],
  },
  {
    ruta: "/prueba-facial",
    nombre: "Prueba Facial",
    icono: UserRoundCheck,
    roles: ["administrador"],
  },

  {
    ruta: "/auditoria",
    nombre: "Auditoría",
    icono: Database,
    roles: ["administrador"],
  },
  {
    ruta: "/notificaciones",
    nombre: "Notificaciones",
    icono: Bell,
    roles: [
      "administrador",
      "analista",
      "operador",
      "cliente",
    ],
  },
];

export default function Sidebar({
  abierto,
  onCerrar,
}: SidebarProps) {
  const {
    perfil,
    cerrarSesion,
  } = useAuth();

  const enlacesPermitidos =
    enlaces.filter((enlace) => {
      if (!enlace.roles) {
        return true;
      }

      return perfil?.rol
        ? enlace.roles.includes(perfil.rol)
        : false;
    });

  const manejarCierreSesion =
    async () => {
      onCerrar();
      await cerrarSesion();
    };

  return (
    <aside
      id="ideatech-menu-principal"
      className={
        abierto
          ? "ideatech-sidebar abierto"
          : "ideatech-sidebar"
      }
      aria-label="Menú principal"
    >
      <div className="ideatech-sidebar-marca">
        <div className="ideatech-sidebar-logo">
          <BrainCircuit size={29} />
        </div>

        <div>
          <strong>IdeaTech</strong>
          <span>Empresa Inteligente</span>
        </div>

        <button
          type="button"
          className="ideatech-sidebar-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar menú principal"
          title="Cerrar menú"
        >
          <X size={21} />
        </button>
      </div>

      <nav className="ideatech-sidebar-menu">
        <p className="ideatech-sidebar-seccion">
          Menú principal
        </p>

        {enlacesPermitidos.map((enlace) => {
          const Icono = enlace.icono;

          return (
            <NavLink
              key={enlace.ruta}
              to={enlace.ruta}
              end={enlace.ruta === "/"}
              onClick={onCerrar}
              className={({ isActive }) =>
                isActive
                  ? "ideatech-menu-enlace activo"
                  : "ideatech-menu-enlace"
              }
            >
              <Icono size={20} />
              <span>{enlace.nombre}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="ideatech-sidebar-usuario">
        <div className="ideatech-usuario-avatar">
          {perfil?.nombre_completo
            ?.charAt(0)
            .toUpperCase() || "U"}
        </div>

        <div className="ideatech-usuario-informacion">
          <strong>
            {perfil?.nombre_completo ||
              "Usuario"}
          </strong>

          <span>
            {perfil?.rol || "Sin rol"}
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            void manejarCierreSesion()
          }
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut size={19} />
        </button>
      </div>
    </aside>
  );
}