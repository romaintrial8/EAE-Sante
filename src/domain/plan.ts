// Le plan de préparation S1 → S23, encodé depuis la passation v2 (04/10/2026).
// Le contenu de base reprend la passation. Deux choses s'adaptent à ta progression (voir adapt.ts) :
// 1. les allures : écrites {entre accolades} pour une VMA de 15,0 km/h, elles sont recalculées avec ta VMA du moment ;
//    « @4'03 » sans accolades est l'allure cible du 3000 m (12'10) et ne bouge pas ;
// 2. les renforts : lignes ajoutées aux séances quand une épreuve est en retard.
import type { TestEvent } from './bareme';
import { fmtPerf } from './bareme';
import { addDays, dow, mondayOfWeek, PLAN_WEEKS, weekOf, type Ymd } from './dates';
import { nextMilestone, TARGETS } from './targets';

export type SportCode = 'T-A' | 'VIT' | 'NAT' | 'T-B' | 'SEU' | 'SL' | 'TEST' | 'PENTA' | 'EF' | 'MARCHE' | 'FORCE';
export type Discipline = 'run' | 'swim' | 'strength' | 'test' | 'walk';
export type BlockKind = 'CG' | 'PSY' | 'ANG' | 'ACT' | 'DOS' | 'EXP' | 'ORAL' | 'SYN' | 'BILAN' | 'ENT';

export interface SportSession {
  id: string;
  date: Ymd;
  code: SportCode;
  discipline: Discipline;
  start: string;
  end: string;
  title: string;
  lines: string[];
  /** lignes ajoutées par l'adaptation (renforts) */
  boosts: string[];
  /** séance qualité : le garde-fou VFC / Body Battery s'applique */
  quality: boolean;
  tests: TestEvent[];
  optional?: boolean;
}

export interface Block { id: string; date: Ymd; kind: BlockKind; start: string; end: string; title: string; detail?: string }
export interface Reminder { id: string; date: Ymd; time: string; title: string; boosted?: boolean }

export interface DayPlan {
  date: Ymd;
  week: number;
  zone: 'LR' | 'Paris';
  sport: SportSession[];
  blocks: Block[];
  reminders: Reminder[];
  flags: string[];
}

export interface WeekDef {
  n: number;
  bloc: 1 | 2 | 3;
  km: number;
  vit: string;
  seu: string;
  sl: string;
  tirA: string;
  /** null : contenu de base de T-B, sans précision ; 'SUPPR' : séance supprimée */
  tirB: string | null;
  abdos: string;
  notes: string[];
  deload?: boolean;
  abdoTest?: boolean;
  testWeek?: boolean;
  slEarly?: boolean;
  penta?: number;
  oral?: { n: number; dow: 5 | 6; start: string; end: string };
}

/** Contexte d'adaptation de la semaine. */
export interface PlanCtx {
  vma: number;
  boosts: Partial<Record<TestEvent, 1 | 2>>;
  km: number;
}

export const VMA_REF = 15.0;
const BASE_CTX: PlanCtx = { vma: VMA_REF, boosts: {}, km: 0 };

export const BLOCS: Record<1 | 2 | 3, string> = { 1: 'Fondation', 2: 'Développement', 3: 'Spécifique et affûtage' };

