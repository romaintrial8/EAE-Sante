// Où en es-tu, épreuve par épreuve, par rapport à la trajectoire de la passation ? Fonctions pures.
//
// Méthode :
// 1. Trajectoire exigée : ligne droite entre ta première mesure (S0 ou S1) et les jalons S7, S15, S20, Jour J.
// 2. Écart : ta dernière mesure comparée à l'exigence à la même date, avec une tolérance de mesure
//    (répétitions arrondies à l'entier inférieur ; 0,15 s en natation ; 0,05 s au sprint ; 5 s au 3000 m).
// 3. Retard en semaines : écart ÷ progression prévue par semaine sur ce tronçon de la trajectoire.
// 4. Projection Jour J : tendance de tes mesures (au moins 3 sur 3 semaines), sinon « si l'écart actuel reste le même ».
import { betterBy, EVENT_ORDER, EVENTS, noteFor, valueForNote, type TestEvent } from './bareme';
import { addDays, diffDays, type Ymd } from './dates';
import { MILESTONES, TARGETS } from './targets';
import type { AppData, TestRec } from './types';

export const TOLERANCE: Record<TestEvent, number> = { pullups: 0, situps: 0, swim50: 0.15, sprint50: 0.05, run3000: 5 };
export const JOUR_J: Ymd = (MILESTONES[MILESTONES.length - 1] as { date: Ymd }).date;

export function testsOf(data: Pick<AppData, 'tests'>, event: TestEvent, upTo?: Ymd): TestRec[] {
  return Object.values(data.tests)
    .filter((t) => !t.deleted && t.event === event && (!upTo || t.date <= upTo))
    .sort((a, b) => (a.date === b.date ? a.updatedAt.localeCompare(b.updatedAt) : a.date.localeCompare(b.date)));
}

export function latestTest(data: Pick<AppData, 'tests'>, event: TestEvent, upTo?: Ymd): TestRec | undefined {
  const all = testsOf(data, event, upTo);
  return all[all.length - 1];
}

export interface PathPt { date: Ymd; value: number }

export function requiredPath(event: TestEvent, baseline: PathPt): PathPt[] {
  const t = TARGETS[event];
  const pts: PathPt[] = [baseline];
  for (const m of MILESTONES) if (m.key !== 'S0' && m.date > baseline.date) pts.push({ date: m.date, value: t[m.key] });
  return pts;
}

export function pathAt(path: PathPt[], date: Ymd): number {
  const first = path[0] as PathPt;
  if (date <= first.date) return first.value;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i] as PathPt;
    const b = path[i + 1] as PathPt;
    if (date <= b.date) return a.value + (b.value - a.value) * (diffDays(date, a.date) / Math.max(1, diffDays(b.date, a.date)));
  }
  return (path[path.length - 1] as PathPt).value;
}

/** Progression prévue par semaine (en valeur absolue) sur le tronçon de la date ; tronçon plat → tronçon précédent. */
export function slopeAt(path: PathPt[], date: Ymd): number {
  let idx = path.length - 2;
  for (let i = 0; i < path.length - 1; i++) if (date <= (path[i + 1] as PathPt).date) { idx = i; break; }
  for (let i = idx; i >= 0; i--) {
    const a = path[i] as PathPt;
    const b = path[i + 1] as PathPt;
    const s = Math.abs(b.value - a.value) / Math.max(1, diffDays(b.date, a.date) / 7);
    if (s > 1e-9) return s;
  }
  return 0;
}

export type Status = 'none' | 'ahead' | 'ontrack' | 'behind' | 'farbehind';

export const STATUS_LABEL: Record<Status, string> = {
  none: 'Pas de mesure', ahead: 'En avance', ontrack: 'Dans les clous', behind: 'En retard', farbehind: 'Gros retard',
};

export interface Progress {
  event: TestEvent;
  latest?: TestRec;
  count: number;
  baseline?: PathPt;
  note: number | null;
  /** exigence de la trajectoire à la date de la dernière mesure */
  required?: number;
  /** > 0 : retard ; < 0 : avance (en semaines de progression prévue) */
  delayWeeks: number;
  status: Status;
  /** âge de la dernière mesure, en jours, à la date d'analyse */
  ageDays?: number;
  nextPoint?: { note: number; value: number; gap: number; weeks: number | null };
  projection?: { value: number; note: number; method: 'trend' | 'gap' };
}

const roundEv = (event: TestEvent, v: number) => (EVENTS[event].unit === 'reps' ? Math.floor(v + 1e-9) : v);

function trend(tests: TestRec[], asOf: Ymd): number | null {
  const recent = tests.filter((t) => diffDays(asOf, t.date) <= 56);
  if (recent.length < 3) return null;
  const first = recent[0] as TestRec;
  const last = recent[recent.length - 1] as TestRec;
  if (diffDays(last.date, first.date) < 21) return null;
  const xs = recent.map((t) => diffDays(t.date, first.date));
  const ys = recent.map((t) => t.value);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * ((ys[i] as number) - my); den += (x - mx) ** 2; });
  return den ? num / den : null; // unité par jour
}

