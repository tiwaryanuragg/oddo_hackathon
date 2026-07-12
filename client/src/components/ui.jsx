import { statusColor } from '../lib/constants.js';

export function Pill({ children, color }) {
  const cls = color || statusColor(children);
  return <span className={`pill ${cls}`}>{children}</span>;
}

export function Notice({ error, ok }) {
  if (error) return <div className="notice error">{error}</div>;
  if (ok) return <div className="notice ok">{ok}</div>;
  return null;
}

export function Empty({ children = 'Nothing here yet.' }) {
  return <div className="empty">{children}</div>;
}

export function Loading({ children = 'Loading…' }) {
  return <div className="center-load">{children}</div>;
}

export function Card({ title, action, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="row-between" style={{ marginBottom: 12 }}>
          {title && <h2 className="section-title" style={{ margin: 0 }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="btn-row">{children}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}