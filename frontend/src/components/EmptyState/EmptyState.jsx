export default function EmptyState({ icon: Icon, title, subtitle, action, onAction }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-icon"><Icon size={32} /></div>}
      <h3>{title}</h3>
      {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
      {action && onAction && (
        <button className="btn btn-primary mt-3" onClick={onAction}>{action}</button>
      )}
    </div>
  );
}