export function progressOf(data: Pick<AppData, 'tests'>, event: TestEvent, asOf: Ymd): Progress {
  const all = testsOf(data, event, asOf);
  const latest = all[all.length - 1];
  if (!latest) return { event, count: 0, note: null, delayWeeks: 0, status: 'none' };
  const first = all[0] as TestRec;
  const baseline: PathPt = { date: first.date, value: first.value };
  const path = requiredPath(event, baseline);
  const req = pathAt(path, latest.date);
  const slope = slopeAt(path, latest.date);
  const raw = betterBy(event, latest.value, req); // > 0 : mieux que l'exigence
  let delay = 0;
  if (raw > 0) delay = slope ? -raw / slope : 0;
  else {
    let gap = betterBy(event, latest.value, roundEv(event, req));
    if (gap < 0) gap = Math.min(0, gap + TOLERANCE[event]);
    delay = slope && gap < 0 ? -gap / slope : 0;
  }
  const status: Status = delay <= -1 ? 'ahead' : delay <= 0.5 ? 'ontrack' : delay <= 4 ? 'behind' : 'farbehind';
  const note = noteFor(event, latest.value);

  // prochain point
  let nextPoint: Progress['nextPoint'];
  for (let n = note + 1; n <= 20; n++) {
    const v = valueForNote(event, n);
    if (v === null) continue;
    const gap = Math.abs(v - latest.value);
    const s = slopeAt(path, asOf);
    nextPoint = { note: n, value: v, gap, weeks: s ? gap / s : null };
    break;
  }

  // projection Jour J
  let projection: Progress['projection'];
  const daysToJ = diffDays(JOUR_J, latest.date);
  const b = trend(all, asOf);
  const best = valueForNote(event, 20) as number;
  const clamp = (v: number) => (EVENTS[event].better === 'higher' ? Math.min(v, best) : Math.max(v, best));
  if (b !== null && daysToJ > 0) {
    const v = clamp(latest.value + b * daysToJ);
    projection = { value: v, note: noteFor(event, roundEv(event, v)), method: 'trend' };
  } else if (all.length >= 1 && daysToJ > 0) {
    const target = pathAt(path, JOUR_J);
    const v = clamp(EVENTS[event].better === 'higher' ? target + raw : target - raw);
    projection = { value: v, note: noteFor(event, roundEv(event, v)), method: 'gap' };
  }

  return {
    event, latest, count: all.length, baseline, note, required: req, delayWeeks: delay, status,
    ageDays: diffDays(asOf, latest.date), nextPoint, projection,
  };
}

export function allProgress(data: Pick<AppData, 'tests'>, asOf: Ymd): Record<TestEvent, Progress> {
  const out = {} as Record<TestEvent, Progress>;
  for (const e of EVENT_ORDER) out[e] = progressOf(data, e, asOf);
  return out;
}

export interface SportScore { notes: Record<TestEvent, number | null>; avg: number | null; count: number; projectedAvg: number | null }

export function sportScore(data: Pick<AppData, 'tests'>, asOf: Ymd): SportScore {
  const p = allProgress(data, asOf);
  const notes = {} as Record<TestEvent, number | null>;
  let sum = 0, count = 0, psum = 0, pcount = 0;
  for (const e of EVENT_ORDER) {
    notes[e] = p[e].note;
    if (p[e].note !== null) { sum += p[e].note as number; count++; }
    if (p[e].projection) { psum += (p[e].projection as { note: number }).note; pcount++; }
  }
  return { notes, avg: count ? sum / count : null, count, projectedAvg: pcount ? psum / pcount : null };
}

// ───────────────────────── VMA et allures ─────────────────────────

export const VMA_S0 = 15.0;     // demi-Cooper S0 : 1500 m en 6 min
export const RATIO_3000 = 0.93; // un 3000 m se court à ≈ 93 % de la VMA (cohérent avec ton S0 : 15,0 km/h ↔ 12'50-13'05)

export interface VmaEstimate { vma: number; source: 'S0' | '3000'; date?: Ymd; value?: number }

/** VMA du moment : dernier 3000 m chronométré avant la date, sinon le demi-Cooper du S0. */
export function vmaAt(data: Pick<AppData, 'tests'>, before: Ymd): VmaEstimate {
  const t = latestTest(data, 'run3000', addDays(before, -1));
  if (!t) return { vma: VMA_S0, source: 'S0' };
  const vma = Math.round(((3000 / t.value) * 3.6 / RATIO_3000) * 10) / 10;
  return { vma, source: '3000', date: t.date, value: t.value };
}

/** Allure (s/km) pour courir un 3000 m en `seconds`. */
export function pace3000(seconds: number): number {
  return seconds / 3;
}
