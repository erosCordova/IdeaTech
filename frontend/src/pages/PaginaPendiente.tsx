import { Construction } from "lucide-react";

interface PaginaPendienteProps {
  titulo: string;
  descripcion: string;
}

export default function PaginaPendiente({
  titulo,
  descripcion,
}: PaginaPendienteProps) {
  return (
    <section className="ideatech-pagina-pendiente">
      <div>
        <Construction size={38} />
      </div>

      <p>Módulo IdeaTech</p>
      <h1>{titulo}</h1>
      <span>{descripcion}</span>
    </section>
  );
}