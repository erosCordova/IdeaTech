import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Code2,
  Database,
  Headphones,
  Lightbulb,
  LineChart,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import {
  Link,
  Navigate,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

import "../styles/Presentacion.css";

const servicios = [
  {
    titulo: "Inteligencia artificial",
    descripcion:
      "Desarrollamos soluciones que convierten los datos en información útil para tomar mejores decisiones.",
    icono: BrainCircuit,
    clase: "morado",
  },
  {
    titulo: "Analítica de datos",
    descripcion:
      "Creamos indicadores y modelos que permiten comprender el comportamiento de clientes y empresas.",
    icono: LineChart,
    clase: "azul",
  },
  {
    titulo: "Soluciones en la nube",
    descripcion:
      "Implementamos plataformas seguras, accesibles y preparadas para crecer junto con tu organización.",
    icono: Cloud,
    clase: "celeste",
  },
  {
    titulo: "Desarrollo de software",
    descripcion:
      "Construimos aplicaciones empresariales modernas adaptadas a las necesidades de cada negocio.",
    icono: Code2,
    clase: "naranja",
  },
  {
    titulo: "Gestión de información",
    descripcion:
      "Centralizamos y organizamos la información para facilitar su consulta, control y seguimiento.",
    icono: Database,
    clase: "verde",
  },
  {
    titulo: "Soporte especializado",
    descripcion:
      "Acompañamos a nuestros clientes durante la implementación y el uso de nuestras soluciones.",
    icono: Headphones,
    clase: "rojo",
  },
];

export default function Presentacion() {
  const {
    cargando,
    estaAutenticado,
  } = useAuth();

  if (cargando) {
    return (
      <main className="ideatech-presentacion-carga">
        <LoaderCircle
          className="girando"
          size={42}
        />

        <p>Cargando IdeaTech...</p>
      </main>
    );
  }

  if (estaAutenticado) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="ideatech-presentacion">
      <header className="ideatech-presentacion-header">
        <Link
          to="/presentacion"
          className="ideatech-presentacion-marca"
        >
          <span className="ideatech-presentacion-logo">
            <BrainCircuit size={29} />
          </span>

          <span>
            <strong>IdeaTech</strong>
            <small>Empresa Inteligente</small>
          </span>
        </Link>

        <nav className="ideatech-presentacion-navegacion">
          <a href="#servicios">
            Servicios
          </a>

          <a href="#nosotros">
            Nosotros
          </a>

          <Link
            to="/login"
            className="ideatech-presentacion-ingresar"
          >
            <LockKeyhole size={17} />
            Iniciar sesión
          </Link>
        </nav>
      </header>

      <section className="ideatech-presentacion-hero">
        <div className="ideatech-presentacion-hero-contenido">
          <p className="ideatech-presentacion-etiqueta">
            <Sparkles size={16} />
            Tecnología para empresas
          </p>

          <h1>
            Innovación que impulsa
            <span> decisiones inteligentes</span>
          </h1>

          <p className="ideatech-presentacion-descripcion">
            En IdeaTech desarrollamos soluciones
            empresariales basadas en datos,
            inteligencia artificial y tecnología
            en la nube para ayudar a las
            organizaciones a crecer.
          </p>

          <div className="ideatech-presentacion-acciones">
            <Link
              to="/login"
              className="ideatech-presentacion-boton-principal"
            >
              Iniciar sesión
              <ArrowRight size={19} />
            </Link>

            <Link
              to="/registro"
              className="ideatech-presentacion-boton-secundario"
            >
              Solicitar acceso
            </Link>
          </div>

          <div className="ideatech-presentacion-beneficios">
            <span>
              <CheckCircle2 size={17} />
              Soluciones modernas
            </span>

            <span>
              <CheckCircle2 size={17} />
              Información segura
            </span>

            <span>
              <CheckCircle2 size={17} />
              Decisiones basadas en datos
            </span>
          </div>
        </div>

        <div className="ideatech-presentacion-visual">
          <div className="ideatech-presentacion-panel">
            <div className="ideatech-presentacion-panel-cabecera">
              <div>
                <span />
                <span />
                <span />
              </div>

              <small>
                Innovación empresarial
              </small>
            </div>

            <div className="ideatech-presentacion-panel-contenido">
              <div className="ideatech-presentacion-panel-titulo">
                <div>
                  <small>
                    TECNOLOGÍA E INFORMACIÓN
                  </small>

                  <strong>
                    Crecimiento inteligente
                  </strong>
                </div>

                <TrendingUp size={23} />
              </div>

              <div className="ideatech-presentacion-indicadores">
                <article>
                  <span className="azul">
                    <Database size={21} />
                  </span>

                  <div>
                    <small>Información</small>
                    <strong>Datos</strong>
                  </div>
                </article>

                <article>
                  <span className="morado">
                    <BrainCircuit size={21} />
                  </span>

                  <div>
                    <small>Innovación</small>
                    <strong>IA</strong>
                  </div>
                </article>

                <article>
                  <span className="verde">
                    <Cloud size={21} />
                  </span>

                  <div>
                    <small>Tecnología</small>
                    <strong>Nube</strong>
                  </div>
                </article>
              </div>

              <div className="ideatech-presentacion-grafico">
                <div>
                  <span style={{ height: "40%" }} />
                  <span style={{ height: "52%" }} />
                  <span style={{ height: "47%" }} />
                  <span style={{ height: "64%" }} />
                  <span style={{ height: "72%" }} />
                  <span style={{ height: "81%" }} />
                  <span style={{ height: "94%" }} />
                </div>

                <p>
                  Tecnología orientada al
                  crecimiento empresarial
                </p>
              </div>
            </div>
          </div>

          <div className="ideatech-presentacion-tarjeta-flotante">
            <span>
              <Lightbulb size={21} />
            </span>

            <div>
              <strong>
                Ideas que generan valor
              </strong>

              <small>
                Innovación y crecimiento
              </small>
            </div>
          </div>
        </div>
      </section>

      <section
        id="servicios"
        className="ideatech-presentacion-seccion"
      >
        <div className="ideatech-presentacion-seccion-titulo">
          <p>Nuestras soluciones</p>

          <h2>
            Tecnología diseñada para las
            necesidades de cada empresa
          </h2>

          <span>
            Combinamos desarrollo de software,
            información e inteligencia artificial
            para crear soluciones útiles y
            confiables.
          </span>
        </div>

        <div className="ideatech-presentacion-funciones">
          {servicios.map((servicio) => {
            const Icono = servicio.icono;

            return (
              <article key={servicio.titulo}>
                <div
                  className={
                    "ideatech-presentacion-funcion-icono " +
                    servicio.clase
                  }
                >
                  <Icono size={24} />
                </div>

                <h3>{servicio.titulo}</h3>

                <p>{servicio.descripcion}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="nosotros"
        className="ideatech-presentacion-seguridad"
      >
        <div className="ideatech-presentacion-seguridad-icono">
          <ShieldCheck size={46} />
        </div>

        <div>
          <p>Sobre IdeaTech</p>

          <h2>
            Tecnología confiable para construir
            mejores empresas
          </h2>

          <span>
            Nuestro objetivo es ayudar a las
            organizaciones a aprovechar su
            información, optimizar sus procesos y
            anticiparse a nuevos desafíos mediante
            soluciones seguras y fáciles de usar.
          </span>
        </div>

        <Link
          to="/login"
          className="ideatech-presentacion-seguridad-boton"
        >
          Acceder a IdeaTech
          <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="ideatech-presentacion-footer">
        <div className="ideatech-presentacion-marca">
          <span className="ideatech-presentacion-logo">
            <BrainCircuit size={25} />
          </span>

          <span>
            <strong>IdeaTech</strong>
            <small>Empresa Inteligente</small>
          </span>
        </div>

        <p>
          Tecnología, innovación y datos para
          impulsar el crecimiento empresarial.
        </p>
      </footer>
    </main>
  );
}