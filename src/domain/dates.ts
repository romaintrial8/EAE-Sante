// Jours civils au format AAAA-MM-JJ (heure locale de l'appareil).
// Toute l'arithmétique se fait en UTC pour ne jamais être piégée par les changements d'heure.

export type Ymd = string;

export const PLAN_START: Ymd = '2026-10-05'; // lundi de la semaine S1
export const PLAN_WEEKS = 23;
export const EXAM_START: Ymd = '2027-03-15'; // début probable de la fenêtre d'épreuves (à confirmer)

const pad = (n: number) => (n < 10 ? '0' + n : String(n));

export function ymdLocal(d: Date): Ymd {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayYmd(): Ymd {
  return ymdLocal(new Date());
}

function toUtc(s: Ymd): number {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function fromUtc(t: number): Ymd {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(s: Ymd, n: number): Ymd {
  return fromUtc(toUtc(s) + n * 86400000);
}

export function diffDays(a: Ymd, b: Ymd): number {
  return Math.round((toUtc(a) - toUtc(b)) / 86400000);
}

/** 0 = lundi … 6 = dimanche */
export function dow(s: Ymd): number {
  const js = new Date(toUtc(s)).getUTCDay();
  return (js + 6) % 7;
}

/** Numéro de semaine du plan (1 = semaine du 05/10/2026). Peut être < 1 ou > 23. */
export function weekOf(s: Ymd): number {
  return Math.floor(diffDays(s, PLAN_START) / 7) + 1;
}

export function mondayOfWeek(n: number): Ymd {
  return addDays(PLAN_START, (n - 1) * 7);
}

export function mondayOf(s: Ymd): Ymd {
  return addDays(s, -dow(s));
}

export function range(from: Ymd, to: Ymd): Ymd[] {
  const out: Ymd[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DAYS_SHORT = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function dayName(s: Ymd): string {
  return DAYS[dow(s)] ?? '';
}

export function fmtLong(s: Ymd): string {
  const [, m, d] = s.split('-').map(Number) as [number, number, number];
  return `${dayName(s)} ${d} ${MONTHS[m - 1]}`;
}

export function fmtShort(s: Ymd): string {
  const [, m, d] = s.split('-').map(Number) as [number, number, number];
  return `${DAYS_SHORT[dow(s)]} ${pad(d)}/${pad(m)}`;
}

export function fmtDayMonth(s: Ymd): string {
  const [, m, d] = s.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export function fmtDdMm(s: Ymd): string {
  const [, m, d] = s.split('-').map(Number) as [number, number, number];
  return `${pad(d)}/${pad(m)}`;
}

/** « il y a 2 h », « il y a 3 j » à partir d'un instant ISO. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 90) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400 * 1.5) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}
