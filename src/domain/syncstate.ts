// État de la chaîne Garmin → Intervals.icu → Cocarde. Fonctions pures.
import { diffDays, type Ymd } from './dates';
import type { AppData } from './types';

export interface SyncMetaLike { lastAttemptAt?: string; lastOkAt?: string; lastError?: string; lastErrorAt?: string }

export const FULL_EVERY_MS = 3 * 3600 * 1000; // synchro complète au plus toutes les 3 h…
export const RETRY_MS = 10 * 60 * 1000;       // …sauf si la nuit du jour manque : nouvel essai toutes les 10 min

/** Dernier jour pour lequel on a reçu une donnée de santé de Garmin. */
export function latestNight(data: Pick<AppData, 'wellness'>): Ymd | undefined {
  let max: Ymd | undefined;
  for (const w of Object.values(data.wellness)) if (!w.deleted && (!max || w.date > max)) max = w.date;
  return max;
}

export function hasNight(data: Pick<AppData, 'wellness'>, date: Ymd): boolean {
  const w = data.wellness[date];
  return !!w && !w.deleted && (w.sleepScore !== undefined || w.hrv !== undefined || w.restingHR !== undefined || w.sleepSecs !== undefined);
}

/** Faut-il interroger Intervals.icu maintenant ? */
export function shouldSync(meta: SyncMetaLike, data: Pick<AppData, 'wellness'>, today: Ymd, now = Date.now()): boolean {
  if (!meta.lastAttemptAt || !meta.lastOkAt) return true;
  const sinceAttempt = now - Date.parse(meta.lastAttemptAt);
  if (sinceAttempt < RETRY_MS) return false;
  if (now - Date.parse(meta.lastOkAt) >= FULL_EVERY_MS) return true;
  return !hasNight(data, today);
}

export interface SyncDiagnosis { level: 'ok' | 'warn' | 'error' | 'off'; text: string; side?: 'app' | 'garmin' }

const ddmm = (d: Ymd) => `${d.slice(8)}/${d.slice(5, 7)}`;

/** En une phrase : où en est la chaîne, et de quel côté est le problème. */
export function diagnose(meta: SyncMetaLike, data: Pick<AppData, 'wellness'>, configured: boolean, today: Ymd): SyncDiagnosis {
  if (!configured) return { level: 'off', text: 'Garmin non relié.' };
  const last = latestNight(data);
  if (meta.lastError && (!meta.lastOkAt || (meta.lastErrorAt ?? '') > meta.lastOkAt)) {
    return { level: 'error', side: 'app', text: `L’app n’arrive pas à joindre Intervals.icu : ${meta.lastError}` };
  }
  if (!meta.lastOkAt) return { level: 'warn', text: 'Première synchronisation en attente.' };
  if (!last) return { level: 'error', side: 'garmin', text: 'Intervals.icu répond, mais n’a aucune donnée de santé venant de Garmin.' };
  const lag = diffDays(today, last);
  if (lag <= 0) return { level: 'ok', text: `Nuit du ${ddmm(last)} reçue.` };
  if (lag === 1) return { level: 'warn', side: 'garmin', text: `Nuit pas encore arrivée (dernière : ${ddmm(last)}). Ouvre Garmin Connect pour synchroniser la montre, l’app réessaie seule.` };
  return { level: 'error', side: 'garmin', text: `Dernière nuit reçue : ${ddmm(last)}. L’app joint bien Intervals.icu, mais Intervals.icu ne reçoit plus rien de Garmin depuis ${lag} jours.` };
}
