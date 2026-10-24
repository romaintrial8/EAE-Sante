import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dow, range, weekOf } from '../src/domain/dates.ts';
import { fmtPerf, noteFor, parsePerf } from '../src/domain/bareme.ts';
import { dayItemIds, dayPlan, paceNote } from '../src/domain/plan.ts';
import { dayHealth, guardFor, hrvLow, runKmWeek } from '../src/domain/health.ts';
import { mapActivity, mapWellness } from '../src/domain/intervals.ts';
import { makeBackup, parseBackup } from '../src/domain/backup.ts';
import { emptyData, type AppData } from '../src/domain/types.ts';
import { weightTarget } from '../src/domain/targets.ts';
import { sportScore, weekCompletion } from '../src/domain/progress.ts';

const NOW = '2026-10-24T12:00:00.000Z';

test('semaines du plan et jours civils', () => {
  assert.equal(weekOf('2026-10-05'), 1);
  assert.equal(weekOf('2026-10-11'), 1);
  assert.equal(weekOf('2026-10-12'), 2);
  assert.equal(weekOf('2026-10-24'), 3);
  assert.equal(weekOf('2026-10-04'), 0);
  assert.equal(weekOf('2027-03-14'), 23);
  assert.equal(dow('2026-10-24'), 5); // samedi
  assert.equal(dow('2026-10-25'), 6); // dimanche
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-11-01', 1), '2026-11-02'); // changement d'heure US
  assert.equal(addDays('2027-03-28', 1), '2027-03-29'); // changement d'heure FR
});

test('barème officiel : arrondi à la valeur inférieure', () => {
  assert.equal(noteFor('pullups', 5), 8);
  assert.equal(noteFor('pullups', 12), 15);
  assert.equal(noteFor('pullups', 1), 0);
  assert.equal(noteFor('pullups', 20), 20);
  assert.equal(noteFor('situps', 40), 15);
  assert.equal(noteFor('situps', 41), 15);
  assert.equal(noteFor('situps', 46), 18);
  assert.equal(noteFor('situps', 11), 0);
  assert.equal(noteFor('swim50', 32.5), 15); // résultat S0 de la passation
  assert.equal(noteFor('swim50', 30.8), 18);
  assert.equal(noteFor('swim50', 30.85), 17);
  assert.equal(noteFor('run3000', 730), 13); // 12'10
  assert.equal(noteFor('run3000', 731), 12);
  assert.equal(noteFor('run3000', 770), 11); // 12'50
  assert.equal(noteFor('run3000', 785), 10); // 13'05
  assert.equal(noteFor('sprint50', 6.97), 12);
  assert.equal(noteFor('sprint50', 7.0), 11);
  assert.equal(noteFor('sprint50', 9), 0);
});

test('saisie et affichage des performances', () => {
  assert.equal(parsePerf('run3000', "12'10"), 730);
  assert.equal(parsePerf('run3000', '12:10'), 730);
  assert.equal(parsePerf('run3000', "12'75"), null);
  assert.equal(parsePerf('swim50', '32,5'), 32.5);
  assert.equal(parsePerf('sprint50', '6.97'), 6.97);
  assert.equal(parsePerf('pullups', '7'), 7);
  assert.equal(parsePerf('pullups', '7.5'), null);
  assert.equal(fmtPerf('run3000', 730), "12'10");
  assert.equal(fmtPerf('run3000', 605), "10'05");
  assert.equal(fmtPerf('swim50', 32.5), '32"5');
  assert.equal(fmtPerf('sprint50', 6.97), '6"97');
});

