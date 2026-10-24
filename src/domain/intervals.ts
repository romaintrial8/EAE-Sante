// Conversion des réponses de l'API Intervals.icu (v1) en enregistrements Cocarde. Fonctions pures.
// Documentation : https://intervals.icu/api-docs.html — /api/v1/athlete/{id}/wellness et /activities
import type { ActivityRec, WellnessRec } from './types';

type Raw = Record<string, unknown>;

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

const WELLNESS_MAP: [keyof WellnessRec, string][] = [
  ['sleepScore', 'sleepScore'],
  ['sleepSecs', 'sleepSecs'],
  ['hrv', 'hrv'],
  ['restingHR', 'restingHR'],
  ['avgSleepingHR', 'avgSleepingHR'],
  ['weight', 'weight'],
  ['readiness', 'readiness'],
  ['spO2', 'spO2'],
  ['steps', 'steps'],
  ['respiration', 'respiration'],
];

/** Intervals.icu ne connaît pas Body Battery en standard : on accepte un champ personnalisé dont le nom le contient. */
function findBodyBattery(raw: Raw): number | undefined {
  for (const [k, v] of Object.entries(raw)) {
    if (/body.?battery/i.test(k)) {
      const n = num(v);
      if (n !== undefined) return n;
    }
  }
  return undefined;
}

export function mapWellness(raw: Raw, now: string): WellnessRec | null {
  const date = str(raw.id);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const rec: WellnessRec = { id: date, date, updatedAt: now, fields: [] };
  for (const [ours, theirs] of WELLNESS_MAP) {
    const v = num(raw[theirs]);
    if (v !== undefined && v !== 0) {
      (rec as unknown as Record<string, unknown>)[ours] = v;
      rec.fields.push(theirs);
    }
  }
  const bb = findBodyBattery(raw);
  if (bb !== undefined) { rec.bodyBattery = bb; rec.fields.push('bodyBattery'); }
  return rec.fields.length ? rec : null;
}

export function mapActivity(raw: Raw, now: string): ActivityRec | null {
  const id = raw.id === undefined || raw.id === null ? undefined : String(raw.id);
  const start = str(raw.start_date_local);
  const type = str(raw.type);
  // Les activités venues de Strava ne sont pas exposées par l'API (restriction Strava) : on les ignore.
  if (!id || !start || !type) return null;
  const rec: ActivityRec = {
    id: `icu-${id}`,
    updatedAt: now,
    date: start.slice(0, 10),
    start,
    type,
    name: str(raw.name) ?? type,
  };
  const d = num(raw.distance); if (d) rec.distance = d;
  const mt = num(raw.moving_time); if (mt) rec.movingTime = mt;
  const et = num(raw.elapsed_time); if (et) rec.elapsed = et;
  const hr = num(raw.average_heartrate); if (hr) rec.avgHR = Math.round(hr);
  const mhr = num(raw.max_heartrate); if (mhr) rec.maxHR = Math.round(mhr);
  const load = num(raw.icu_training_load); if (load) rec.load = load;
  const sp = num(raw.average_speed); if (sp) rec.avgSpeed = sp;
  return rec;
}

/** Deux versions d'un même enregistrement importé : faut-il réécrire ? (évite des écritures inutiles) */
export function sameImport(a: object | undefined, b: object): boolean {
  if (!a) return false;
  const strip = (o: object) => JSON.stringify({ ...o, updatedAt: '' });
  return strip(a) === strip(b);
}
