// Récupération quotidienne des données Garmin via l'API Intervals.icu (lecture seule).
// Chaîne : montre → Garmin Connect → Intervals.icu (automatique, dans le cloud) → Cocarde (à l'ouverture).
import { useSyncExternalStore } from 'react';
import { addDays, todayYmd } from '../domain/dates';
import { mapActivity, mapWellness } from '../domain/intervals';
import type { ActivityRec, WellnessRec } from '../domain/types';
import { importFromIntervals } from './actions';
import { getIcuConfig, getSyncMeta, setSyncMeta, type IcuConfig, type SyncMeta } from './prefs';

export const API = 'https://intervals.icu/api/v1';
export const HISTORY_START = '2026-09-01';
const AUTO_EVERY_MS = 3 * 3600 * 1000; // une fois toutes les 3 h au plus, à l'ouverture de l'app
const LOOKBACK_DAYS = 7;               // on relit la dernière semaine (Garmin complète parfois le sommeil plus tard)

interface SyncState { running: boolean; meta: SyncMeta }
let state: SyncState = { running: false, meta: getSyncMeta() };
const listeners = new Set<() => void>();
const set = (s: Partial<SyncState>) => { state = { ...state, ...s }; listeners.forEach((l) => l()); };

export function useSync(): SyncState {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => state, () => state);
}

export class SyncError extends Error {}

async function get(cfg: IcuConfig, path: string, params: Record<string, string>): Promise<unknown> {
  const id = encodeURIComponent(cfg.athleteId.trim() || '0');
  const qs = new URLSearchParams(params).toString();
  let res: Response;
  try {
    res = await fetch(`${API}/athlete/${id}/${path}?${qs}`, {
      headers: { Authorization: 'Basic ' + btoa('API_KEY:' + cfg.apiKey.trim()), Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    throw new SyncError('Intervals.icu injoignable : vérifie ta connexion internet. Si elle marche, le navigateur bloque peut-être la requête (voir Aide).');
  }
  if (res.status === 401 || res.status === 403) throw new SyncError('Clé API refusée par Intervals.icu. Recopie-la depuis Settings › Developer Settings.');
  if (res.status === 404) throw new SyncError('Identifiant d’athlète inconnu. Laisse « 0 » ou recopie ton identifiant (il commence par « i »).');
  if (res.status === 429) throw new SyncError('Intervals.icu limite les requêtes : réessaie dans quelques minutes.');
  if (!res.ok) throw new SyncError(`Intervals.icu a répondu une erreur ${res.status}.`);
  try {
    return await res.json();
  } catch {
    throw new SyncError('Réponse d’Intervals.icu illisible.');
  }
}

export interface SyncResult { ok: boolean; skipped?: string; wellness?: number; activities?: number; error?: string }

export async function syncIntervals(opts: { force?: boolean; full?: boolean; cfg?: IcuConfig } = {}): Promise<SyncResult> {
  const cfg = opts.cfg ?? getIcuConfig();
  if (!cfg) return { ok: false, skipped: 'no-config' };
  if (state.running) return { ok: false, skipped: 'running' };
  const meta = getSyncMeta();
  if (!opts.force && meta.lastOkAt && Date.now() - Date.parse(meta.lastOkAt) < AUTO_EVERY_MS) return { ok: true, skipped: 'recent' };
  const today = todayYmd();
  const oldest = opts.full || !meta.lastOkAt ? HISTORY_START : addDays(today, -LOOKBACK_DAYS);
  const nowIso = new Date().toISOString();
  set({ running: true });
  try {
    const [rawW, rawA] = await Promise.all([
      get(cfg, 'wellness', { oldest, newest: today }),
      get(cfg, 'activities', { oldest, newest: today }),
    ]);
    const wellness = (Array.isArray(rawW) ? rawW : []).map((r) => mapWellness(r as Record<string, unknown>, nowIso)).filter((r): r is WellnessRec => !!r);
    const activities = (Array.isArray(rawA) ? rawA : []).map((r) => mapActivity(r as Record<string, unknown>, nowIso)).filter((r): r is ActivityRec => !!r);
    const counts = importFromIntervals(wellness, activities);
    const fields = new Set<string>(meta.fields ?? []);
    wellness.forEach((w) => w.fields.forEach((f) => fields.add(f)));
    const next: SyncMeta = {
      ...meta, lastAttemptAt: nowIso, lastOkAt: nowIso, lastError: undefined, lastErrorAt: undefined,
      wellnessDays: wellness.length, activities: activities.length, fields: [...fields].sort(), range: `${oldest} → ${today}`,
    };
    setSyncMeta(next);
    set({ running: false, meta: next });
    return { ok: true, ...counts };
  } catch (e) {
    const msg = e instanceof SyncError ? e.message : `Erreur inattendue : ${(e as Error).message}`;
    const next: SyncMeta = { ...meta, lastAttemptAt: nowIso, lastError: msg, lastErrorAt: nowIso };
    setSyncMeta(next);
    set({ running: false, meta: next });
    return { ok: false, error: msg };
  }
}

export function refreshMeta(): void {
  set({ meta: getSyncMeta() });
}

/** Synchronisation automatique : au lancement, puis quand l'app revient au premier plan. */
export function startAutoSync(): void {
  void syncIntervals();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncIntervals();
  });
}
