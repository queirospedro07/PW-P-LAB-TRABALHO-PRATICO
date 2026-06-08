export default function ConfirmModal({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', loading = false, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onCancel} disabled={loading} aria-label="Fechar">
            <span style={{ fontSize: '1rem' }}>&#x2715;</span>
          </button>
        </div>
        <p className="text-sm text-secondary">{message}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</button>
          <button className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'A processar...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
