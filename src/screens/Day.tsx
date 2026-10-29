import { useState } from 'react';
import type { TestEvent } from '../domain/bareme';
import { EVENTS } from '../domain/bareme';
import { ago, diffDays, dow, EXAM_START, fmtLong, fmtShort, PLAN_WEEKS, todayYmd, addDays, type Ymd } from '../domain/dates';
import { sortedDeadlines } from '../domain/deadlines';
import { actKind, activitiesOn, BB_LIMIT, dayHealth, fmtDuration, fmtPace, guardFor, hrvLow, zoneBefore, type Guard } from '../domain/health';
import { planFor, weekAdapt } from '../domain/adapt';
import { BLOCS, weekDef, type SportSession } from '../domain/plan';
import { isDone } from '../domain/progress';
import { diagnose } from '../domain/syncstate';
import { weightTarget } from '../domain/targets';
import { setDone, toggleDone } from '../data/actions';
import { getIcuConfig } from '../data/prefs';
import { useData } from '../data/store';
import { syncIntervals, useSync } from '../data/sync';
import { IconAlert, IconSync } from '../ui/icons';
import { Card, CheckItem, Code, fmtNum, hm } from '../ui/kit';
import { href } from '../ui/router';
import { CheckinSheet, DoneSheet, TestSheet } from './sheets';

const TEST_VERB: Record<TestEvent, string> = { pullups: 'tractions', situps: 'abdos', run3000: '3000 m', sprint50: 'sprint', swim50: 'natation' };

function DayHeader({ date }: { date: Ymd }) {
  const data = useData();
  const p = planFor(data, date);
  const w = weekDef(p.week);
  const toExam = diffDays(EXAM_START, date);
  const bits = [
    w ? `S${p.week} · ${w.deload ? 'Décharge' : w.testWeek ? 'Semaine test' : w.penta ? `Pentathlon #${w.penta}` : BLOCS[w.bloc]}` : 'Hors plan',
    toExam > 0 ? `J-${toExam}` : null,
  ].filter(Boolean);
  return (
    <div className="dayhead">
      <h2>{fmtLong(date)}</h2>
      <span className="muted small">{bits.join(' · ')}</span>
      {p.flags.map((f) => <div key={f} className="banner unknown"><div className="banner-body">{f}</div></div>)}
    </div>
  );
}

function SyncLine({ date }: { date: Ymd }) {
  const data = useData();
  const sync = useSync();
  const cfg = getIcuConfig();
  if (!cfg) {
    return <a className="btn primary" href={href({ name: 'settings' })}>Relier Garmin (Intervals.icu)</a>;
  }
  const d = diagnose(sync.meta, data, true, date === todayYmd() ? date : todayYmd());
  return (
    <div className="spread">
      <span className={`small ${d.level === 'error' ? 'crit-text' : d.level === 'warn' ? 'muted' : 'faint'}`}>
        {sync.running ? 'Synchronisation…' : d.level === 'ok' ? `Garmin à jour · ${sync.meta.lastOkAt ? ago(sync.meta.lastOkAt) : ''}` : d.text}
        {d.side === 'garmin' && d.level === 'error' && <> <a href={href({ name: 'settings' })}>Que faire ?</a></>}
      </span>
      <button type="button" className="iconbtn" aria-label="Synchroniser maintenant" disabled={sync.running} onClick={() => void syncIntervals({ force: true })}><IconSync /></button>
    </div>
  );
}