test('temps de passage calculés depuis les allures', () => {
  assert.match(paceNote("5×500 @4'13 r 1'30") ?? '', /500 m en 2'07/);
  assert.match(paceNote("5×600 @4'13 r 1'45") ?? '', /600 m en 2'32/);
  assert.match(paceNote("8×400 @3'49 r 1'30") ?? '', /400 m en 1'32/);
  assert.match(paceNote("2×6 × 30/30 @4'00") ?? '', /≈ 125 m/);
  assert.match(paceNote("10 × 30/30 @3'49") ?? '', /≈ 130 m/);
  assert.match(paceNote("2×12' @4'33") ?? '', /seuil/);
});

test('le plan couvre chaque jour du 05/10/2026 au 14/03/2027, sans identifiant en double', () => {
  for (const d of range('2026-10-05', '2027-03-14')) {
    const p = dayPlan(d);
    assert.ok(p.week >= 1 && p.week <= 23, d);
    const ids = dayItemIds(p);
    assert.equal(new Set(ids).size, ids.length, `doublon le ${d}`);
    if (p.week <= 21 && dow(d) <= 4 && !p.flags.length) assert.ok(p.blocks.length > 0, `pas de bloc concours le ${d}`);
  }
});

test('grille hebdomadaire et exceptions de la passation', () => {
  assert.equal(dayPlan('2026-10-19').sport[0]?.code, 'T-A');
  assert.equal(dayPlan('2026-10-20').sport[0]?.code, 'VIT');
  assert.equal(dayPlan('2026-10-21').sport[0]?.code, 'NAT');
  assert.equal(dayPlan('2026-10-22').sport[0]?.code, 'T-B');
  assert.equal(dayPlan('2026-10-23').sport[0]?.code, 'SEU');
  assert.equal(dayPlan('2026-10-25').sport.length, 0);
  // S9 : 5×500 avec temps de passage
  const s9 = dayPlan('2026-12-01').sport[0];
  assert.ok(s9?.title.includes('5×500'));
  assert.ok(s9?.lines.some((l) => l.includes("500 m en 2'07")));
  assert.ok(s9?.quality);
  // S1 : tests
  assert.deepEqual(dayPlan('2026-10-06').sport[0]?.tests, ['sprint50']);
  assert.deepEqual(dayPlan('2026-10-09').sport[0]?.tests, ['run3000']);
  // S7 : semaine test
  assert.deepEqual(dayPlan('2026-11-18').sport[0]?.tests, ['swim50']);
  assert.deepEqual(dayPlan('2026-11-21').sport[0]?.tests, ['pullups', 'situps']);
  assert.ok(dayPlan('2026-11-20').sport[0]?.lines.some((l) => l.includes("12'45")));
  // samedi S2 (paire) : tractions max à froid ; samedi S3 (impaire) : test abdos
  assert.ok(dayPlan('2026-10-17').sport[0]?.lines[0]?.includes('Tractions max'));
  assert.ok(dayPlan('2026-10-24').sport[0]?.lines[0]?.includes('Abdos test'));
  // Thanksgiving, Noël, Jour de l'An
  assert.equal(dayPlan('2026-11-26').sport.length, 0);
  assert.equal(dayPlan('2026-12-24').sport[0]?.code, 'SEU');
  assert.equal(dayPlan('2026-12-25').sport.length, 0);
  assert.equal(dayPlan('2026-12-25').blocks.length, 0);
  assert.equal(dayPlan('2027-01-01').sport.length, 0);
  assert.equal(dayPlan('2027-01-02').sport[0]?.code, 'SEU');
  assert.equal(dayPlan('2027-01-02').sport[0]?.start, '09:00');
  assert.equal(dayPlan('2027-01-03').sport[0]?.code, 'SL');
  // oral blanc : SL à 8 h, pas d'exposé
  const o1 = dayPlan('2026-12-05');
  assert.equal(o1.sport[0]?.start, '08:00');
  assert.ok(o1.blocks.some((b) => b.kind === 'ORAL' && b.start === '11:00'));
  assert.ok(!o1.blocks.some((b) => b.kind === 'EXP'));
  // pentathlon : rien d'autre le matin
  const p1 = dayPlan('2027-02-06');
  assert.equal(p1.sport[0]?.code, 'PENTA');
  assert.equal(p1.blocks.length, 0);
  assert.ok(dayPlan('2027-02-21').blocks.some((b) => b.kind === 'ORAL'));
  // dossier ADMISSIO S1-S5
  assert.ok(dayPlan('2026-10-21').blocks.some((b) => b.kind === 'DOS'));
  assert.ok(dayPlan('2026-11-11').blocks.some((b) => b.kind === 'ACT'));
  assert.equal(dayPlan('2026-10-25').blocks.find((b) => b.kind === 'DOS')?.end, '12:00');
  assert.equal(dayPlan('2026-11-15').blocks.find((b) => b.kind === 'DOS')?.end, '11:00');
  // France
  assert.equal(dayPlan('2027-03-01').zone, 'Paris');
  assert.equal(dayPlan('2027-03-01').sport[0]?.code, 'MARCHE');
  assert.ok(dayPlan('2027-03-06').blocks.some((b) => b.kind === 'ORAL' && b.start === '18:00'));
  assert.equal(dayPlan('2027-03-12').sport.length, 0);
  // GTG ni le lundi ni le jeudi
  assert.ok(!dayPlan('2026-10-19').reminders.some((r) => r.id.endsWith('gtg')));
  assert.ok(dayPlan('2026-10-20').reminders.some((r) => r.id.endsWith('gtg')));
});

function wellnessData(values: [string, Partial<{ hrv: number; bodyBattery: number; weight: number }>][]): AppData {
  const d = emptyData();
  for (const [date, v] of values) d.wellness[date] = { id: date, date, updatedAt: NOW, fields: Object.keys(v), ...v };
  return d;
}

test('garde-fou : Body Battery < 40', () => {
  const d = wellnessData([['2026-10-24', { bodyBattery: 35 }]]);
  const g = guardFor(d, '2026-10-24');
  assert.equal(g.status, 'alert');
  assert.equal(guardFor(wellnessData([['2026-10-24', { bodyBattery: 62 }]]), '2026-10-24').status, 'ok');
  assert.equal(guardFor(emptyData(), '2026-10-24').status, 'unknown');
});

test('garde-fou : VFC sous la zone habituelle deux nuits de suite', () => {
  const vals: [string, { hrv: number }][] = [];
  for (let i = 30; i >= 2; i--) vals.push([addDays('2026-10-24', -i), { hrv: i % 2 ? 52 : 48 }]);
  vals.push(['2026-10-23', { hrv: 40 }]);
  vals.push(['2026-10-24', { hrv: 41 }]);
  const d = wellnessData(vals);
  assert.equal(hrvLow(d, '2026-10-24'), true);
  assert.equal(guardFor(d, '2026-10-24').status, 'alert');
  // une seule mauvaise nuit : pas d'alerte
  const d2 = wellnessData([...vals.slice(0, -1), ['2026-10-24', { hrv: 51 }]]);
  assert.equal(guardFor(d2, '2026-10-24').status, 'ok');
  // le statut Garmin saisi à la main prime
  d2.checkin['2026-10-24'] = { id: '2026-10-24', date: '2026-10-24', updatedAt: NOW, hrvStatus: 'unbalanced' };
  assert.equal(guardFor(d2, '2026-10-24').status, 'alert');
});

test('une saisie manuelle prime sur la valeur importée', () => {
  const d = wellnessData([['2026-10-24', { weight: 86.4 }]]);
  d.checkin['2026-10-24'] = { id: '2026-10-24', date: '2026-10-24', updatedAt: NOW, weight: 86.1 };
  assert.deepEqual(dayHealth(d, '2026-10-24').weight, { value: 86.1, src: 'manual' });
});

test('import Intervals.icu', () => {
  const w = mapWellness({ id: '2026-10-24', sleepScore: 81, sleepSecs: 26100, hrv: 47.5, restingHR: 52, weight: 0, ctl: 40, BodyBattery: 72 }, NOW);
  assert.ok(w);
  assert.equal(w?.sleepScore, 81);
  assert.equal(w?.restingHR, 52);
  assert.equal(w?.weight, undefined); // 0 = absent
  assert.equal(w?.bodyBattery, 72);
  assert.deepEqual(w?.fields, ['sleepScore', 'sleepSecs', 'hrv', 'restingHR', 'bodyBattery']);
  assert.equal(mapWellness({ id: '2026-10-24', ctl: 40 }, NOW), null);
  const a = mapActivity({ id: 'i1234', start_date_local: '2026-10-24T09:02:11', type: 'Run', name: 'Sortie', distance: 8200, moving_time: 2900, average_heartrate: 148.6 }, NOW);
  assert.equal(a?.id, 'icu-i1234');
  assert.equal(a?.date, '2026-10-24');
  assert.equal(a?.avgHR, 149);
  const d = emptyData();
  if (a) d.activity[a.id] = a;
  assert.equal(runKmWeek(d, '2026-10-19'), 8.2);
});

test('sauvegarde : aller-retour exact', () => {
  const d = wellnessData([['2026-10-24', { hrv: 50 }]]);
  d.tests.t1 = { id: 't1', date: '2026-10-04', event: 'pullups', value: 5, source: 's0', updatedAt: NOW };
  d.done['2026-10-24/s/SL'] = { id: '2026-10-24/s/SL', status: 'done', rpe: 6, updatedAt: NOW };
  d.checkin['2026-10-23'] = { id: '2026-10-23', date: '2026-10-23', updatedAt: NOW, deleted: true };
  const back = parseBackup(JSON.stringify(makeBackup(d, NOW)));
  assert.deepEqual(back, d);
  assert.throws(() => parseBackup('{"format":"autre"}'));
});

test('trajectoire de poids et note sportive', () => {
  assert.equal(weightTarget('2026-10-04'), 87);
  assert.equal(weightTarget('2026-11-22'), 84.5);
  assert.equal(weightTarget('2027-03-20'), 81);
  assert.equal(weightTarget('2026-10-01'), null);
  const d = emptyData();
  d.tests.a = { id: 'a', date: '2026-10-04', event: 'pullups', value: 5, source: 's0', updatedAt: NOW };
  d.tests.b = { id: 'b', date: '2026-10-04', event: 'situps', value: 40, source: 's0', updatedAt: NOW };
  d.tests.c = { id: 'c', date: '2026-10-04', event: 'swim50', value: 32.5, source: 's0', updatedAt: NOW };
  const s = sportScore(d);
  assert.equal(s.count, 3);
  assert.equal(Math.round((s.avg ?? 0) * 100) / 100, 12.67);
  d.done['2026-10-19/s/T-A'] = { id: '2026-10-19/s/T-A', status: 'done', updatedAt: NOW };
  const c = weekCompletion(d, 3);
  assert.equal(c.sport.done, 1);
  assert.equal(c.sport.total, 6);
});
