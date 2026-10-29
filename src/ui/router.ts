// Routeur par hash (#/aujourdhui, #/jour/2026-10-24…) : rien à configurer sur GitHub Pages.
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'today' }
  | { name: 'day'; date: string }
  | { name: 'plan'; week?: number }
  | { name: 'health' }
  | { name: 'tests' }
  | { name: 'concours' }
  | { name: 'settings' };

export function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [a, b] = parts;
  switch (a) {
    case 'jour': return b && /^\d{4}-\d{2}-\d{2}$/.test(b) ? { name: 'day', date: b } : { name: 'today' };
    case 'plan': { const n = Number(String(b ?? '').replace(/^S/i, '')); return { name: 'plan', week: Number.isInteger(n) && n > 0 ? n : undefined }; }
    case 'sante': return { name: 'health' };
    case 'tests': case 'perfs': return { name: 'tests' };
    case 'concours': return { name: 'concours' };
    case 'reglages': return { name: 'settings' };
    default: return { name: 'today' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'today': return '#/aujourdhui';
    case 'day': return `#/jour/${r.date}`;
    case 'plan': return r.week ? `#/plan/S${r.week}` : '#/plan';
    case 'health': return '#/sante';
    case 'tests': return '#/perfs';
    case 'concours': return '#/concours';
    case 'settings': return '#/reglages';
  }
}

let current = parse(location.hash);
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse(location.hash);
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
});

export function useRoute(): Route {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => current, () => current);
}

export function go(r: Route): void {
  location.hash = href(r);
}
