import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn-icon" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Anterior">
        <FiChevronLeft size={18} />
      </button>
      <div className="pagination-pages">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`pagination-page ${p === page ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
      </div>
      <button className="btn-icon" disabled={page === totalPages} onClick={() => onChange(page + 1)} aria-label="Seguinte">
        <FiChevronRight size={18} />
      </button>
    </div>
  );
}
