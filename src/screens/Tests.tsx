import { useState } from 'react';
import { betterBy, EVENT_ORDER, EVENTS, fmtPerf, noteFor, type TestEvent } from '../domain/bareme';
import { fmtShort, todayYmd } from '../domain/dates';
import { sportScore, testsOf } from '../domain/progress';
import { MILESTONES, nextMilestone, TARGETS } from '../domain/targets';
import { deleteTest } from '../data/actions';
import { useData } from '../data/store';
import { Spark } from '../ui/charts';
import { IconPlus, IconTrash } from '../ui/icons';
import { Card, fmtNum, Method } from '../ui/kit';
import { TestSheet } from './sheets';

const COLOR: Record<TestEvent, string> = {
  run3000: 'var(--d-run)', sprint50: 'var(--d-run)', swim50: 'var(--d-swim)', pullups: 'var(--d-str)', situps: 'var(--d-str)',
};

const unitTxt = (e: TestEvent, v: number) => `${fmtPerf(e, v)}${EVENTS[e].unit === 'reps' ? ' rép.' : ''}`;

function EventCard({ event, onAdd }: { event: TestEvent; onAdd: (e: TestEvent) => void }) {
  const data = useData();
  const all = testsOf(data, event);
  const last = all[all.length - 1];
  const t = TARGETS[event];
  const next = nextMilestone(todayYmd());
  const info = EVENTS[event];
  const steps = MILESTONES.filter((m) => m.key !== 'S0') as { key: 'S7' | 'S15' | 'S20' | 'J'; label: string; date: string }[];
  const hit = (v: number) => last ? betterBy(event, last.value, v) >= -1e-9 : false;
  const nextVal = next.key !== 'S0' ? t[next.key] : t.J;
  const gap = last ? betterBy(event, last.value, nextVal) : null;
  const gapTxt = gap === null ? '' : gap >= 0 ? `${next.label} atteint` : info.unit === 'reps' ? `${Math.ceil(-gap)} rép. à gagner d’ici le ${fmtShort(next.date)}` : `${fmtNum(-gap, event === 'run3000' ? 0 : event === 'sprint50' ? 2 : 1)} s à gagner d’ici le ${fmtShort(next.date)}`;
  return (
    <Card title={info.label} aside={<button type="button" className="btn small" onClick={() => onAdd(event)}><IconPlus />Saisir</button>}>
      <div className="stack">
        <div className="spread">
          <div>
            <div className="big">{last ? fmtPerf(event, last.value) : '—'}{last && info.unit === 'reps' && <small>rép.</small>}</div>
            <div className="caption">{last ? `${fmtShort(last.date)} · ${noteFor(event, last.value)}/20` : t.s0Estimate ?? 'aucun résultat'}</div>
          </div>
          <Spark values={all.map((x) => x.value)} color={COLOR[event]} better={info.better} />
        </div>
        {gapTxt && <span className={`pill ${gap !== null && gap >= 0 ? 'ok' : ''}`}>{gapTxt}</span>}
        <div className="ladder">
          {steps.map((m) => (
            <div key={m.key} className={`${hit(t[m.key]) ? 'hit' : ''} ${m.key === next.key ? 'next' : ''}`}>
              <span>{m.key === 'J' ? 'Jour J' : m.key}</span>
              <b>{t.text?.[m.key] ?? fmtPerf(event, t[m.key])}</b>
              <span>{noteFor(event, t[m.key])}/20</span>
            </div>
          ))}
        </div>
        {t.ambition !== undefined && <p className="caption">Ambition : {unitTxt(event, t.ambition)} ({noteFor(event, t.ambition)}/20).</p>}
        {all.length > 0 && (
          <div className="hist">
            {[...all].reverse().slice(0, 6).map((r) => (
              <div key={r.id} className="item">
                <span className="t"><b className="num">{unitTxt(event, r.value)} · {noteFor(event, r.value)}/20</b><span>{fmtShort(r.date)}{r.note ? ` · ${r.note}` : ''}</span></span>
                <button type="button" className="iconbtn" aria-label="Supprimer ce résultat" onClick={() => deleteTest(r.id)}><IconTrash /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export function TestsScreen() {
  const data = useData();
  const [sheet, setSheet] = useState<TestEvent | 'any' | null>(null);
  const s = sportScore(data);
  return (
    <div className="stack-16">
      <div className="score-hero">
        <span className="label">Moyenne sportive estimée</span>
        <div className="big">{s.avg !== null ? fmtNum(s.avg, 1) : '—'}<small>/20 · cible 15</small></div>
        <div className="notes5">
          {EVENT_ORDER.map((e) => (
            <div key={e}><b>{s.notes[e] ?? '—'}</b><span>{EVENTS[e].short}</span></div>
          ))}
        </div>
        <span className="small" style={{ opacity: 0.75 }}>
          {s.count < 5 ? `Sur ${s.count} épreuve${s.count > 1 ? 's' : ''} testée${s.count > 1 ? 's' : ''} : ${5 - s.count} manquante${5 - s.count > 1 ? 's' : ''}. ` : ''}
          Seuil éliminatoire : moyenne ≤ 6/20.
        </span>
      </div>
      <div className="row-wrap">
        <button type="button" className="btn primary" onClick={() => setSheet('any')}><IconPlus />Saisir un résultat</button>
      </div>
      <div className="cols">
        <div className="stack-16">
          {EVENT_ORDER.filter((_, i) => i % 2 === 0).map((e) => <EventCard key={e} event={e} onAdd={setSheet} />)}
        </div>
        <div className="stack-16">
          {EVENT_ORDER.filter((_, i) => i % 2 === 1).map((e) => <EventCard key={e} event={e} onAdd={setSheet} />)}
          <Card title="Barème">
            <Method summary="Comment la note est calculée">
              <p>Barème hommes de l’arrêté du 30 août 2021 (épreuves sportives communes aux grandes écoles militaires). Une performance entre deux valeurs reçoit la note de la valeur inférieure : 12'11 au 3000 m vaut 12, pas 13.</p>
              <p>La moyenne est une moyenne simple de la dernière performance de chaque épreuve testée. Les coefficients réels sont fixés par l’arrêté d’organisation du concours : vérifie-les sur l’avis 2027. Moins de 2 tractions vaut 0 ; la suspension (plafonnée à 4/20) n’est pas suivie.</p>
              <p>Jalons S7, S15, S20 et Jour J : ceux de ta passation.</p>
            </Method>
          </Card>
        </div>
      </div>
      {sheet && <TestSheet initialEvent={sheet === 'any' ? undefined : sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
