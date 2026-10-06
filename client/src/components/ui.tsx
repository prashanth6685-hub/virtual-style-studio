import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from '../state/AppContext';

/* ---------- Buttons / cards / text ---------- */

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-950">{title}</h1>
      {sub && <p className="mt-1 text-base text-ink-500">{sub}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 text-5xl" aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      {body && <p className="mt-1 max-w-xs text-sm text-ink-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PersonAvatar({ label, emoji }: { label: string; emoji: string }) {
  return (
    <span
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-100 text-2xl"
      role="img"
      aria-label={label}
    >
      {emoji}
    </span>
  );
}

/* ---------- Toasts ---------- */

export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-8"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`pointer-events-auto flex min-h-[44px] max-w-md items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-pop ${
            t.kind === 'error' ? 'bg-red-700' : t.kind === 'success' ? 'bg-emerald-700' : 'bg-ink-900'
          }`}
        >
          <span aria-hidden="true">{t.kind === 'error' ? '⚠️' : t.kind === 'success' ? '✓' : 'ℹ️'}</span>
          {t.message}
        </button>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button, input, select, [tabindex]')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-pop sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink-950">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-xl text-ink-700"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Segmented tabs ---------- */

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1 overflow-x-auto rounded-2xl bg-ink-100 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className="tab-btn whitespace-nowrap"
        >
          {o.icon && (
            <span aria-hidden="true" className="text-base">
              {o.icon}
            </span>
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Swatch ---------- */

export function Swatch({
  hex,
  selected,
  onSelect,
  label,
  size = 40,
}: {
  hex: string;
  selected?: boolean;
  onSelect?: () => void;
  label: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={label}
      aria-label={`Color ${label}`}
      aria-pressed={selected}
      style={{ width: size, height: size, backgroundColor: hex }}
      className={`shrink-0 rounded-full ring-2 ring-offset-2 transition ${
        selected ? 'ring-ink-900' : 'ring-ink-200 hover:ring-ink-400'
      }`}
    />
  );
}

/* ---------- Before / After slider ---------- */

export function BeforeAfter({
  before,
  after,
  beforeLabel = 'Before',
  afterLabel = 'After',
}: {
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [pos, setPos] = useState(50);
  const trackRef = useRef<HTMLDivElement>(null);

  const move = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div className="card overflow-hidden p-0">
      <div
        ref={trackRef}
        className="relative aspect-[3/4] w-full select-none overflow-hidden bg-ink-100"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) move(e.clientX);
        }}
        role="slider"
        aria-label="Before after comparison"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(2, p - 5));
          if (e.key === 'ArrowRight') setPos((p) => Math.min(98, p + 5));
        }}
      >
        <div className="absolute inset-0">{after}</div>
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <div className="h-full" style={{ width: `${(100 / pos) * 100}%` }}>
            {before}
          </div>
        </div>
        <div className="absolute inset-y-0 flex w-1 items-center justify-center bg-white shadow-pop" style={{ left: `calc(${pos}% - 2px)` }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-pop ring-1 ring-ink-200" aria-hidden="true">
            ↔
          </div>
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-ink-950/70 px-3 py-1 text-xs font-bold text-white">
          {beforeLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-ink-950/70 px-3 py-1 text-xs font-bold text-white">
          {afterLabel}
        </span>
      </div>
    </div>
  );
}

/* ---------- Progress bar ---------- */

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'} className="w-full">
      {label && <div className="mb-1 text-sm font-semibold text-ink-700">{label}</div>}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
