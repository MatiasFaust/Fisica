import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Ubicación">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={item.to ?? item.label} className="breadcrumbs__item">
            {last || !item.to ? <span aria-current={last ? 'page' : undefined}>{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
            {!last && <ChevronRight size={14} />}
          </span>
        );
      })}
    </nav>
  );
}
