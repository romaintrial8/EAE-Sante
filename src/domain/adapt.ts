// Adaptation hebdomadaire du plan. Décidée chaque lundi d'après les mesures d'avant ce lundi : le plan ne bouge pas en cours de semaine.
//
// Règles de sécurité (non négociables) :
// - au plus 2 épreuves renforcées par semaine (les plus en retard) ;
// - aucun renfort en semaine de décharge, de tests, de simulation, d'affûtage, ni en S1 ;
// - aucun renfort si le garde-fou s'est déclenché au moins 2 jours la semaine précédente (fatigue) ;
// - course : le renfort ajoute au plus 10 % du kilométrage prévu de la semaine.
import { EVENT_ORDER, type TestEvent } from './bareme';
import { addDays, mondayOfWeek, weekOf, type Ymd } from './dates';
import { guardFor } from './health';
import { progressOf, vmaAt, type Progress, type VmaEstimate } from './progression';
import { dayPlan, weekDays, weekDef, type DayPlan, type PlanCtx, type WeekDef } from './plan';
import type { AppData } from './types';

export const MAX_BOOSTS = 2;

export interface Boost { event: TestEvent; level: 1 | 2; delayWeeks: number }

export interface WeekAdapt {
  week: number;
  monday: Ymd;
  vma: VmaEstimate;
  boosts: Boost[];
  /** en retard mais pas renforcé cette semaine, avec la raison */
  waiting: { event: TestEvent; delayWeeks: number; why: string }[];
  suspended?: string;
  km: number;
}

export function suspendReason(w: WeekDef | undefined, week: number): string | undefined {
  if (!w) return 'hors plan';
  if (week === 1) return 'première semaine : pas encore de mesure';
  if (w.deload) return 'semaine de décharge';
  if (w.testWeek) return 'semaine de tests';
  if (w.penta) return 'semaine de simulation';
  if (week >= 22) return 'affûtage';
  return undefined;
}

function fatigueDays(data: Pick<AppData, 'wellness' | 'checkin'>, monday: Ymd): number {
  let n = 0;
  for (let i = 1; i <= 7; i++) if (guardFor(data, addDays(monday, -i)).status === 'alert') n++;
  return n;
}

const cache = new WeakMap<object, Map<number, WeekAdapt>>();

export function weekAdapt(data: Pick<AppData, 'tests' | 'wellness' | 'checkin'>, week: number): WeekAdapt {
  let m = cache.get(data);
  if (!m) { m = new Map(); cache.set(data, m); }
  const hit = m.get(week);
  if (hit) return hit;
  const monday = mondayOfWeek(week);
  const asOf = addDays(monday, -1);
  const w = weekDef(week);
  const vma = vmaAt(data, monday);
  const behind: Progress[] = EVENT_ORDER.map((e) => progressOf(data, e, asOf))
    .filter((p) => p.status === 'behind' || p.status === 'farbehind')
    .sort((a, b) => b.delayWeeks - a.delayWeeks);
  let suspended = suspendReason(w, week);
  if (!suspended) {
    const f = fatigueDays(data, monday);
    if (f >= 2) suspended = `fatigue : garde-fou déclenché ${f} jours la semaine précédente`;
  }
  const out: WeekAdapt = { week, monday, vma, boosts: [], waiting: [], suspended, km: w?.km ?? 0 };
  for (const p of behind) {
    const delay = Math.round(p.delayWeeks * 10) / 10;
    if (suspended) out.waiting.push({ event: p.event, delayWeeks: delay, why: suspended });
    else if (out.boosts.length < MAX_BOOSTS) out.boosts.push({ event: p.event, level: p.status === 'farbehind' ? 2 : 1, delayWeeks: delay });
    else out.waiting.push({ event: p.event, delayWeeks: delay, why: `plafond de ${MAX_BOOSTS} renforts par semaine` });
  }
  m.set(week, out);
  return out;
}

export function boostLevel(ad: WeekAdapt | undefined, e: TestEvent): 0 | 1 | 2 {
  return ad?.boosts.find((b) => b.event === e)?.level ?? 0;
}

// ───────────────────────── plan adapté ─────────────────────────

export function ctxFor(ad: WeekAdapt): PlanCtx {
  const boosts: PlanCtx['boosts'] = {};
  for (const b of ad.boosts) boosts[b.event] = b.level;
  return { vma: ad.vma.vma, boosts, km: ad.km };
}

/** Le plan du jour tel qu'adapté à ta progression. */
export function planFor(data: Pick<AppData, 'tests' | 'wellness' | 'checkin'>, date: Ymd): DayPlan {
  return dayPlan(date, ctxFor(weekAdapt(data, weekOf(date))));
}

export function weekPlanFor(data: Pick<AppData, 'tests' | 'wellness' | 'checkin'>, n: number): DayPlan[] {
  return weekDays(n, ctxFor(weekAdapt(data, n)));
}
