// Échéances administratives et rendez-vous concours (passation v2, §7).
import type { Ymd } from './dates';

export type DeadlineKind = 'admin' | 'deadline' | 'oral' | 'test' | 'travel' | 'exam';

export interface Deadline {
  id: string;
  date: Ymd;
  /** heure de Little Rock (ou de Paris à partir du 01/03), si utile */
  time?: string;
  title: string;
  detail?: string;
  kind: DeadlineKind;
  /** date transposée ou proposée, à confirmer */
  tbc?: boolean;
  /** date approximative (« ~ ») */
  approx?: boolean;
  critical?: boolean;
}

export const DEADLINES: Deadline[] = [
  { id: 'dl-avis', date: '2026-10-09', title: 'Vérifier l’avis de concours 2027 au JO + page EAE Titres', detail: 'Lancer la collecte des relevés de notes (ENSAM, prépa, bac).', kind: 'admin' },
  { id: 'dl-ouverture', date: '2026-10-06', time: '02:00', title: 'Ouverture des inscriptions ADMISSIO', detail: '09 h heure de Paris = 02 h Little Rock.', kind: 'admin', tbc: true, approx: true },
  { id: 'dl-lettre', date: '2026-10-11', title: 'Lettre de motivation v1', detail: '2 pages minimum, Times 12, interligne simple, datée, signée.', kind: 'admin' },
  { id: 'dl-pieces', date: '2026-10-18', title: 'Toutes les pièces réunies en PDF < 2 Mo', kind: 'admin' },
  { id: 'dl-depot', date: '2026-11-06', title: 'Dépôt complet du dossier ADMISSIO', detail: 'Deadline interne, deux semaines avant la clôture.', kind: 'deadline', critical: true },
  { id: 'dl-joystick', date: '2026-11-09', title: 'Commander joystick T.16000M + palonniers TFRP', detail: 'Pour l’entraînement SECPIL.', kind: 'admin' },
  { id: 'dl-test2', date: '2026-11-17', title: 'TEST #2 (S7)', detail: 'Sprint mar 17/11 · natation mer 18/11 · 3000 m ven 20/11 · tractions + abdos sam 21/11.', kind: 'test' },
  { id: 'dl-cloture', date: '2026-11-20', time: '05:00', title: 'CLÔTURE DES INSCRIPTIONS — irréversible', detail: '12 h heure de Paris = 05 h Little Rock.', kind: 'deadline', tbc: true, approx: true, critical: true },
  { id: 'dl-liste', date: '2026-12-14', title: 'Liste des candidats autorisés à concourir', detail: 'Vérifier ta présence sur la liste (≈ semaine 50).', kind: 'admin', approx: true },
  { id: 'dl-test3', date: '2027-01-12', title: 'TEST #3 (S15)', detail: 'Sprint mar 12/01 · natation mer 13/01 · 3000 m ven 15/01 · tractions + abdos sam 16/01.', kind: 'test' },
  { id: 'dl-jury', date: '2027-02-01', title: 'Jury d’admissibilité', kind: 'admin', approx: true },
  { id: 'dl-penta1', date: '2027-02-06', time: '08:00', title: 'Pentathlon complet #1', detail: 'Simulation dans l’ordre des épreuves du concours.', kind: 'test' },
  { id: 'dl-cempn', date: '2027-02-09', title: 'Fenêtre CEMPN — convocation par la DESC', detail: 'Ne jamais prendre rendez-vous soi-même. Modalités candidat à l’étranger à confirmer avec la DESC.', kind: 'admin', tbc: true, approx: true },
  { id: 'dl-admissibles', date: '2027-02-15', title: 'Liste des admissibles + convocation par courriel', kind: 'admin', approx: true },
  { id: 'dl-penta2', date: '2027-02-20', time: '08:00', title: 'Pentathlon complet #2', kind: 'test' },
  { id: 'dl-retour', date: '2027-03-01', title: 'Vol retour France', kind: 'travel', tbc: true, approx: true },
  { id: 'dl-certif', date: '2027-03-01', title: 'Certificat médical sportif (modèle EAE)', detail: 'Daté de moins d’un an le jour des épreuves. Rendez-vous dès J1 du retour, ou vérifier si un médecin américain peut le signer.', kind: 'admin', tbc: true, critical: true },
  { id: 'dl-epreuves', date: '2027-03-15', title: 'Épreuves d’admission — BA 705 Tours', detail: 'Fenêtre ≈ 15-26 mars 2027, transposée de 2026. À confirmer sur l’avis 2027.', kind: 'exam', tbc: true, approx: true, critical: true },
];

export interface MockOral { n: number; date: Ymd; lr: string; paris: string }

/** Oraux blancs en visio avec les officiers de la 5e escadre de chasse (dates proposées, à confirmer). */
export const MOCK_ORALS: MockOral[] = [
  { n: 1, date: '2026-12-05', lr: '11:00', paris: '18:00' },
  { n: 2, date: '2026-12-19', lr: '11:00', paris: '18:00' },
  { n: 3, date: '2027-01-09', lr: '11:00', paris: '18:00' },
  { n: 4, date: '2027-01-23', lr: '11:00', paris: '18:00' },
  { n: 5, date: '2027-01-30', lr: '11:00', paris: '18:00' },
  { n: 6, date: '2027-02-13', lr: '11:00', paris: '18:00' },
  { n: 7, date: '2027-02-21', lr: '11:00', paris: '18:00' },
  { n: 8, date: '2027-03-06', lr: '—', paris: '18:00' },
];

export function sortedDeadlines(): Deadline[] {
  return [...DEADLINES].sort((a, b) => (a.date === b.date ? (a.time ?? '').localeCompare(b.time ?? '') : a.date.localeCompare(b.date)));
}
