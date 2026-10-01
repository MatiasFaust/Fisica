export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state__icon">
          <Icon size={26} />
        </div>
      )}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
