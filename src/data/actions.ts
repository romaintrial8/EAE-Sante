// Toutes les écritures de l'interface passent ici (horodatage, annulation).
import type { TestEvent } from '../domain/bareme';
import type { Ymd } from '../domain/dates';
import { sameImport } from '../domain/intervals';
import { S0_RESULTS } from '../domain/targets';
import type { ActivityRec, CheckinRec, DoneStatus, Rec, TestRec, WellnessRec } from '../domain/types';
import { commit, getData } from './store';
import { getSeeded, setSeeded } from './prefs';
import { showToast } from '../ui/toast';

export function newId(): string {
  return String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}

type CheckinPatch = Partial<Omit<CheckinRec, 'id' | 'updatedAt' | 'date' | 'deleted'>>;

/** Complète ou corrige le check-in du jour. Un champ vide (undefined) efface la saisie manuelle. */
export function saveCheckin(date: Ymd, patch: CheckinPatch): void {
  const prev = getData().checkin[date];
  const base: Record<string, unknown> = prev && !prev.deleted ? { ...prev } : { id: date, date };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v))) delete base[k];
    else base[k] = v;
  }
  const hasValue = Object.keys(base).some((k) => !['id', 'date', 'updatedAt', 'deleted'].includes(k));
  commit((tx) => {
    if (hasValue) {
      delete base.deleted;
      tx.put('checkin', base as unknown as CheckinRec);
    } else if (prev && !prev.deleted) tx.remove('checkin', date);
  });
}

export function setDone(itemId: string, status: DoneStatus, extra: { rpe?: number; note?: string } = {}): void {
  commit((tx) => tx.put('done', { id: itemId, status, ...clean(extra) }));
}

export function clearDone(itemId: string): void {
  const prev = getData().done[itemId];
  if (!prev || prev.deleted) return;
  commit((tx) => tx.remove('done', itemId));
}

export function toggleDone(itemId: string): void {
  const r = getData().done[itemId];
  if (r && !r.deleted) clearDone(itemId);
  else setDone(itemId, 'done');
}

export function addTest(event: TestEvent, date: Ymd, value: number, note?: string): string {
  const id = newId();
  commit((tx) => tx.put('tests', { id, event, date, value, source: 'manual', ...clean({ note }) }));
  return id;
}

export function updateTest(id: string, patch: Partial<Pick<TestRec, 'date' | 'value' | 'note'>>): void {
  const prev = getData().tests[id];
  if (!prev || prev.deleted) return;
  commit((tx) => tx.put('tests', { ...prev, ...patch }));
}

export function deleteTest(id: string): void {
  const prev = getData().tests[id];
  if (!prev || prev.deleted) return;
  commit((tx) => tx.remove('tests', id));
  showToast('Résultat supprimé', () => commit((tx) => tx.put('tests', { ...prev })));
}

export function setDeadlineDone(id: string, done: boolean): void {
  commit((tx) => (done ? tx.put('deadlines', { id, done: true }) : tx.remove('deadlines', id)));
}

/** Au tout premier lancement : les résultats du test S0 de la passation. */
export function seedOnce(): void {
  if (getSeeded()) return;
  const data = getData();
  if (Object.keys(data.tests).length === 0) {
    commit((tx) => {
      S0_RESULTS.forEach((r, i) => tx.put('tests', { id: `s0-${r.event}`, event: r.event, value: r.value, date: '2026-10-04', source: 's0', note: 'Test S0 (01-04/10)', updatedAt: `2026-10-04T12:00:0${i}.000Z` }));
    }, 'import');
  }
  setSeeded();
}

/** Import Intervals.icu : n'écrit que ce qui a changé. Ne touche jamais aux saisies manuelles (collection checkin). */
export function importFromIntervals(wellness: WellnessRec[], activities: ActivityRec[]): { wellness: number; activities: number } {
  const data = getData();
  const w = wellness.filter((r) => !sameImport(data.wellness[r.id], r));
  const a = activities.filter((r) => !sameImport(data.activity[r.id], r));
  commit((tx) => {
    w.forEach((r) => tx.put('wellness', r));
    a.forEach((r) => tx.put('activity', r));
  }, 'import');
  return { wellness: w.length, activities: a.length };
}

function clean<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '') (out as Record<string, unknown>)[k] = v;
  return out;
}

export type { Rec };
