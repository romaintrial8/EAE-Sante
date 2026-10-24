// Barème hommes des épreuves sportives communes aux concours des grandes écoles militaires.
// Source : arrêté du 30 août 2021 (JORFTEXT000044053303), article 3.
// Règle officielle : une performance comprise entre deux valeurs reçoit la note de la valeur inférieure.

export type TestEvent = 'pullups' | 'situps' | 'swim50' | 'run3000' | 'sprint50';

export interface EventInfo {
  id: TestEvent;
  label: string;
  short: string;
  unit: 'reps' | 's';
  better: 'higher' | 'lower';
  /** seuils pour les notes 20, 19, 18 … (index 0 = note 20) */
  thresholds: number[];
}

export const EVENTS: Record<TestEvent, EventInfo> = {
  pullups: {
    id: 'pullups', label: 'Tractions', short: 'Tractions', unit: 'reps', better: 'higher',
    // notes 20 → 5 ; en dessous de 2 tractions : 0 (la suspension, plafonnée à 4, n'est pas suivie ici)
    thresholds: [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  },
  situps: {
    id: 'situps', label: 'Abdominaux 1 min', short: 'Abdos', unit: 'reps', better: 'higher',
    thresholds: [50, 48, 46, 44, 42, 40, 38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12],
  },
  swim50: {
    id: 'swim50', label: 'Natation 50 m', short: '50 m nage', unit: 's', better: 'lower',
    thresholds: [29.6, 30.2, 30.8, 31.6, 32.3, 33.1, 35.1, 36.5, 38.0, 39.7, 41.7, 43.9, 46.4, 49.1, 52.3, 56.0, 59.8, 64.2, 69.3, 74.2],
  },
  run3000: {
    id: 'run3000', label: 'Course 3000 m', short: '3000 m', unit: 's', better: 'lower',
    thresholds: [629, 641, 653, 666, 681, 696, 713, 730, 749, 770, 792, 816, 842, 869, 899, 930, 965, 1002, 1042, 1085],
  },
  sprint50: {
    id: 'sprint50', label: 'Course 50 m', short: 'Sprint 50 m', unit: 's', better: 'lower',
    thresholds: [6.47, 6.51, 6.56, 6.61, 6.65, 6.70, 6.82, 6.89, 6.97, 7.06, 7.15, 7.25, 7.36, 7.47, 7.60, 7.74, 7.88, 8.03, 8.22, 8.38],
  },
};

export const EVENT_ORDER: TestEvent[] = ['run3000', 'sprint50', 'swim50', 'pullups', 'situps'];

const EPS = 1e-9;

/** Note /20 officielle (entier), 0 si sous le seuil de la note 1. */
export function noteFor(event: TestEvent, value: number): number {
  const info = EVENTS[event];
  for (let i = 0; i < info.thresholds.length; i++) {
    const t = info.thresholds[i] as number;
    const ok = info.better === 'higher' ? value + EPS >= t : value - EPS <= t;
    if (ok) return 20 - i;
  }
  return 0;
}

/** Performance minimale pour obtenir une note donnée (null si la note n'existe pas pour l'épreuve). */
export function valueForNote(event: TestEvent, note: number): number | null {
  const v = EVENTS[event].thresholds[20 - note];
  return v ?? null;
}

/** Affichage d'une performance : 12'10 · 32"5 · 6"97 · 12 rép. */
export function fmtPerf(event: TestEvent, value: number): string {
  if (event === 'run3000') {
    const m = Math.floor(value / 60);
    const s = Math.round(value - m * 60);
    return `${m}'${s < 10 ? '0' + s : s}`;
  }
  if (event === 'swim50') return value.toFixed(1).replace('.', '"');
  if (event === 'sprint50') return value.toFixed(2).replace('.', '"');
  return `${value}`;
}

export function fmtPerfUnit(event: TestEvent, value: number): string {
  return EVENTS[event].unit === 'reps' ? `${value} rép.` : fmtPerf(event, value);
}

/** Lecture d'une saisie libre : « 12'10 », « 12:10 », « 32,5 », « 6.97 », « 12 ». */
export function parsePerf(event: TestEvent, raw: string): number | null {
  const s = raw.trim().replace(',', '.').replace(/\s/g, '');
  if (!s) return null;
  if (EVENTS[event].unit === 'reps') {
    const n = Number(s);
    return Number.isInteger(n) && n >= 0 && n < 200 ? n : null;
  }
  if (event === 'run3000') {
    const m = s.match(/^(\d{1,2})['′:.h](\d{1,2})(?:"|'')?$/);
    if (m) {
      const sec = Number(m[2]);
      if (sec >= 60) return null;
      return Number(m[1]) * 60 + sec;
    }
    const n = Number(s);
    return Number.isFinite(n) && n > 300 && n < 3600 ? n : null;
  }
  const n = Number(s.replace(/["″]/, '.'));
  return Number.isFinite(n) && n > 3 && n < 200 ? n : null;
}

/** Comparaison orientée : > 0 si a est meilleur que b. */
export function betterBy(event: TestEvent, a: number, b: number): number {
  return EVENTS[event].better === 'higher' ? a - b : b - a;
}