export function MorningCard({ date }: { date: Ymd }) {
  const data = useData();
  const [sheet, setSheet] = useState(false);
  const h = dayHealth(data, date);
  const rz = zoneBefore(data, 'restingHR', date);
  const hz = zoneBefore(data, 'hrv', date);
  const low = hrvLow(data, date);
  const wt = weightTarget(date);
  const weighDay = dow(date) === 2 || dow(date) === 5 || !!h.weight;
  const cell = (label: string, v: string | null, unit: string, sub: string, cls = '', manual = false) => (
    <button type="button" className="metric" onClick={() => setSheet(true)}>
      <span className="label">{label}{manual ? ' ✎' : ''}</span>
      <span className={`v ${v === null ? 'none' : ''}`}>{v ?? '—'}{v !== null && unit && <small>{unit}</small>}</span>
      <span className={`sub ${cls}`}>{sub}</span>
    </button>
  );
  const hrvSub = h.hrvStatus ? (h.hrvStatus === 'balanced' ? 'équilibrée' : 'déséquilibrée') : low === null ? (hz ? '' : 'zone après 10 nuits') : low ? `sous ta zone (${Math.round(hz?.low ?? 0)})` : 'dans ta zone';
  return (
    <Card title="Ce matin">
      <div className="stack">
        <div className={`metrics m4 ${weighDay ? 'm5' : ''}`}>
          {cell('Sommeil', h.sleepScore ? String(Math.round(h.sleepScore.value)) : null, '', h.sleepSecs ? fmtDuration(h.sleepSecs.value) : 'score /100', '', h.sleepScore?.src === 'manual')}
          {cell('VFC', h.hrv ? String(Math.round(h.hrv.value)) : null, 'ms', hrvSub, low || (h.hrvStatus && h.hrvStatus !== 'balanced') ? 'low' : low === false ? 'good' : '', h.hrvStatus !== undefined)}
          {cell('FC repos', h.restingHR ? String(Math.round(h.restingHR.value)) : null, 'bpm', h.restingHR && rz ? `${h.restingHR.value - rz.mean >= 0 ? '+' : '−'}${Math.abs(Math.round(h.restingHR.value - rz.mean))} vs moy.` : '', h.restingHR && rz && h.restingHR.value > rz.mean + 5 ? 'low' : '', h.restingHR?.src === 'manual')}
          {cell('Body Batt.', h.bodyBattery ? String(Math.round(h.bodyBattery.value)) : null, '', h.bodyBattery ? (h.bodyBattery.value < BB_LIMIT ? `< ${BB_LIMIT}` : 'au réveil') : 'à saisir', h.bodyBattery && h.bodyBattery.value < BB_LIMIT ? 'low' : '', h.bodyBattery?.src === 'manual')}
          {weighDay && cell('Poids', h.weight ? fmtNum(h.weight.value, 1) : null, 'kg', wt ? `cible ${fmtNum(wt, 1)}` : 'pesée', h.weight && wt && h.weight.value > wt + 0.8 ? 'low' : h.weight && wt ? 'good' : '', h.weight?.src === 'manual')}
        </div>
        <SyncLine date={date} />
      </div>
      {sheet && <CheckinSheet date={date} onClose={() => setSheet(false)} />}
    </Card>
  );
}

function GuardInline({ guard }: { guard: Guard }) {
  if (guard.status === 'alert') {
    return (
      <div className="banner alert">
        <IconAlert />
        <div className="banner-body"><strong>Garde-fou : fais 40' EF à la place</strong><span className="small">{guard.reasons.join(' · ')}</span></div>
      </div>
    );
  }
  if (guard.status === 'unknown') return <p className="small muted">Garde-fou non vérifié : il manque la VFC ou le Body Battery du matin.</p>;
  return <p className="small ok-text">Garde-fou : feu vert.</p>;
}

