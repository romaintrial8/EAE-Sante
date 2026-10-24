// Bilans dérivés : dernières performances, note sportive estimée, taux de réalisation du plan.
import { EVENT_ORDER, noteFor, type TestEvent } from './bareme';
import type { BlockKind } from './plan';
import { weekDays } from './plan';
import type { AppData, TestRec } from './types';
import type { Ymd } from './dates';

export function testsOf(data: Pick<AppData, 'tests'>, event: TestEvent): TestRec[] {
  return Object.values(data.tests)
    .filter((t) => !t.deleted && t.event === event)
    .sort((a, b) => (a.date === b.date ? a.updatedAt.localeCompare(b.updatedAt) : a.date.localeCompare(b.date)));
}

export function latestTest(data: Pick<AppData, 'tests'>, event: TestEvent, upTo?: Ymd): TestRec | undefined {
  const all = testsOf(data, event).filter((t) => !upTo || t.date <= upTo);
  return all[all.length - 1];
}

export interface SportScore {
  notes: Record<TestEvent, number | null>;
  avg: number | null;
  count: number;
  /** moyenne si chaque épreuve manquante comptait 0 (lecture prudente) */
  avgStrict: number;
}

/** Note de chaque épreuve sur la dernière performance, et moyenne simple des épreuves connues. */
export function sportScore(data: Pick<AppData, 'tests'>, upTo?: Ymd): SportScore {
  const notes = {} as Record<TestEvent, number | null>;
  let sum = 0;
  let count = 0;
  for (const e of EVENT_ORDER) {
    const t = latestTest(data, e, upTo);
    const n = t ? noteFor(e, t.value) : null;
    notes[e] = n;
    if (n !== null) { sum += n; count++; }
  }
  return { notes, avg: count ? sum / count : null, count, avgStrict: sum / EVENT_ORDER.length };
}

export interface Completion { done: number; total: number }

export function isDone(data: Pick<AppData, 'done'>, id: string): boolean {
  const r = data.done[id];
  return !!r && !r.deleted && (r.status === 'done' || r.status === 'swapped');
}

export function weekCompletion(data: Pick<AppData, 'done'>, n: number, upTo?: Ymd): { sport: Completion; concours: Completion; reminders: Completion; byKind: Partial<Record<BlockKind, Completion>> } {
  const sport = { done: 0, total: 0 };
  const concours = { done: 0, total: 0 };
  const reminders = { done: 0, total: 0 };
  const byKind: Partial<Record<BlockKind, Completion>> = {};
  for (const day of weekDays(n)) {
    if (upTo && day.date > upTo) continue;
    for (const s of day.sport) { sport.total++; if (isDone(data, s.id)) sport.done++; }
    for (const b of day.blocks) {
      concours.total++;
      const k = (byKind[b.kind] ??= { done: 0, total: 0 });
      k.total++;
      if (isDone(data, b.id)) { concours.done++; k.done++; }
    }
    for (const r of day.reminders) { reminders.total++; if (isDone(data, r.id)) reminders.done++; }
  }
  return { sport, concours, reminders, byKind };
}