export const WEEKS: WeekDef[] = [
  { n: 1, bloc: 1, km: 13, vit: "TEST sprint 50 m (2 essais, récup 5') + 2×6 × 30/30 @{4'00}", seu: 'TEST 3000 m chrono', sl: "40' EF", tirA: '6×2', tirB: 'nég. 4×3', abdos: '4×20 cadence + réglage position', notes: ['Ouverture des inscriptions ~mar 06/10 09 h Paris = 02 h LR'] },
  { n: 2, bloc: 1, km: 14, vit: "4×30 m + 2×7 × 30/30 @{4'00}", seu: "2×8' @{4'38} r 2'", sl: "45' EF", tirA: '7×2', tirB: 'nég. 5×3', abdos: 'EMOM 5×22', notes: [] },
  { n: 3, bloc: 1, km: 16, vit: "5×30 m + 2×8 × 30/30 @{4'00}", seu: "2×9' @{4'38}", sl: "50' EF", tirA: '7×3', tirB: 'nég. 5×4', abdos: 'EMOM 5×24', abdoTest: true, notes: [] },
  { n: 4, bloc: 1, km: 12, vit: '4×30 m + 1×8 × 30/30 léger', seu: "2×7' @{4'45} souple", sl: "40' EF", tirA: 'allégé + GTG', tirB: 'allégé + GTG', abdos: 'technique seule', deload: true, notes: ['Décharge', 'Écart Paris 6 h jusqu’au 01/11'] },
  { n: 5, bloc: 1, km: 18, vit: "5×35 m + 2×9 × 30/30 @{4'00}", seu: "2×10' @{4'38}", sl: "55' EF", tirA: '6×3 (lest 5 kg si max ≥ 8)', tirB: null, abdos: 'EMOM 6×24', notes: ['⚠ Dépôt du dossier ADMISSIO (deadline interne ven 06/11)'] },
  { n: 6, bloc: 1, km: 20, vit: "6×35 m + 10 × 30/30 @{3'49}", seu: "3×8' @{4'35}", sl: "60' EF", tirA: 'densité EMOM', tirB: null, abdos: 'EMOM 6×26', abdoTest: true, notes: ['Commander joystick T.16000M + palonniers TFRP'] },
  { n: 7, bloc: 1, km: 16, vit: 'TEST sprint 50 m + 1×8 × 30/30', seu: 'TEST 3000 m', sl: "TEST tractions + abdos puis 45' EF", tirA: 'léger (test samedi) — volume non précisé', tirB: 'léger (test samedi) — volume non précisé', abdos: 'pas de volume (test samedi)', testWeek: true, notes: ['TEST #2', '⚠ Clôture des inscriptions ~ven 20/11 12 h Paris = 05 h LR'] },
  { n: 8, bloc: 2, km: 15, vit: '4×30 m + 1×8 × 30/30', seu: "2×8' souple", sl: "40' EF", tirA: 'allégé', tirB: 'SUPPR', abdos: 'technique', deload: true, notes: ['Décharge', 'Thanksgiving jeu 26/11 (repas libre)'] },
  { n: 9, bloc: 2, km: 22, vit: "5×35 m + 5×500 @{4'13} r 1'30", seu: "2×10' @{4'35}", sl: "55' EF", tirA: 'lest 6 kg 4×4', tirB: null, abdos: 'EMOM 6×26', slEarly: true, oral: { n: 1, dow: 5, start: '11:00', end: '12:30' }, notes: ['Oral blanc 1 — sam 05/12'] },
  { n: 10, bloc: 2, km: 24, vit: "6×40 m + 5×600 @{4'13} r 1'45", seu: "18' continu @{4'38}", sl: "60' EF", tirA: 'densité', tirB: 'nég. 5×4', abdos: '4×30 cadence', abdoTest: true, notes: [] },
  { n: 11, bloc: 2, km: 26, vit: "6×40 m + 6×600 @{4'10}", seu: "2×11' @{4'33}", sl: "65' EF", tirA: 'lest 7-8 kg 5×3', tirB: null, abdos: 'EMOM 6×28', slEarly: true, oral: { n: 2, dow: 5, start: '11:00', end: '12:30' }, notes: ['Oral blanc 2 — sam 19/12', 'Pic de volume du bloc 2'] },
  { n: 12, bloc: 2, km: 18, vit: '4×30 m + 2×6 × 30/30', seu: "2×8' souple", sl: "45' EF", tirA: 'allégé + GTG', tirB: 'SUPPR', abdos: 'technique', deload: true, notes: ['Décharge', 'SEU avancée au jeudi 24/12', 'Noël ven 25/12 OFF'] },
  { n: 13, bloc: 2, km: 24, vit: "6×40 m + 3×1000 @{4'05} r 2'", seu: "20' @{4'38}", sl: "60' EF", tirA: 'densité EMOM', tirB: 'nég.', abdos: '4×32 cadence', notes: ['Jour de l’An ven 01/01 OFF', 'SEU sam 02/01, SL dim 03/01'] },
  { n: 14, bloc: 2, km: 27, vit: "6×40 m + 8×400 @{3'49} r 1'30", seu: "2×12' @{4'33}", sl: "65' progressif", tirA: 'lest 8-10 kg', tirB: null, abdos: 'EMOM 6×28', abdoTest: true, slEarly: true, oral: { n: 3, dow: 5, start: '11:00', end: '12:30' }, notes: ['Oral blanc 3 — sam 09/01', 'Pic de volume du plan'] },
  { n: 15, bloc: 2, km: 22, vit: 'TEST sprint 50 m + 1×8 × 30/30', seu: 'TEST 3000 m', sl: "TEST tractions + abdos puis 50' EF", tirA: 'léger (test samedi) — volume non précisé', tirB: 'léger (test samedi) — volume non précisé', abdos: 'pas de volume (test samedi)', testWeek: true, notes: ['TEST #3'] },
  { n: 16, bloc: 3, km: 18, vit: '4×30 m + 2×6 × 30/30', seu: "2×8' souple", sl: "45' EF", tirA: 'allégé + GTG', tirB: 'allégé + GTG', abdos: 'technique', deload: true, slEarly: true, oral: { n: 4, dow: 5, start: '11:00', end: '12:30' }, notes: ['Décharge', 'Oral blanc 4 — sam 23/01'] },
  { n: 17, bloc: 3, km: 28, vit: "6×40 m + 4×800 @4'03 r 2'", seu: "2×12' @{4'30}", sl: "65'", tirA: 'pic force lest 10 kg', tirB: 'pic force lest 10 kg', abdos: '4×34 cadence', slEarly: true, oral: { n: 5, dow: 5, start: '11:00', end: '12:30' }, notes: ['Oral blanc 5 — sam 30/01'] },
  { n: 18, bloc: 3, km: 24, vit: "4×30 m + 3×1000 @4'03", seu: "20' EF + 4 lignes droites", sl: 'PENTATHLON COMPLET #1', tirA: 'normal', tirB: 'allégée', abdos: '2×30 cadence', penta: 1, notes: ['SIMULATION #1 (ordre des épreuves du concours)'] },
  { n: 19, bloc: 3, km: 28, vit: "6×40 m + 5×800 @4'03", seu: "22' continu @{4'33}", sl: "65'", tirA: 'max frais + GTG', tirB: 'max frais + GTG', abdos: '3× séries 45" allure', abdoTest: true, slEarly: true, oral: { n: 6, dow: 5, start: '11:00', end: '12:30' }, notes: ['Oral blanc 6 — sam 13/02', 'Fenêtre CEMPN (à confirmer DESC)'] },
  { n: 20, bloc: 3, km: 22, vit: "4×30 m + 4×400 @{3'55}", seu: "15' EF + lignes droites", sl: 'PENTATHLON COMPLET #2', tirA: 'normal', tirB: 'allégée', abdos: '2×30 cadence', penta: 2, oral: { n: 7, dow: 6, start: '11:00', end: '12:30' }, notes: ['SIMULATION #2', 'Fin du déficit calorique', 'Oral blanc 7 — dim 21/02 11 h'] },
  { n: 21, bloc: 3, km: 20, vit: "4×30 m + 3×1000 @{4'00}", seu: "2×10' @{4'33}", sl: "50' EF", tirA: 'singles frais', tirB: 'singles frais', abdos: '3×30', notes: ['Dernière semaine aux USA · préparation du départ'] },
  { n: 22, bloc: 3, km: 14, vit: '', seu: '', sl: '', tirA: 'volume réduit', tirB: 'SUPPR', abdos: '2×30 + test', notes: ['RETOUR FRANCE · heure de Paris', 'Oral blanc 8 — sam 06/03 18 h Paris', 'Certificat médical sportif dès J1'] },
  { n: 23, bloc: 3, km: 10, vit: '', seu: '', sl: '', tirA: '2-3 tractions fraîches', tirB: 'SUPPR', abdos: '1×20 rythme', notes: ['AFFÛTAGE FINAL'] },
];

