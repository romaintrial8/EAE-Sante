// Faits enregistrés. Rien de calculé n'est stocké : notes, bilans, garde-fou et courbes se recalculent.
import type { TestEvent } from './bareme';
import type { Ymd } from './dates';

export interface Rec { id: string; updatedAt: string; deleted?: true }

/** Données santé du jour, telles que reçues de Garmin via Intervals.icu. Unités SI. */
export interface WellnessRec extends Rec {
  date: Ymd;
  sleepScore?: number;
  sleepSecs?: number;
  hrv?: number;          // rMSSD moyen de la nuit, ms
  restingHR?: number;    // bpm
  avgSleepingHR?: number;
  weight?: number;       // kg
  bodyBattery?: number;  // 0-100
  readiness?: number;
  spO2?: number;
  steps?: number;
  respiration?: number;
  /** champs non vides reçus, pour la carte diagnostic */
  fields: string[];
}

export type HrvStatus = 'balanced' | 'unbalanced' | 'low';

/** Saisie humaine du matin : prime toujours sur l'import, n'est jamais écrasée par lui. */
export interface CheckinRec extends Rec {
  date: Ymd;
  bodyBattery?: number;
  hrvStatus?: HrvStatus;
  weight?: number;
  sleepScore?: number;
  restingHR?: number;
  note?: string;
}

export interface ActivityRec extends Rec {
  date: Ymd;
  start: string;   // date-heure locale de la séance, « 2026-10-24T09:02:11 »
  type: string;    // type Intervals.icu : Run, Swim, WeightTraining…
  name: string;
  distance?: number;   // m
  movingTime?: number; // s
  elapsed?: number;    // s
  avgHR?: number;
  maxHR?: number;
  load?: number;
  avgSpeed?: number;   // m/s
}

export interface TestRec extends Rec {
  date: Ymd;
  event: TestEvent;
  value: number; // répétitions ou secondes
  note?: string;
  source: 'manual' | 's0';
}

export type DoneStatus = 'done' | 'swapped' | 'skipped';

/** Élément du plan coché (séance, bloc concours, rappel). id = identifiant de l'élément. */
export interface DoneRec extends Rec {
  status: DoneStatus;
  rpe?: number;
  note?: string;
}

/** Échéance administrative traitée. id = identifiant de l'échéance. */
export interface DeadlineRec extends Rec { done: boolean }

export interface AppData {
  wellness: Record<string, WellnessRec>;
  checkin: Record<string, CheckinRec>;
  activity: Record<string, ActivityRec>;
  tests: Record<string, TestRec>;
  done: Record<string, DoneRec>;
  deadlines: Record<string, DeadlineRec>;
}

export type Coll = keyof AppData;
export const COLLS: Coll[] = ['wellness', 'checkin', 'activity', 'tests', 'done', 'deadlines'];

export function emptyData(): AppData {
  return { wellness: {}, checkin: {}, activity: {}, tests: {}, done: {}, deadlines: {} };
}

/** Enregistrements vivants (sans pierres tombales). */
export function live<T extends Rec>(m: Record<string, T>): T[] {
  return Object.values(m).filter((r) => !r.deleted);
}
