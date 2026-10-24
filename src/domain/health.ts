// Santé du jour, zone habituelle de VFC et garde-fou des séances qualité. Fonctions pures.
import { addDays, mondayOf, type Ymd } from './dates';
import type { ActivityRec, AppData, CheckinRec, HrvStatus, WellnessRec } from './types';

export type HealthField = 'sleepScore' | 'sleepSecs' | 'hrv' | 'restingHR' | 'weight' | 'bodyBattery';
export interface Valued { value: number; src: 'garmin' | 'manual' }

export interface DayHealth {
  date: Ymd;
  sleepScore?: Valued;
  sleepSecs?: Valued;
  hrv?: Valued;
  restingHR?: Valued;
  weight?: Valued;
  bodyBattery?: Valued;
  hrvStatus?: HrvStatus;
  note?: string;
}

function liveRec<T extends { deleted?: true }>(r: T | undefined): T | undefined {
  return r && !r.deleted ? r : undefined;
}

/** Fusion import + saisie : la saisie humaine gagne toujours. */
export function dayHealth(data: Pick<AppData, 'wellness' | 'checkin'>, date: Ymd): DayHealth {
  const w: WellnessRec | undefined = liveRec(data.wellness[date]);
  const c: CheckinRec | undefined = liveRec(data.checkin[date]);
  const out: DayHealth = { date };
  const pick = (f: HealthField) => {
    const manual = c ? (c as unknown as Record<string, unknown>)[f] : undefined;
    if (typeof manual === 'number') return { value: manual, src: 'manual' as const };
    const auto = w ? (w as unknown as Record<string, unknown>)[f] : undefined;
    if (typeof auto === 'number') return { value: auto, src: 'garmin' as const };
    return undefined;
  };
  for (const f of ['sleepScore', 'sleepSecs', 'hrv', 'restingHR', 'weight', 'bodyBattery'] as HealthField[]) {
    const v = pick(f);
    if (v) out[f] = v;
  }
  if (c?.hrvStatus) out.hrvStatus = c.hrvStatus;
  if (c?.note) out.note = c.note;
  return out;
}

export function fieldValue(data: Pick<AppData, 'wellness' | 'checkin'>, date: Ymd, f: HealthField): number | undefined {
  return dayHealth(data, date)[f]?.value;
}

export function seriesOf(data: Pick<AppData, 'wellness' | 'checkin'>, f: HealthField, from: Ymd, to: Ymd): { date: Ymd; value: number }[] {
  const out: { date: Ymd; value: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const v = fieldValue(data, d, f);
    if (v !== undefined) out.push({ date: d, value: v });
  }
  return out;
}

export interface Zone { mean: number; sd: number; low: number; high: number; n: number }

export const ZONE_DAYS = 28;
export const ZONE_MIN = 10;

/** Zone habituelle : moyenne ± 1 écart-type des 28 jours précédents (le jour lui-même exclu). */
export function zoneBefore(data: Pick<AppData, 'wellness' | 'checkin'>, f: HealthField, date: Ymd): Zone | null {
  const vals: number[] = [];
  for (let i = 1; i <= ZONE_DAYS; i++) {
    const v = fieldValue(data, addDays(date, -i), f);
    if (v !== undefined) vals.push(v);
  }
  if (vals.length < ZONE_MIN) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1));
  return { mean, sd, low: mean - sd, high: mean + sd, n: vals.length };
}

/** VFC « déséquilibrée » ce jour-là ? Le statut Garmin saisi prime ; sinon nuit sous la zone habituelle. */
export function hrvLow(data: Pick<AppData, 'wellness' | 'checkin'>, date: Ymd): boolean | null {
  const h = dayHealth(data, date);
  if (h.hrvStatus) return h.hrvStatus !== 'balanced';
  if (!h.hrv) return null;
  const z = zoneBefore(data, 'hrv', date);
  if (!z) return null;
  return h.hrv.value < z.low;
}

export interface Guard {
  status: 'ok' | 'alert' | 'unknown';
  reasons: string[];
  missing: string[];
}

export const BB_LIMIT = 40;

/** Garde-fou de la passation : VFC déséquilibrée 2 jours de suite ou Body Battery < 40 au réveil → 40' EF. */
export function guardFor(data: Pick<AppData, 'wellness' | 'checkin'>, date: Ymd): Guard {
  const reasons: string[] = [];
  const missing: string[] = [];
  const h = dayHealth(data, date);
  let known = 0;
  if (h.bodyBattery) {
    known++;
    if (h.bodyBattery.value < BB_LIMIT) reasons.push(`Body Battery ${h.bodyBattery.value} au réveil (< ${BB_LIMIT})`);
  } else missing.push('Body Battery');
  const today = hrvLow(data, date);
  const yesterday = hrvLow(data, addDays(date, -1));
  if (today !== null && yesterday !== null) {
    known++;
    if (today && yesterday) reasons.push('VFC sous ta zone habituelle 2 nuits de suite');
  } else missing.push('VFC sur 2 nuits');
  if (reasons.length) return { status: 'alert', reasons, missing };
  return { status: known === 0 ? 'unknown' : 'ok', reasons, missing };
}

// ───────────────────────── activités ─────────────────────────

export type ActKind = 'run' | 'swim' | 'strength' | 'walk' | 'other';

export function actKind(type: string): ActKind {
  const t = type.toLowerCase();
  if (t.includes('swim')) return 'swim';
  if (t.includes('run')) return 'run';
  if (t.includes('weight') || t.includes('strength') || t === 'workout' || t.includes('crossfit')) return 'strength';
  if (t.includes('walk') || t.includes('hike')) return 'walk';
  return 'other';
}

export function activitiesOn(data: Pick<AppData, 'activity'>, date: Ymd): ActivityRec[] {
  return Object.values(data.activity)
    .filter((a) => !a.deleted && a.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Kilomètres courus (Garmin) sur la semaine du lundi donné. */
export function runKmWeek(data: Pick<AppData, 'activity'>, monday: Ymd): number {
  const end = addDays(monday, 6);
  let m = 0;
  for (const a of Object.values(data.activity)) {
    if (a.deleted || a.date < monday || a.date > end) continue;
    if (actKind(a.type) === 'run' && a.distance) m += a.distance;
  }
  return m / 1000;
}

export function weekMonday(date: Ymd): Ymd {
  return mondayOf(date);
}

export function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h} h ${String(m - h * 60).padStart(2, '0')}` : `${m} min`;
}

export function fmtPace(speed: number): string {
  if (!speed) return '—';
  const s = 1000 / speed;
  const m = Math.floor(s / 60);
  const r = Math.round(s - m * 60);
  return r === 60 ? `${m + 1}'00` : `${m}'${String(r).padStart(2, '0')}`;
}