export const CG_THEMES: string[] = [
  'Vision stratégique du CEMAAE & organisation de l’AAE',
  'Dissuasion nucléaire & format de l’AAE',
  'LPM, budget & stratégie de défense',
  'Guerre en Ukraine',
  'OTAN & autonomie stratégique européenne',
  'Guerre d’Iran & Moyen-Orient',
  'Chine, Taïwan & Indopacifique',
  'Sahel & Afrique',
  'Technologies : IA, espace, cyber, fonds marins',
  'Programmes & industrie de défense (Rafale, SCAF)',
  'Sécurité sanitaire & crises',
  'Histoire de l’aviation militaire française',
  'Dissuasion — actualisation',
  'LPM & budget — actualisation',
  'Ukraine — actualisation',
  'OTAN / Europe — actualisation',
  'Moyen-Orient — actualisation',
  'Indopacifique — actualisation',
  'Afrique — actualisation',
  'Technologies — actualisation',
  'Industrie — actualisation',
  'Crises — actualisation',
];

export const GUARD_LINE = 'Garde-fou : VFC déséquilibrée 2 jours ou Body Battery < 40 au réveil → remplacer par 40\' EF.';
export const SITUPS_PROTOCOL = 'Protocole : allongé, mains derrière la tête, plantes de pieds jointes (papillon) ; toucher le sol devant les pieds ; pieds et bassin au sol en permanence, aucun maintien des pieds.';

const PSY_ROTATION: Record<number, string> = {
  1: 'TAMI-C : codage, attention, français',
  2: 'Maths 1 (éliminatoire) + maths 3 : conversions, échelles, produits en croix',
  3: 'Rotation mentale, cubes, orientation, lecture de cadrans',
  4: 'Priorisation drones + priorisation vaisseau (règles par cœur)',
};

const OFF_DAYS: Record<Ymd, string> = { '2026-12-25': 'Noël — journée OFF', '2027-01-01': 'Jour de l’An — journée OFF' };
const DAY_FLAGS: Record<Ymd, string> = {
  '2026-11-26': 'Thanksgiving — repas libre, pas de T-B',
  '2027-03-01': 'Retour en France (date à confirmer) · certificat médical : prendre rendez-vous',
};

export function weekDef(n: number): WeekDef | undefined {
  return WEEKS[n - 1];
}

// ───────────────────────── allures ─────────────────────────