function SessionCard({ s, guard }: { s: SportSession; guard: Guard }) {
  const data = useData();
  const [doneSheet, setDoneSheet] = useState(false);
  const [testSheet, setTestSheet] = useState<TestEvent | null>(null);
  const rec = data.done[s.id];
  const done = rec && !rec.deleted ? rec : undefined;
  const acts = activitiesOn(data, s.date).filter((a) => {
    const k = actKind(a.type);
    return s.discipline === 'test' || k === s.discipline || (s.discipline === 'walk' && k === 'run');
  });
  const lines = s.lines.filter((l) => !l.startsWith('Garde-fou') && !l.startsWith('Protocole'));
  const protocol = s.lines.find((l) => l.startsWith('Protocole'));
  const guardHit = s.quality && guard.status === 'alert' && !done;
  return (
    <Card className={`session ${done?.status === 'swapped' ? 'swapped' : ''}`}>
      <div className="session">
        <div className="session-top">
          <Code kind={s.discipline}>{s.code}</Code>
          <span className="session-time">{hm(s.start)} – {hm(s.end)}</span>
          {s.optional && <span className="pill">Optionnelle</span>}
          {done && <span className={`pill ${done.status === 'skipped' ? '' : 'ok'}`}>{done.status === 'done' ? 'Faite' : done.status === 'swapped' ? "40' EF" : 'Pas faite'}{done.rpe ? ` · RPE ${done.rpe}` : ''}</span>}
        </div>
        <h3>{s.title}</h3>
        {s.quality && !done && <GuardInline guard={guard} />}
        <ul>{lines.map((l) => <li key={l} className={/^\d\./.test(l) ? 'numbered' : ''}>{l}</li>)}</ul>
        {s.boosts.length > 0 && (
          <div className="boost">
            <span className="label">Adapté à ta progression</span>
            <ul>{s.boosts.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}
        {protocol && <details className="method"><summary>Protocole abdos</summary><p>{protocol.replace('Protocole : ', '')}</p></details>}
        {acts.map((a) => (
          <div key={a.id} className="row small muted">
            <span className={`dot k-${actKind(a.type) === 'other' ? 'conc' : actKind(a.type)}`} />
            <span className="grow">Garmin : {a.name}</span>
            <span className="num">
              {a.distance ? `${fmtNum(a.distance / 1000, 1)} km · ` : ''}{a.movingTime ? fmtDuration(a.movingTime) : ''}
              {a.avgSpeed && actKind(a.type) === 'run' ? ` · ${fmtPace(a.avgSpeed)}/km` : ''}{a.avgHR ? ` · ${a.avgHR} bpm` : ''}
            </span>
          </div>
        ))}
        <div className="row-wrap">
          {!done && guardHit && <button type="button" className="btn primary" onClick={() => setDone(s.id, 'swapped')}>J’ai fait 40' EF</button>}
          <button type="button" className={`btn ${!done && !guardHit ? 'primary' : ''}`} onClick={() => setDoneSheet(true)}>{done ? 'Modifier' : 'Séance faite'}</button>
          {s.tests.map((t) => <button key={t} type="button" className="btn" onClick={() => setTestSheet(t)}>Saisir {TEST_VERB[t]}</button>)}
        </div>
      </div>
      {doneSheet && <DoneSheet session={s} onClose={() => setDoneSheet(false)} />}
      {testSheet && <TestSheet initialEvent={testSheet} initialDate={s.date} onClose={() => setTestSheet(null)} />}
    </Card>
  );
}

function ChecklistCard({ date }: { date: Ymd }) {
  const data = useData();
  const p = planFor(data, date);
  if (!p.blocks.length && !p.reminders.length) return null;
  const done = p.blocks.filter((b) => isDone(data, b.id)).length;
  return (
    <Card title="Concours" aside={p.blocks.length ? <span className="caption num">{done}/{p.blocks.length}</span> : undefined}>
      <div className="items">
        {p.blocks.map((b) => (
          <CheckItem key={b.id} time={b.start} title={b.title} sub={b.detail} done={isDone(data, b.id)} onToggle={() => toggleDone(b.id)} />
        ))}
        {p.reminders.map((r) => (
          <CheckItem key={r.id} time={r.time} title={r.title} sub={r.boosted ? 'Renfort tractions cette semaine' : undefined} done={isDone(data, r.id)} onToggle={() => toggleDone(r.id)} />
        ))}
      </div>
    </Card>
  );
}

function UrgentDeadline({ date }: { date: Ymd }) {
  const data = useData();
  const d = sortedDeadlines().find((x) => x.critical && x.date >= date && diffDays(x.date, date) <= 14 && !(data.deadlines[x.id] && !data.deadlines[x.id]?.deleted));
  if (!d) return null;
  const j = diffDays(d.date, date);
  return (
    <a className="banner alert" href={href({ name: 'concours' })} style={{ textDecoration: 'none' }}>
      <IconAlert />
      <div className="banner-body"><strong>{j === 0 ? 'Aujourd’hui' : `J-${j}`} · {d.title}</strong><span className="small">{fmtShort(d.date)}{d.time ? ` · ${hm(d.time)} Little Rock` : ''}{d.tbc ? ' · date à confirmer' : ''}</span></div>
    </a>
  );
}

function AdaptNote({ date }: { date: Ymd }) {
  const data = useData();
  const p = planFor(data, date);
  const ad = weekAdapt(data, p.week);
  if (!ad.boosts.length) return null;
  return (
    <a className="adaptnote" href={href({ name: 'tests' })}>
      Plan adapté cette semaine : renfort {ad.boosts.map((b) => EVENTS[b.event].short.toLowerCase()).join(' et ')}. Voir pourquoi
    </a>
  );
}

export function DayView({ date }: { date: Ymd }) {
  const data = useData();
  const isToday = date === todayYmd();
  const p = planFor(data, date);
  const guard = guardFor(data, date);
  return (
    <div className="stack-16">
      <DayHeader date={date} />
      {isToday && <UrgentDeadline date={date} />}
      <div className="cols">
        <div className="stack-16">
          <MorningCard date={date} />
          {p.sport.map((s) => <SessionCard key={s.id} s={s} guard={guard} />)}
          {!p.sport.length && p.week >= 1 && p.week <= PLAN_WEEKS && <Card><p className="muted">Pas de séance aujourd’hui : récupération.</p></Card>}
          <AdaptNote date={date} />
        </div>
        <div className="stack-16">
          <ChecklistCard date={date} />
          {!isToday && (
            <div className="row-wrap">
              <a className="btn" href={href({ name: 'day', date: addDays(date, -1) })}>Veille</a>
              <a className="btn" href={href({ name: 'day', date: addDays(date, 1) })}>Lendemain</a>
              <a className="btn ghost" href={href({ name: 'plan', week: p.week })}>Semaine S{p.week}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
