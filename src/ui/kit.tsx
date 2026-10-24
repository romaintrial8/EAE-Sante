import { useEffect, type ReactNode } from 'react';
import type { Discipline } from '../domain/plan';
import { IconCheck, IconClose } from './icons';
import { dismissToast, useToast } from './toast';

export function Card({ title, aside, children, className }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {(title || aside) && (
        <div className="card-head">
          {title ? <h2>{title}</h2> : <span />}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Method({ children, summary = 'Comment c’est calculé' }: { children: ReactNode; summary?: string }) {
  return (
    <details className="method">
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

export function kindClass(d: Discipline | 'conc'): string {
  return `k-${d}`;
}

export function Code({ children, kind }: { children: ReactNode; kind: Discipline | 'conc' }) {
  return <span className={`code ${kindClass(kind)}`}>{children}</span>;
}

export function Tick({ on }: { on: boolean }) {
  return <span className={`tick ${on ? 'on' : ''}`} aria-hidden="true"><IconCheck /></span>;
}

export function CheckItem({ time, title, sub, done, onToggle }: { time?: string; title: ReactNode; sub?: ReactNode; done: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`item ${done ? 'is-done' : ''}`} onClick={onToggle} aria-pressed={done}>
      {time && <time>{time.replace(':', ' h ')}</time>}
      <span className="t"><b>{title}</b>{sub && <span>{sub}</span>}</span>
      <Tick on={done} />
    </button>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <h2>{title}</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Fermer"><IconClose /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toaster() {
  const t = useToast();
  if (!t) return null;
  return (
    <div className="toast" role="status">
      <span>{t.text}</span>
      {t.undo && <button type="button" onClick={() => { t.undo?.(); dismissToast(); }}>Annuler</button>}
    </div>
  );
}

export function fmtNum(v: number, digits = 0): string {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function hm(t: string): string {
  return t.replace(':', ' h ');
}
