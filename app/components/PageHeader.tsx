/**
 * Standard page header: title (with optional muted count), optional one-line
 * subtitle, and a right-aligned actions slot. Server-component safe.
 */
export default function PageHeader({
  title,
  count,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  count?: number;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h1>
          {title}
          {count != null && <span className="page-header-count">({count.toLocaleString()})</span>}
        </h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
