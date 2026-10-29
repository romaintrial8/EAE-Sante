// Préférences propres à l'appareil (localStorage). Jamais de données d'entraînement ici.

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* stockage indisponible */ }
}

export interface IcuConfig { athleteId: string; apiKey: string }

export const getIcuConfig = (): IcuConfig | null => {
  const c = read<IcuConfig | null>('cocarde.icu', null);
  return c && c.apiKey ? c : null;
};
export const setIcuConfig = (c: IcuConfig | null) => write('cocarde.icu', c);

export interface SyncMeta {
  lastAttemptAt?: string;
  lastOkAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  wellnessDays?: number;
  activities?: number;
  fields?: string[];
  range?: string;
  /** dernier jour avec une donnée de santé reçue */
  latestNight?: string;
}

export const getSyncMeta = (): SyncMeta => read<SyncMeta>('cocarde.sync', {});
export const setSyncMeta = (m: SyncMeta) => write('cocarde.sync', m);

export type ThemePref = 'system' | 'light' | 'dark';
export const getTheme = (): ThemePref => read<ThemePref>('cocarde.theme', 'system');
export function setTheme(t: ThemePref): void {
  write('cocarde.theme', t);
  applyTheme(t);
}
export function applyTheme(t: ThemePref): void {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}

export const getSeeded = (): boolean => read<boolean>('cocarde.seeded', false);
export const setSeeded = () => write('cocarde.seeded', true);
