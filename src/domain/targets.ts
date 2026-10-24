// Résultats S0 et jalons de la passation v2 (04/10/2026).
import type { TestEvent } from './bareme';
import type { Ymd } from './dates';

export interface Milestone { key: 'S0' | 'S7' | 'S15' | 'S20' | 'J'; label: string; date: Ymd }

export const MILESTONES: Milestone[] = [
  { key: 'S0', label: 'S0', date: '2026-10-04' },
  { key: 'S7', label: 'Jalon S7', date: '2026-11-22' },
  { key: 'S15', label: 'Jalon S15', date: '2027-01-17' },
  { key: 'S20', label: 'Jalon S20', date: '2027-02-21' },
  { key: 'J', label: 'Jour J', date: '2027-03-15' },
];

export interface EventTargets {
  S7: number; S15: number; S20: number; J: number;
  /** libellé lisible quand la passation donne une fourchette */
  text?: Partial<Record<'S7' | 'S15' | 'S20' | 'J', string>>;
  ambition?: number;
  /** estimation de départ quand le test S0 n'a pas été fait */
  s0Estimate?: string;
}

export const TARGETS: Record<TestEvent, EventTargets> = {
  pullups: { S7: 7, S15: 9, S20: 11, J: 12, ambition: 13, text: { S15: '9-10', S20: '11-12' } },
  situps: { S7: 42, S15: 44, S20: 46, J: 46 },
  swim50: { S7: 31.6, S15: 31.0, S20: 30.8, J: 30.8 },
  run3000: { S7: 765, S15: 745, S20: 730, J: 730, ambition: 713, s0Estimate: "≈ 12'50-13'05 (non testé en S0)" },
  sprint50: { S7: 7.15, S15: 7.06, S20: 7.0, J: 6.97, s0Estimate: 'non testé en S0' },
};

/** Résultats du test S0 (01-04/10/2026). */
export const S0_RESULTS: { event: TestEvent; value: number }[] = [
  { event: 'pullups', value: 5 },
  { event: 'situps', value: 40 },
  { event: 'swim50', value: 32.5 },
];

export const WEIGHT_PATH: { date: Ymd; kg: number }[] = [
  { date: '2026-10-04', kg: 87 },
  { date: '2026-11-22', kg: 84.5 },
  { date: '2027-01-17', kg: 82.5 },
  { date: '2027-02-21', kg: 81 },
  { date: '2027-03-15', kg: 81 },
];

export const VMA_PATH = { S0: 15.0, S7: 15.2, S15: 15.5, S20: 15.7 };

/** Prochain jalon (S7, S15, S20 ou Jour J) à partir d'une date. */
export function nextMilestone(date: Ymd): Milestone {
  for (const m of MILESTONES) if (m.key !== 'S0' && m.date >= date) return m;
  return MILESTONES[MILESTONES.length - 1] as Milestone;
}

export function targetFor(event: TestEvent, key: Milestone['key']): number | null {
  if (key === 'S0') return null;
  return TARGETS[event][key];
}

/** Poids cible du jour, interpolé linéairement entre les jalons de la passation. */
export function weightTarget(date: Ymd): number | null {
  const p = WEIGHT_PATH;
  const first = p[0];
  const last = p[p.length - 1];
  if (!first || !last || date < first.date) return null;
  if (date >= last.date) return last.kg;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i] as { date: Ymd; kg: number };
    const b = p[i + 1] as { date: Ymd; kg: number };
    if (date >= a.date && date <= b.date) {
      const t = (Date.parse(date) - Date.parse(a.date)) / (Date.parse(b.date) - Date.parse(a.date));
      return Math.round((a.kg + (b.kg - a.kg) * t) * 10) / 10;
    }
  }
  return null;
}
