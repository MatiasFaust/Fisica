import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="board-message">
      <div className="board-message__card">
        <span className="board-message__icon">
          <Compass size={28} />
        </span>
        <h1>Página no encontrada</h1>
        <p>La dirección no existe o fue movida.</p>
        <Link to="/" className="btn btn--primary">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
