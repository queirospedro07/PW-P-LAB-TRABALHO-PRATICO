import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiHome } from 'react-icons/fi';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <FiAlertTriangle size={48} className="notfound-icon" />
        <h1>404</h1>
        <p className="notfound-text">A página que procuras não existe ou foi movida.</p>
        <Link to="/" className="btn btn-primary">
          <FiHome size={14} /> Voltar ao início
        </Link>
      </div>
    </div>
  );
}
