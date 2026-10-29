import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../src/domain/dates.ts';
import { dayPlan, renderPaces } from '../src/domain/plan.ts';
import { progressOf, vmaAt } from '../src/domain/progression.ts';
import { planFor, weekAdapt } from '../src/domain/adapt.ts';
import { diagnose, shouldSync } from '../src/domain/syncstate.ts';
import { emptyData, type AppData } from '../src/domain/types.ts';
import type { TestEvent } from '../src/domain/bareme.ts';

const NOW = '2026-10-24T12:00:00.000Z';
let n = 0;
function withTests(list: [TestEvent, string, number][]): AppData {
  const d = emptyData();
  for (const [event, date, value] of list) { const id = `t${n++}`; d.tests[id] = { id, event, date, value, source: 'manual', updatedAt: NOW }; }
  return d;
}

test('allures recalculées avec la VMA', () => {
  assert.equal(renderPaces("5×500 @{4'13}", 15), "5×500 @4'13");
  assert.equal(renderPaces("5×500 @{4'13}", 16), "5×500 @3'57");
  assert.equal(renderPaces("4×800 @4'03", 16), "4×800 @4'03"); // allure cible : fixe
  assert.equal(vmaAt(emptyData(), '2026-11-02').vma, 15.0);
  const d = withTests([['run3000', '2026-10-09', 770]]);
  assert.equal(vmaAt(d, '2026-11-02').vma, 15.1); // 12'50 → 14,03 km/h ÷ 0,93
  assert.equal(vmaAt(d, '2026-10-09').source, 'S0'); // le test du jour ne compte qu'à partir du lendemain
  // une VMA plus haute accélère les séances suivantes
  const fast = withTests([['run3000', '2026-10-09', 700]]);
  assert.notEqual(planFor(fast, '2026-11-06').sport[0]?.title, dayPlan('2026-11-06').sport[0]?.title);
});

test('retard et avance mesurés en semaines sur la trajectoire', () => {
  const ok = progressOf(withTests([['pullups', '2026-10-04', 5], ['pullups', '2026-10-24', 5]]), 'pullups', '2026-10-25');
  assert.equal(ok.status, 'ontrack'); // exigé 5,8 → arrondi à 5
  const late = progressOf(withTests([['pullups', '2026-10-04', 5], ['pullups', '2026-11-07', 5]]), 'pullups', '2026-11-08');
  assert.equal(late.status, 'behind'); // exigé 6,4 → 6 : 1 rép. = 3,5 semaines
  assert.equal(Math.round(late.delayWeeks * 10) / 10, 3.5);
  const far = progressOf(withTests([['pullups', '2026-10-04', 5], ['pullups', '2026-11-07', 4]]), 'pullups', '2026-11-08');
  assert.equal(far.status, 'farbehind');
  const swim = progressOf(withTests([['swim50', '2026-10-04', 32.5], ['swim50', '2026-10-24', 31.9]]), 'swim50', '2026-10-25');
  assert.equal(swim.status, 'ahead');
  // tolérance de mesure : 0,1 s de retard en natation n'est pas un retard
  const tol = progressOf(withTests([['swim50', '2026-10-04', 32.5], ['swim50', '2026-10-24', 32.2]]), 'swim50', '2026-10-25');
  assert.equal(tol.status, 'ontrack');
  assert.equal(progressOf(emptyData(), 'sprint50', '2026-10-25').status, 'none');
});

test('prochain point et projection', () => {
  const p = progressOf(withTests([['swim50', '2026-10-04', 32.5]]), 'swim50', '2026-10-25');
  assert.equal(p.nextPoint?.note, 16);
  assert.equal(p.nextPoint?.value, 32.3);
  assert.equal(Math.round((p.nextPoint?.gap ?? 0) * 10) / 10, 0.2);
  const t = progressOf(withTests([['pullups', '2026-10-04', 5], ['pullups', '2026-10-17', 6], ['pullups', '2026-10-31', 7]]), 'pullups', '2026-11-01');
  assert.equal(t.projection?.method, 'trend');
  assert.ok((t.projection?.value ?? 0) <= 17); // jamais au-delà du 20/20
  const z = progressOf(withTests([['pullups', '2026-10-04', 1]]), 'pullups', '2026-10-05');
  assert.equal(z.nextPoint?.value, 2); // sous 2 tractions : 0, le premier point est à 2 (5/20)
});

