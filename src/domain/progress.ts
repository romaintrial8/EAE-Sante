// Taux de réalisation du plan (adapté). Fonctions pures.
import { weekPlanFor } from './adapt';
import type { BlockKind } from './plan';
import type { AppData } from './types';
import type { Ymd } from './dates';

export interface Completion { done: number; total: number }

export function isDone(data: Pick<AppData, 'done'>, id: string): boolean {
  const r = data.done[id];
  return !!r && !r.deleted && (r.status === 'done' || r.status === 'swapped');
}

export function weekCompletion(data: AppData, n: number, upTo?: Ymd): { sport: Completion; concours: Completion; byKind: Partial<Record<BlockKind, Completion>> } {
  const sport = { done: 0, total: 0 };
  const concours = { done: 0, total: 0 };
  const byKind: Partial<Record<BlockKind, Completion>> = {};
  for (const day of weekPlanFor(data, n)) {
    if (upTo && day.date > upTo) continue;
    for (const s of day.sport) {
      const ok = isDone(data, s.id);
      if (s.optional && !ok) continue;
      sport.total++;
      if (ok) sport.done++;
    }
    for (const b of day.blocks) {
      concours.total++;
      const k = (byKind[b.kind] ??= { done: 0, total: 0 });
      k.total++;
      if (isDone(data, b.id)) { concours.done++; k.done++; }
    }
  }
  return { sport, concours, byKind };
}
