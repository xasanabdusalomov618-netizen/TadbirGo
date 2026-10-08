import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Inbox, Star, Plus, Minus, X, ChevronLeft, ChevronRight, AlertCircle,
  CheckCircle2, XCircle, Clock, PackageCheck, Sparkles, Truck, Wrench, PartyPopper,
} from 'lucide-react';

/* ------------------------------------------------------------------ loader */
export function Loader({ label }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Loader2 className="animate-spin" size={30} style={{ color: 'var(--accent)' }} />
      <p className="text-sm font-medium">{label || t('common.loading')}</p>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="soft space-y-3 p-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/* -------------------------------------------------------------------- empty */
export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="soft flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="soft-icon !h-16 !w-16" style={{ color: 'var(--accent)' }}>
        <Icon size={26} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ titles */
export function SectionTitle({ title, subtitle, action, center }) {
  return (
    <div className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${center ? 'sm:flex-col sm:items-center sm:text-center' : ''}`}>
      <div>
        <h2 className="text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------- stars */
export function Rating({ value = 0, count, size = 14, showValue = true }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            strokeWidth={2.2}
            style={{
              color: i <= Math.round(value) ? 'var(--warn)' : 'var(--line)',
              fill: i <= Math.round(value) ? 'var(--warn)' : 'transparent',
            }}
          />
        ))}
      </span>
      {showValue && <span className="text-xs font-semibold text-muted">{Number(value || 0).toFixed(1)}</span>}
      {count !== undefined && <span className="text-xs text-muted">({count})</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ status */
const STATUS_STYLE = {
  yangi: { color: 'var(--accent)', icon: Sparkles, bg: 'var(--accent-soft)' },
  pending: { color: 'var(--warn)', icon: Clock, bg: 'color-mix(in srgb, var(--warn) 16%, transparent)' },
  confirmed: { color: 'var(--ok)', icon: CheckCircle2, bg: 'color-mix(in srgb, var(--ok) 16%, transparent)' },
  preparing: { color: '#0ea5e9', icon: PackageCheck, bg: 'rgba(14,165,233,.14)' },
  delivering: { color: '#8b5cf6', icon: Truck, bg: 'rgba(139,92,246,.14)' },
  installing: { color: '#f59e0b', icon: Wrench, bg: 'rgba(245,158,11,.16)' },
  ongoing: { color: '#ec4899', icon: PartyPopper, bg: 'rgba(236,72,153,.14)' },
  completed: { color: 'var(--ok)', icon: CheckCircle2, bg: 'color-mix(in srgb, var(--ok) 16%, transparent)' },
  cancelled: { color: 'var(--danger)', icon: XCircle, bg: 'color-mix(in srgb, var(--danger) 14%, transparent)' },
};

export function StatusBadge({ status, size = 'md' }) {
  const { t } = useTranslation();
  const style = STATUS_STYLE[status] || STATUS_STYLE.yangi;
  const Icon = style.icon;
  return (
    <span
      className={`soft-badge ${size === 'sm' ? 'text-[10px]' : 'text-[11px]'}`}
      style={{ background: style.bg, color: style.color }}
    >
      <Icon size={size === 'sm' ? 11 : 13} strokeWidth={2.4} />
      {t(`status.${status}`, status)}
    </span>
  );
}

export function statusColor(status) {
  return STATUS_STYLE[status]?.color || 'var(--accent)';
}

/* -------------------------------------------------------------------- stat */
export function StatCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="soft flex items-start gap-4 p-5">
      <div
        className="soft-icon shrink-0"
        style={{ color: accent || 'var(--accent)', background: 'var(--surface)' }}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-1 truncate text-2xl font-extrabold">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- stepper */
export function QtyStepper({ value, onChange, min = 1, max = 9999, size = 'md' }) {
  const btn = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div className="soft-inset-sm inline-flex items-center gap-1 p-1">
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-lg text-muted transition hover:text-accent disabled:opacity-40`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="minus"
      >
        <Minus size={size === 'sm' ? 13 : 15} />
      </button>
      <span className={`${size === 'sm' ? 'w-7 text-xs' : 'w-9 text-sm'} text-center font-bold`}>{value}</span>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-lg text-muted transition hover:text-accent disabled:opacity-40`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="plus"
      >
        <Plus size={size === 'sm' ? 13 : 15} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ chips */
export function Chip({ active, children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`soft-chip whitespace-nowrap ${active ? 'soft-chip-active' : 'hover:text-accent'} ${className}`}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- modal */
export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className={`soft-lg relative w-full ${maxWidth} animate-fade-up overflow-hidden rounded-b-none sm:rounded-soft-lg`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="soft-icon !h-9 !w-9 text-muted hover:text-ink" aria-label="close">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex gap-3 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- pagination */
export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        className="soft-btn !px-3 !py-2"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
        const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
        if (p < 1 || p > pages) return null;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-10 w-10 rounded-2xl text-sm font-bold transition ${
              p === page ? 'text-white' : 'text-muted hover:text-accent'
            }`}
            style={p === page ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' } : undefined}
          >
            {p}
          </button>
        );
      })}
      <button
        className="soft-btn !px-3 !py-2"
        onClick={() => onChange(Math.min(pages, page + 1))}
        disabled={page >= pages}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- alert box */
export function Alert({ type = 'info', title, children }) {
  const map = {
    info: { color: 'var(--accent)', icon: AlertCircle },
    success: { color: 'var(--ok)', icon: CheckCircle2 },
    error: { color: 'var(--danger)', icon: XCircle },
    warning: { color: 'var(--warn)', icon: AlertCircle },
  };
  const { color, icon: Icon } = map[type] || map.info;
  return (
    <div className="soft-inset-sm flex gap-3 p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <Icon size={18} style={{ color }} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="text-sm font-bold" style={{ color }}>{title}</p>}
        <div className="text-sm text-muted">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- breadcrumb */
export function Breadcrumbs({ items }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} />}
          {item.to ? (
            <Link to={item.to} className="hover:text-accent">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