test('renfort tractions : GTG tous les jours et série en plus en T-A', () => {
  const d = withTests([['pullups', '2026-10-04', 5], ['pullups', '2026-10-31', 5]]);
  const ad = weekAdapt(d, 5);
  assert.deepEqual(ad.boosts.map((b) => b.event), ['pullups']);
  const mon = planFor(d, '2026-11-02');
  assert.ok(mon.sport[0]?.boosts.some((b) => b.startsWith('Tractions : 1 série de plus')));
  assert.ok(mon.reminders.some((r) => r.boosted)); // GTG même le lundi
  assert.equal(dayPlan('2026-11-02').reminders.filter((r) => r.id.endsWith('gtg')).length, 0); // plan de base : pas de GTG le lundi
});

test('pas de renfort en décharge, en fatigue, et au plus 2 épreuves', () => {
  const d = withTests([['pullups', '2026-10-04', 5], ['pullups', '2026-10-24', 3]]);
  assert.ok(weekAdapt(d, 4).suspended?.includes('décharge'));
  assert.equal(weekAdapt(d, 4).boosts.length, 0);
  const three = withTests([
    ['pullups', '2026-10-04', 5], ['pullups', '2026-10-31', 4],
    ['situps', '2026-10-04', 40], ['situps', '2026-10-31', 36],
    ['swim50', '2026-10-04', 32.5], ['swim50', '2026-10-31', 33.5],
  ]);
  const ad = weekAdapt(three, 5);
  assert.equal(ad.boosts.length, 2);
  assert.equal(ad.waiting.length, 1);
  // fatigue : 2 alertes du garde-fou la semaine d'avant
  const tired = withTests([['pullups', '2026-10-04', 5], ['pullups', '2026-10-31', 4]]);
  for (const day of ['2026-10-29', '2026-10-30']) tired.wellness[day] = { id: day, date: day, updatedAt: NOW, bodyBattery: 25, fields: ['bodyBattery'] };
  assert.ok(weekAdapt(tired, 5).suspended?.startsWith('fatigue'));
});

test('renfort 3000 m : 400 m à l’allure du prochain jalon, dans le plafond de 10 %', () => {
  const d = withTests([['run3000', '2026-10-09', 785], ['run3000', '2026-10-30', 800]]);
  const ad = weekAdapt(d, 5);
  assert.equal(ad.boosts[0]?.event, 'run3000');
  const fri = planFor(d, '2026-11-06').sport[0];
  const line = fri?.boosts.find((b) => b.includes('× 400 m')) ?? '';
  assert.match(line, /4'15\/km/); // jalon S7 : 12'45
  assert.match(line, /^Avant le retour au calme : 3 ×/); // 18 km prévus → budget 1,8 km
});

test('synchro : quand réessayer, et de quel côté est la panne', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  const iso = (min: number) => new Date(now - min * 60000).toISOString();
  const empty = emptyData();
  assert.equal(shouldSync({ lastAttemptAt: iso(11), lastOkAt: iso(11) }, empty, '2026-10-29', now), true);
  assert.equal(shouldSync({ lastAttemptAt: iso(5), lastOkAt: iso(5) }, empty, '2026-10-29', now), false);
  const withToday = emptyData();
  withToday.wellness['2026-10-29'] = { id: '2026-10-29', date: '2026-10-29', updatedAt: NOW, hrv: 50, fields: ['hrv'] };
  assert.equal(shouldSync({ lastAttemptAt: iso(60), lastOkAt: iso(60) }, withToday, '2026-10-29', now), false);
  assert.equal(shouldSync({ lastAttemptAt: iso(240), lastOkAt: iso(240) }, withToday, '2026-10-29', now), true);
  const old = emptyData();
  old.wellness['2026-10-24'] = { id: '2026-10-24', date: '2026-10-24', updatedAt: NOW, hrv: 50, fields: ['hrv'] };
  assert.equal(diagnose({ lastOkAt: iso(5) }, old, true, '2026-10-29').side, 'garmin');
  assert.equal(diagnose({ lastOkAt: iso(60), lastError: 'x', lastErrorAt: iso(5) }, old, true, '2026-10-29').side, 'app');
  assert.equal(diagnose({ lastOkAt: iso(5) }, withToday, true, '2026-10-29').level, 'ok');
});

test('les jours du plan restent stables d’un jour à l’autre de la semaine', () => {
  // un résultat saisi le mercredi n'adapte que la semaine suivante
  const d = withTests([['pullups', '2026-10-04', 5], ['pullups', '2026-11-04', 3]]);
  assert.equal(weekAdapt(d, 5).boosts.length, 0);
  assert.equal(weekAdapt(d, 6).boosts[0]?.event, 'pullups');
  assert.equal(addDays('2026-11-08', 1), '2026-11-09');
});