function toSec(p: string): number {
  const m = p.match(/(\d)'(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

export function fmtPace(sec: number): string {
  const r = Math.round(sec);
  const m = Math.floor(r / 60);
  const s = r - m * 60;
  return `${m}'${s < 10 ? '0' + s : s}`;
}

function fmtSplit(sec: number): string {
  const r = Math.round(sec);
  return r >= 60 ? fmtPace(r) : `${r}"`;
}

const scaled = (sec: number, vma: number) => Math.round((sec * VMA_REF) / vma);

/** Remplace chaque allure {m'ss} (écrite pour VMA 15,0) par l'allure à ta VMA du moment. */
export function renderPaces(text: string, vma: number): string {
  return text.replace(/\{(\d'\d{2})\}/g, (_, p: string) => fmtPace(scaled(toSec(p), vma)));
}

function zoneLabel(sec: number, vma: number, fixed: boolean): string {
  if (fixed) {
    const over = 3600 / sec > vma;
    return `allure cible 3000 m (12'10)${over ? ' — plus rapide que ta VMA estimée : tiens ce que tu peux' : ''}`;
  }
  const pct = 3600 / sec / vma;
  if (pct >= 1.03) return '≈ 105 % VMA';
  if (pct >= 0.985) return '≈ 100 % VMA';
  if (pct >= 0.935) return '≈ 95 % VMA';
  if (pct >= 0.86) return 'seuil';
  return 'seuil souple';
}

/** Temps de passage et zone, calculés depuis le texte à accolades et ta VMA. */
export function paceNote(text: string, vma: number = VMA_REF): string | null {
  const notes: string[] = [];
  const res = (tok: string) => ({ sec: tok.startsWith('{') ? scaled(toSec(tok), vma) : toSec(tok), fixed: !tok.startsWith('{') });
  for (const m of text.matchAll(/(\d+)\s*×\s*(\d{3,4})\s*@(\{?\d'\d{2}\}?)/g)) {
    const d = Number(m[2]);
    const { sec } = res(m[3] ?? '');
    if (sec) notes.push(`${d} m en ${fmtSplit((d / 1000) * sec)}`);
  }
  const ff = text.match(/30\/30\s*@(\{?\d'\d{2}\}?)/);
  if (ff) {
    const { sec } = res(ff[1] ?? '');
    if (sec) notes.push(`≈ ${Math.round(((30 / sec) * 1000) / 5) * 5} m par fraction de 30 s`);
  }
  const any = text.match(/@(\{?\d'\d{2}\}?)/);
  if (any) {
    const { sec, fixed } = res(any[1] ?? '');
    if (sec) notes.push(`${fmtPace(sec)}/km = ${zoneLabel(sec, vma, fixed)}`);
  }
  return notes.length ? notes.join(' · ') : null;
}

/** Allure (s/km) du prochain jalon du 3000 m. */
export function milestonePace(date: Ymd): { sec: number; label: string } {
  const m = nextMilestone(date);
  const key = m.key === 'S0' ? 'S7' : m.key;
  return { sec: TARGETS.run3000[key] / 3, label: `${m.label} (${fmtPerf('run3000', TARGETS.run3000[key])})` };
}

// ───────────────────────── génération ─────────────────────────

function jalonLine(ev: TestEvent, date: Ymd): string {
  const m = nextMilestone(date);
  if (m.key === 'S0') return '';
  const t = TARGETS[ev];
  const v = t[m.key];
  const txt = t.text?.[m.key];
  const better = ev === 'pullups' || ev === 'situps' ? '≥' : '≤';
  return `${m.label} : ${better} ${txt ?? fmtPerf(ev, v)}${ev === 'pullups' || ev === 'situps' ? ' rép.' : ''}`;
}

function S(date: Ymd, code: SportCode, discipline: Discipline, start: string, end: string, title: string, lines: string[], quality = false, tests: TestEvent[] = []): SportSession {
  const l = quality ? [...lines, GUARD_LINE] : lines;
  return { id: `${date}/s/${code}`, date, code, discipline, start, end, title, lines: l, boosts: [], quality, tests };
}

function B(date: Ymd, kind: BlockKind, start: string, end: string, title: string, detail?: string): Block {
  return { id: `${date}/c/${kind}${start.replace(':', '')}`, date, kind, start, end, title, detail };
}

function ef(c: PlanCtx): string {
  return renderPaces("{6'00}-{6'20}/km", c.vma);
}

function vitSession(date: Ymd, w: WeekDef, c: PlanCtx): SportSession {
  const parts = w.vit.split(' + ');
  const first = parts[0] ?? '';
  const rest = parts.slice(1).join(' + ');
  const note = paceNote(rest, c.vma);
  const restTxt = renderPaces(rest, c.vma);
  if (first.startsWith('TEST')) {
    const desc = first.replace(/^TEST sprint 50 m\s*/, '').replace(/[()]/g, '');
    return S(date, 'TEST', 'test', '16:15', '17:30', `TEST sprint 50 m + ${restTxt}`, [
      "Échauffement 15' + gammes",
      `TEST sprint 50 m${desc ? ' : ' + desc : ''} — ${jalonLine('sprint50', date) || 'référence de départ'}`,
      `Puis fractionné : ${restTxt}${note ? ' (' + note + ')' : ''}`,
      "Retour au calme 10'",
    ], true, ['sprint50']);
  }
  return S(date, 'VIT', 'run', '16:15', '17:30', `${restTxt} + départs ${first}`, [
    "Échauffement 15' + gammes",
    `Départs 50 m : ${first} (sur 30-40 m), récupération complète 3-4'`,
    `Fractionné VMA : ${restTxt}${note ? ' — ' + note : ''}`,
    "Retour au calme 10'",
  ], true);
}

function natSession(date: Ymd, w: WeekDef): SportSession {
  if (w.testWeek) {
    return S(date, 'TEST', 'test', '16:15', '17:15', 'TEST natation 50 m', [
      'Échauffement 200 m + 4 départs plongés',
      `TEST 50 m nage libre chrono — ${jalonLine('swim50', date)}`,
      'Puis technique : coulées et virages, sans fatigue',
    ], true, ['swim50']);
  }
  return S(date, 'NAT', 'swim', '16:15', '17:15', 'Natation : départs, sprint, allure cible', [
    'Échauffement 200 m',
    '8 départs plongés + coulée (viser 10-12 m)',
    '6×25 m sprint départ plongé',
    '4×50 m allure cible (30"8)',
    'Virages',
  ]);
}

function taSession(date: Ymd, w: WeekDef): SportSession {
  return S(date, 'T-A', 'strength', '16:15', '17:15', `Tirage volume — ${w.tirA.split(' — ')[0]}`, [
    "Échauffement épaules/coudes 10'",
    `Tractions strictes : ${w.tirA}`,
    'Rowing 3×10-12',
    `Abdos : ${w.abdos}`,
    'Gainage',
  ]);
}

function tbSession(date: Ymd, w: WeekDef): SportSession {
  const t = (w.tirB ?? 'contenu de base').split(' — ')[0];
  return S(date, 'T-B', 'strength', '16:15', '17:15', `Tirage excentrique — ${t}`, [
    `Tractions négatives (descente 4-5") : ${w.tirB ?? 'volume non précisé, garde celui de la semaine précédente'}`,
    'Prise serrée / supination',
    'Rowing lourd 4×6-8',
    `Abdos : ${w.abdos}`,
    'Gainage anti-rotation',
  ]);
}

function seuSession(date: Ymd, w: WeekDef, c: PlanCtx, start = '16:15', end = '17:15'): SportSession {
  if (w.seu.startsWith('TEST')) {
    const mp = milestonePace(date);
    return S(date, 'TEST', 'test', start, end, 'TEST 3000 m chrono', [
      "Échauffement 15' EF + gammes + 2 accélérations",
      `TEST 3000 m chrono — ${jalonLine('run3000', date) || 'référence de départ'}`,
      `Allure du ${mp.label} : ${fmtPace(mp.sec)}/km, soit 1000 m en ${fmtPace(mp.sec)} et 400 m en ${fmtSplit(mp.sec * 0.4)}`,
      "Retour au calme 10'",
    ], true, ['run3000']);
  }
  const note = paceNote(w.seu, c.vma);
  const body = renderPaces(w.seu, c.vma);
  return S(date, 'SEU', 'run', start, end, `Seuil — ${body}`, [
    `Échauffement 15' EF (${ef(c)})`,
    `Corps de séance : ${body}${note ? ' — ' + note : ''}`,
    "Retour au calme 10'",
  ], true);
}

function slSession(date: Ymd, w: WeekDef, c: PlanCtx, start: string, end: string): SportSession {
  if (w.testWeek) {
    const efTxt = w.sl.replace(/^.*puis\s*/, '');
    return S(date, 'TEST', 'test', start, end, `TEST tractions + abdos, puis ${efTxt}`, [
      `1. Tractions max à froid — ${jalonLine('pullups', date)}`,
      `2. Abdos test 60 s — ${jalonLine('situps', date)}`,
      SITUPS_PROTOCOL,
      `3. Sortie ${efTxt} (${ef(c)})`,
    ], true, ['pullups', 'situps']);
  }
  const lines: string[] = [];
  const tests: TestEvent[] = [];
  let i = 1;
  if (w.n % 2 === 0) { lines.push(`${i++}. Tractions max à froid (note le résultat)`); tests.push('pullups'); }
  if (w.abdoTest) { lines.push(`${i++}. Abdos test 60 s`, SITUPS_PROTOCOL); tests.push('situps'); }
  const prog = w.sl.includes('progressif') ? 'progressive' : 'fin progressive';
  lines.push(`${i}. Sortie longue ${w.sl} — ${renderPaces("{5'45}-{6'10}/km", c.vma)}, ${prog}`);
  return S(date, 'SL', 'run', start, end, `Sortie longue ${w.sl}`, lines, false, tests);
}

function pentaSession(date: Ymd, w: WeekDef): SportSession {
  return S(date, 'PENTA', 'test', '08:00', '12:00', `Pentathlon complet #${w.penta}`, [
    'Simulation dans l’ordre des épreuves du concours (vérifie l’ordre sur ta convocation)',
    `3000 m — ${jalonLine('run3000', date)}`,
    `Sprint 50 m — ${jalonLine('sprint50', date)}`,
    `Natation 50 m — ${jalonLine('swim50', date)}`,
    `Tractions — ${jalonLine('pullups', date)}`,
    `Abdos 60 s — ${jalonLine('situps', date)}`,
  ], true, ['run3000', 'sprint50', 'swim50', 'pullups', 'situps']);
}

function usaSport(date: Ymd, w: WeekDef, c: PlanCtx): SportSession[] {
  const d = dow(date);
  if (OFF_DAYS[date]) return [];
  if (date === '2026-12-24') return [seuSession(date, w, c)];
  if (date === '2027-01-02') return [seuSession(date, w, c, '09:00', '10:00')];
  if (date === '2027-01-03') return [slSession(date, w, c, '08:00', '09:30')];
  switch (d) {
    case 0: return [taSession(date, w)];
    case 1: return [vitSession(date, w, c)];
    case 2: return [natSession(date, w)];
    case 3: return w.tirB === 'SUPPR' ? [] : [tbSession(date, w)];
    case 4: return [seuSession(date, w, c)];
    case 5:
      if (w.penta) return [pentaSession(date, w)];
      return [w.slEarly ? slSession(date, w, c, '08:00', '09:30') : slSession(date, w, c, '09:00', '10:30')];
    default: return [];
  }
}

// ───────────────────────── renforts ─────────────────────────

function bumpAbdos(s: string): string | null {
  const m = s.match(/(\d+)×(\d+)/);
  return m ? s.replace(m[0], `${m[1]}×${Number(m[2]) + 2}`) : null;
}

function vitFraction(vit: string): { text: string; km: number } {
  const m = vit.match(/×\s*(\d{3,4})\s*@/);
  if (m) return { text: `1 fraction de ${m[1]} m en plus, même allure et même récupération`, km: Number(m[1]) / 1000 };
  return { text: '2 × 30/30 en plus, même allure', km: 0.25 };
}

/** Ajoute les renforts de la semaine aux séances du jour. Plafond : +10 % du kilométrage prévu pour la course. */
function applyBoosts(sport: SportSession[], date: Ymd, w: WeekDef, c: PlanCtx): SportSession[] {
  const b = c.boosts;
  if (!Object.keys(b).length) return sport;
  const out = sport.map((s) => ({ ...s, boosts: [...s.boosts] }));
  const budget = 0.1 * c.km;
  let used = 0;
  for (const s of out) {
    if (s.code === 'T-A') {
      if (b.pullups) s.boosts.push('Tractions : 1 série de plus, même nombre de répétitions. Douleur au coude : supprime-la.');
      if (b.sprint50 === 2) s.boosts.push('Échauffement : + 3 × 5 foulées bondissantes et 2 × 20 m départ arrêté.');
    }
    if ((s.code === 'T-A' || s.code === 'T-B') && b.situps) {
      const bumped = bumpAbdos(w.abdos);
      s.boosts.push(bumped ? `Abdos : ${bumped} au lieu de ${w.abdos} (+2 par série).` : 'Abdos : 1 série de plus au rythme du test (≈ 1,3 s par répétition).');
    }
    if (s.code === 'NAT') {
      if (b.swim50) s.boosts.push('Remplace 2 des 4 × 50 m par 4 × 15 m sprint max (récupération complète), et fais 2 départs plongés de plus.');
      if (b.situps === 2) s.boosts.push('Après la natation : 3 × 30 s d’abdos au rythme du test, récupération 1\'.');
    }
    if (s.code === 'VIT') {
      if (b.sprint50) s.boosts.push('Départs : 2 de plus, même récupération complète (3-4\').');
      if (b.run3000 === 2) {
        const f = vitFraction(w.vit);
        if (used + f.km + 1.1 <= budget) { s.boosts.push(`Fractionné : ${f.text}.`); used += f.km; }
      }
    }
    if (s.code === 'SEU' && b.run3000) {
      const n = budget - used >= 1.65 ? 3 : 2;
      const mp = milestonePace(date);
      s.boosts.push(`Avant le retour au calme : ${n} × 400 m à l'allure du ${mp.label}, ${fmtPace(mp.sec)}/km (400 m en ${fmtSplit(mp.sec * 0.4)}), récupération 1'15 trottinée.`);
      used += n * 0.55;
    }
    if (s.code === 'SL' && b.pullups === 2) {
      s.boosts.push(w.n % 2 === 0 ? 'Après le max à froid : 3 × (max − 2) tractions, récupération 2\'.' : 'Avant de courir : 5 × (max − 2) tractions, récupération 2\'.');
    }
  }
  if (b.swim50 === 2 && dow(date) === 6 && w.n <= 21) {
    out.push({
      id: `${date}/s/NAT-opt`, date, code: 'NAT', discipline: 'swim', start: '16:00', end: '16:30', optional: true,
      title: 'Natation technique (renfort, optionnelle)', lines: ['Départs plongés + coulées × 6', '4 × 15 m vite, récupération complète', 'Virages × 6'],
      boosts: ['Ajoutée parce que la natation est en gros retard. Saute-la si la piscine n’est pas accessible ou si tu es fatigué.'],
      quality: false, tests: [],
    });
  }
  return out;
}

// ───────────────────────── blocs concours, rappels, France ─────────────────────────

function usaBlocks(date: Ymd, w: WeekDef): Block[] {
  if (OFF_DAYS[date]) return [];
  const d = dow(date);
  const theme = CG_THEMES[w.n - 1] ?? '';
  const early = w.n <= 5;
  const out: Block[] = [];
  const oralToday = w.oral && w.oral.dow === d ? w.oral : null;
  switch (d) {
    case 0: out.push(B(date, 'CG', '20:00', '21:00', `Fiche culture G — ${theme}`)); break;
    case 1: out.push(B(date, 'PSY', '20:00', '20:30', `Psychotech — ${PSY_ROTATION[1]}`), B(date, 'ANG', '20:30', '21:00', 'Anglais')); break;
    case 2: out.push(B(date, 'PSY', '20:00', '20:30', `Psychotech — ${PSY_ROTATION[2]}`), early ? B(date, 'DOS', '20:30', '21:00', 'Dossier ADMISSIO') : B(date, 'ACT', '20:30', '21:00', 'Actualité défense')); break;
    case 3: out.push(B(date, 'PSY', '20:00', '20:30', `Psychotech — ${PSY_ROTATION[3]}`), B(date, 'ANG', '20:30', '21:00', 'Anglais')); break;
    case 4: out.push(B(date, 'PSY', '20:00', '20:30', `Psychotech — ${PSY_ROTATION[4]}`)); break;
    case 5:
      if (w.penta) break;
      if (oralToday) {
        out.push(B(date, 'ORAL', oralToday.start, oralToday.end, `Oral blanc ${oralToday.n} — visio 5e EC`, '18 h 00 – 19 h 30 heure de Paris · date à confirmer'));
      } else {
        out.push(B(date, 'EXP', '10:45', '11:45', `Exposé blanc filmé — ${theme}`));
        const even = w.n % 2 === 0;
        out.push(B(date, 'PSY', '11:45', '12:15', even ? 'Psychotech SECPIL — palonnier + manche + calcul mental' : 'Psychotech SECPIL — T3A + culture aéro'));
      }
      break;
    case 6:
      out.push(early ? B(date, 'DOS', '10:00', '12:00', 'Dossier ADMISSIO') : B(date, 'DOS', '10:00', '11:00', 'Dossier / préparation entretien'));
      if (oralToday) out.push(B(date, 'ORAL', oralToday.start, oralToday.end, `Oral blanc ${oralToday.n} — visio 5e EC`, '18 h 00 – 19 h 30 heure de Paris · date à confirmer'));
      out.push(B(date, 'SYN', '17:00', '17:30', 'Synthèse actu de la semaine'));
      out.push(B(date, 'BILAN', '18:00', '18:15', 'Bilan hebdo'));
      break;
  }
  return out;
}

function franceSport(date: Ymd, w: WeekDef, c: PlanCtx): SportSession[] {
  const d = dow(date);
  if (w.n === 22) {
    switch (d) {
      case 0: case 1: return [S(date, 'MARCHE', 'walk', '10:00', '10:30', "Marche 30' en lumière du jour", ['Pas de séance : recalage de l’horloge biologique (J1-J2 après l’arrivée)'])];
      case 2: return [S(date, 'EF', 'run', '10:00', '10:45', "Réactivation : 30' EF + 4 lignes droites", [`30' EF (${ef(c)})`, '4 lignes droites'])];
      case 3: {
        const t = "4×400 @{4'00} + 2 départs";
        return [S(date, 'VIT', 'run', '10:00', '11:00', renderPaces(t, c.vma), ["Échauffement 15' + gammes", '2 départs 50 m, récupération complète', `${renderPaces("4×400 m @{4'00}", c.vma)} — ${paceNote(t, c.vma) ?? ''}`, "Retour au calme 10'"], true)];
      }
      case 4: return [S(date, 'NAT', 'swim', '10:00', '11:00', 'Natation technique + 4×25', ['Échauffement 200 m', 'Technique : coulées, virages', '4×25 m vifs'])];
      case 5: return [S(date, 'SEU', 'run', '10:00', '11:00', "Seuil court 10' + test abdos", ["Échauffement 15' EF", `Seuil 10' @${renderPaces("{4'33}-{4'42}", c.vma)}`, 'Abdos test 60 s', SITUPS_PROTOCOL], true, ['situps'])];
      default: return [];
    }
  }
  switch (d) {
    case 0: return [S(date, 'VIT', 'run', '10:00', '11:00', renderPaces("Ouvreurs : 3-4×200 @{3'45} + 2 départs 50 m", c.vma), ["Échauffement 15' + gammes", `3-4×200 m @${renderPaces("{3'45}", c.vma)}`, '2 départs 50 m', "Retour au calme 10'"], true)];
    case 1: return [S(date, 'NAT', 'swim', '10:00', '10:45', '2 départs plongés + 2×25 vifs', ['Échauffement 200 m', '2 départs plongés', '2×25 m vifs'])];
    case 2: return [S(date, 'FORCE', 'strength', '10:00', '10:30', '2-3 tractions fraîches + 1×20 abdos rythme', ['2-3 tractions fraîches, loin de l’échec', '1×20 abdos au rythme du test'])];
    case 3: return [S(date, 'EF', 'run', '10:00', '10:30', "20' EF + 3 lignes droites", ["20' EF", '3 lignes droites'])];
    case 5: return [S(date, 'EF', 'run', '10:00', '10:30', "30' EF très facile", ["30' EF très facile"])];
    default: return [];
  }
}

function franceBlocks(date: Ymd, w: WeekDef): Block[] {
  const d = dow(date);
  if (d === 6) return [B(date, 'BILAN', '18:00', '18:15', 'Bilan hebdo')];
  const theme = w.n === 22 ? ` — fiche S22 : ${CG_THEMES[21]}` : '';
  const out = [
    B(date, 'ENT', '14:00', '15:30', `Entretien / culture générale${d === 0 ? theme : ''}`, 'Révision du fichier des 114 questions, exposés'),
    B(date, 'ANG', '16:00', '16:45', 'Anglais : commentaire oral chronométré'),
    B(date, 'PSY', '17:00', '17:30', 'Psychotech'),
  ];
  if (w.n === 22 && d === 5) out.push(B(date, 'ORAL', '18:00', '19:30', 'Oral blanc 8 — visio 5e EC', 'Heure de Paris · date à confirmer'));
  return out;
}

/** Seuls les rappels qui touchent à l'entraînement restent dans l'app (les autres sont dans ton calendrier iPhone). */
function reminders(date: Ymd, c: PlanCtx): Reminder[] {
  const d = dow(date);
  const r: Reminder[] = [];
  if (d === 2) r.push({ id: `${date}/r/pesee`, date, time: '05:45', title: 'Pesée' });
  if (d === 5) r.push({ id: `${date}/r/pesee`, date, time: '07:30', title: 'Pesée' });
  if (c.boosts.pullups) r.push({ id: `${date}/r/gtg`, date, time: '18:30', title: 'GTG renforcé : 5 × 2-3 tractions strictes dans la journée (≈ 40 % de ton max)', boosted: true });
  else if (d !== 0 && d !== 3) r.push({ id: `${date}/r/gtg`, date, time: '18:30', title: 'GTG : 4 à 6 × 2 tractions strictes avant 21 h' });
  return r;
}

const cache = new Map<string, DayPlan>();

function ctxKey(c: PlanCtx): string {
  return `${c.vma}|${Object.entries(c.boosts).map(([k, v]) => k + v).sort().join(',')}|${c.km}`;
}

export function dayPlan(date: Ymd, ctx?: PlanCtx): DayPlan {
  const c = ctx ?? BASE_CTX;
  const key = `${date}|${ctxKey(c)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = weekOf(date);
  const w = weekDef(n);
  let plan: DayPlan;
  if (!w) {
    const flags = date >= '2027-03-15' && date <= '2027-03-26' ? ['Fenêtre probable des épreuves d’admission — BA 705 Tours (à confirmer)'] : [];
    plan = { date, week: n, zone: n > PLAN_WEEKS ? 'Paris' : 'LR', sport: [], blocks: [], reminders: [], flags };
  } else {
    const france = n >= 22;
    const flags: string[] = [];
    if (OFF_DAYS[date]) flags.push(OFF_DAYS[date] as string);
    if (DAY_FLAGS[date]) flags.push(DAY_FLAGS[date] as string);
    if (dow(date) === 6 && n === 23) flags.push('Veille de la fenêtre d’épreuves');
    const base = france ? franceSport(date, w, c) : usaSport(date, w, c);
    plan = {
      date, week: n, zone: france ? 'Paris' : 'LR',
      sport: applyBoosts(base, date, w, c),
      blocks: france ? franceBlocks(date, w) : usaBlocks(date, w),
      reminders: reminders(date, c),
      flags,
    };
  }
  if (cache.size > 2000) cache.clear();
  cache.set(key, plan);
  return plan;
}

export function weekDays(n: number, ctx?: PlanCtx): DayPlan[] {
  const mon = mondayOfWeek(n);
  return Array.from({ length: 7 }, (_, i) => dayPlan(addDays(mon, i), ctx));
}

/** Tous les éléments cochables d'un jour (séances, blocs concours, rappels). */
export function dayItemIds(p: DayPlan): string[] {
  return [...p.sport.map((s) => s.id), ...p.blocks.map((b) => b.id), ...p.reminders.map((r) => r.id)];
}
