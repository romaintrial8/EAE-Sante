import { useState } from 'react';
import type { TestEvent } from '../domain/bareme';
import { ago, diffDays, EXAM_START, fmtLong, fmtShort, PLAN_WEEKS, todayYmd, weekOf, addDays, type Ymd } from '../domain/dates';
import { sortedDeadlines } from '../domain/deadlines';
import { actKind, activitiesOn, BB_LIMIT, dayHealth, fmtDuration, fmtPace, guardFor, hrvLow, zoneBefore, type Guard } from '../domain/health';
import { BLOCS, dayPlan, weekDef, WEEKS, type Block, type SportSession } from '../domain/plan';
import { isDone } from '../domain/progress';
import { weightTarget } from '../domain/targets';
import type { AppData } from '../domain/types';
import { setDone, toggleDone } from '../data/actions';
import { getIcuConfig } from '../data/prefs';
import { useData } from '../data/store';
import { syncIntervals, useSync } from '../data/sync';
import { IconAlert, IconInfo, IconShield, IconSync } from '../ui/icons';
import { Card, CheckItem, Code, fmtNum, hm, Method } from '../ui/kit';
import { href } from '../ui/router';
import { CheckinSheet, DoneSheet, TestSheet } from './sheets';

const KIND_LABEL: Record<Block['kind'], string> = {
  CG: 'Culture G', PSY: 'Psychotech', ANG: 'Anglais', ACT: 'Actu', DOS: 'Dossier', EXP: 'Exposé', ORAL: 'Oral blanc', SYN: 'Synthèse', BILAN: 'Bilan', ENT: 'Entretien',
};

export function WeekStrip({ week }: { week: number }) {
  return (
    <div className="stack-8">
      <div className="strip" role="img" aria-label={`Semaine ${week} sur ${PLAN_WEEKS}`}>
        {WEEKS.map((w) => (
          <a key={w.n} href={href({ name: 'plan', week: w.n })} title={`S${w.n} · ${BLOCS[w.bloc]}`}
            className={[`b${w.bloc}`, w.deload ? 'deload' : '', w.testWeek || w.penta || w.n === 1 ? 'test' : '', w.n < week ? 'past' : '', w.n === week ? 'now' : ''].join(' ')}>
            <span hidden>S{w.n}</span>
          </a>
        ))}
      </div>
      <div className="strip-legend"><span>S1 · 05/10</span><span>Décharges en creux · tests pointés</span><span>S23 · 14/03</span></div>
    </div>
  );
}

function DayHeader({ date, isToday }: { date: Ymd; isToday: boolean }) {
  const p = dayPlan(date);
  const w = weekDef(p.week);
  const toExam = diffDays(EXAM_START, date);
  return (
    <div className="dayhead">
      <div className="label">{isToday ? 'Aujourd’hui' : fmtShort(date)}</div>
      <h2>{fmtLong(date)}</h2>
      <div className="pills">
        {w ? <span className="pill brand">S{p.week} / {PLAN_WEEKS} · {BLOCS[w.bloc]}</span> : <span className="pill">Hors plan</span>}
        {w?.deload && <span className="pill">Décharge</span>}
        {(w?.testWeek || w?.penta) && <span className="pill warn">{w.penta ? `Pentathlon #${w.penta}` : 'Semaine test'}</span>}
        {w && <span className="pill">{w.km} km prévus</span>}
        <span className="pill">{p.zone === 'LR' ? 'Heure de Little Rock' : 'Heure de Paris'}</span>
        {toExam > 0 && <span className="pill">J-{toExam} épreuves</span>}
      </div>
      {isToday && p.week >= 1 && p.week <= PLAN_WEEKS && <WeekStrip week={p.week} />}
      {p.flags.map((f) => <div key={f} className="banner unknown"><IconInfo /><div className="banner-body">{f}</div></div>)}
    </div>
  );
}

function hrvSub(data: AppData, date: Ymd): { text: string; cls: string } {
  const z = zoneBefore(data, 'hrv', date);
  const low = hrvLow(data, date);
  const h = dayHealth(data, date);
  if (h.hrvStatus) return { text: h.hrvStatus === 'balanced' ? 'Garmin : équilibré' : h.hrvStatus === 'low' ? 'Garmin : faible' : 'Garmin : déséquilibré', cls: h.hrvStatus === 'balanced' ? 'good' : 'low' };
  if (!z) return { text: 'zone dispo après 10 nuits', cls: '' };
  return { text: `zone ${Math.round(z.low)}-${Math.round(z.high)} ms`, cls: low ? 'low' : 'good' };
}

export function HealthCard({ date }: { date: Ymd }) {
  const data = useData();
  const sync = useSync();
  const [sheet, setSheet] = useState(false);
  const h = dayHealth(data, date);
  const cfg = getIcuConfig();
  const rz = zoneBefore(data, 'restingHR', date);
  const wt = weightTarget(date);
  const src = (s?: 'garmin' | 'manual') => (s === 'manual' ? 'saisi' : s === 'garmin' ? 'Garmin' : '');
  const metric = (label: string, v: string | null, unit: string, sub: string, cls = '', s?: 'garmin' | 'manual') => (
    <button type="button" className="metric" onClick={() => setSheet(true)}>
      <span className="spread"><span className="label">{label}</span><span className="src">{src(s)}</span></span>
      <span className={`v ${v === null ? 'none' : ''}`}>{v ?? '—'}{v !== null && unit && <small>{unit}</small>}</span>
      <span className={`sub ${cls}`}>{sub}</span>
    </button>
  );
  const hs = hrvSub(data, date);
  return (
    <Card title="Ce matin" aside={<span className="caption">{cfg ? (sync.running ? 'Synchronisation…' : sync.meta.lastOkAt ? `Garmin · ${ago(sync.meta.lastOkAt)}` : 'Garmin · jamais synchronisé') : ''}</span>}>
      <div className="stack">
        <div className="metrics">
          {metric('Sommeil', h.sleepScore ? String(Math.round(h.sleepScore.value)) : null, '/100', 'score Garmin', '', h.sleepScore?.src)}
          {metric('Durée', h.sleepSecs ? fmtDuration(h.sleepSecs.value) : null, '', 'temps endormi', '', h.sleepSecs?.src)}
          {metric('VFC nuit', h.hrv ? String(Math.round(h.hrv.value)) : null, 'ms', hs.text, hs.cls, h.hrv?.src)}
          {metric('FC repos', h.restingHR ? String(Math.round(h.restingHR.value)) : null, 'bpm', rz ? `moy. 28 j : ${Math.round(rz.mean)}` : 'moyenne après 10 jours', h.restingHR && rz && h.restingHR.value > rz.mean + 5 ? 'low' : '', h.restingHR?.src)}
          {metric('Body Battery', h.bodyBattery ? String(Math.round(h.bodyBattery.value)) : null, '', h.bodyBattery ? (h.bodyBattery.value < BB_LIMIT ? `sous ${BB_LIMIT} : garde-fou` : 'au réveil') : 'touche pour saisir', h.bodyBattery && h.bodyBattery.value < BB_LIMIT ? 'low' : '', h.bodyBattery?.src)}
          {metric('Poids', h.weight ? fmtNum(h.weight.value, 1) : null, 'kg', wt ? `cible du jour ${fmtNum(wt, 1)}` : 'pesée mer. et sam.', h.weight && wt && h.weight.value > wt + 0.8 ? 'low' : h.weight && wt ? 'good' : '', h.weight?.src)}
        </div>
        {!cfg ? (
          <div className="empty">
            <b>Relie Garmin pour remplir ces cases sans rien saisir.</b>
            <span className="small muted">Garmin Connect → Intervals.icu → Cocarde. Il te faut ta clé API Intervals.icu.</span>
            <a className="btn primary" href={href({ name: 'settings' })}>Connecter Intervals.icu</a>
          </div>
        ) : (
          <div className="spread">
            <span className="caption">{sync.meta.lastError ? <span style={{ color: 'var(--crit)' }}>{sync.meta.lastError}</span> : 'Touche une case pour corriger ou compléter.'}</span>
            <button type="button" className="btn small" disabled={sync.running} onClick={() => void syncIntervals({ force: true })}><IconSync />Synchroniser</button>
          </div>
        )}
        <Method>
          <p>Les valeurs viennent de ta montre via Garmin Connect puis Intervals.icu, une fois par ouverture de l’app (au plus toutes les 3 h). Body Battery n’est pas transmis par Intervals.icu en standard : saisis-le le matin si besoin (10 secondes).</p>
          <p>VFC : moyenne de la nuit (rMSSD). La zone habituelle est la moyenne ± 1 écart-type de tes 28 nuits précédentes, calculée dès 10 nuits disponibles. Garmin, lui, compare une moyenne sur 7 jours à sa propre référence : si tu préfères son statut, saisis-le, il prime.</p>
          <p>Poids cible : ligne droite entre les jalons de la passation (87 kg en S0, 84,5 en S7, 82,5 en S15, 81 en S20).</p>
        </Method>
      </div>
      {sheet && <CheckinSheet date={date} onClose={() => setSheet(false)} />}
    </Card>
  );
}

export function GuardBanner({ guard }: { guard: Guard }) {
  if (guard.status === 'alert') {
    return (
      <div className="banner alert" role="alert">
        <IconAlert />
        <div className="banner-body">
          <strong>Garde-fou déclenché : séance qualité → 40' EF</strong>
          <span className="small">{guard.reasons.join(' · ')}</span>
        </div>
      </div>
    );
  }
  if (guard.status === 'ok') {
    return (
      <div className="banner ok">
        <IconShield />
        <div className="banner-body"><strong>Garde-fou : feu vert pour la séance qualité</strong>
          {guard.missing.length > 0 && <span className="small muted">Non vérifié : {guard.missing.join(', ')}.</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="banner unknown">
      <IconInfo />
      <div className="banner-body"><strong>Garde-fou : pas assez de données</strong>
        <span className="small">Il faut ton Body Battery du matin ou 2 nuits de VFC avec une zone habituelle (10 nuits). Vérifie toi-même sur ta montre avant la séance qualité.</span>
      </div>
    </div>
  );
}

function SessionCard({ s, guard }: { s: SportSession; guard: Guard }) {
  const data = useData();
  const [doneSheet, setDoneSheet] = useState(false);
  const [testSheet, setTestSheet] = useState<TestEvent | null>(null);
  const rec = data.done[s.id];
  const done = rec && !rec.deleted ? rec : undefined;
  const acts = activitiesOn(data, s.date).filter((a) => {
    const k = actKind(a.type);
    return s.discipline === 'test' ? true : k === s.discipline || (s.discipline === 'walk' && k === 'run');
  });
  const kind = s.discipline;
  const guardHit = s.quality && guard.status === 'alert' && !done;
  return (
    <Card className={`session ${done?.status === 'swapped' ? 'swapped' : ''}`}>
      <div className="session">
        <div className="session-top">
          <Code kind={kind}>S{String(weekOf(s.date)).padStart(2, '0')} · {s.code}</Code>
          <span className="session-time">{hm(s.start)} – {hm(s.end)}</span>
          {s.quality && <span className="pill">Qualité</span>}
          {done && <span className={`pill ${done.status === 'skipped' ? '' : 'ok'}`}>{done.status === 'done' ? 'Faite' : done.status === 'swapped' ? "Remplacée par 40' EF" : 'Pas faite'}{done.rpe ? ` · RPE ${done.rpe}` : ''}</span>}
        </div>
        <h3>{s.title}</h3>
        {guardHit && (
          <div className="banner alert">
            <IconAlert />
            <div className="banner-body"><strong>Remplace par 40' EF (6'00-6'20/km)</strong><span className="small">{guard.reasons.join(' · ')}</span></div>
          </div>
        )}
        <ul>
          {s.lines.map((l) => <li key={l} className={l.startsWith('Garde-fou') ? 'guard' : l.startsWith('Protocole') ? 'sub' : /^\d\./.test(l) ? 'numbered' : ''}>{l}</li>)}
        </ul>
        {acts.length > 0 && (
          <div className="stack-8">
            <span className="label">Vu par Garmin</span>
            {acts.map((a) => (
              <div key={a.id} className="row small">
                <span className={`dot k-${actKind(a.type) === 'other' ? 'conc' : actKind(a.type)}`} />
                <span className="grow">{a.name}</span>
                <span className="num muted">
                  {a.distance ? `${fmtNum(a.distance / 1000, 2)} km · ` : ''}{a.movingTime ? fmtDuration(a.movingTime) : ''}
                  {a.avgSpeed && actKind(a.type) === 'run' ? ` · ${fmtPace(a.avgSpeed)}/km` : ''}{a.avgHR ? ` · ${a.avgHR} bpm` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
        {done?.note && <p className="small muted selectable">« {done.note} »</p>}
        <div className="row-wrap">
          {!done && guardHit && <button type="button" className="btn primary" onClick={() => setDone(s.id, 'swapped')}>J’ai fait 40' EF</button>}
          <button type="button" className={`btn ${!done && !guardHit ? 'primary' : ''}`} onClick={() => setDoneSheet(true)}>{done ? 'Modifier' : 'Séance faite'}</button>
          {s.tests.map((t) => (
            <button key={t} type="button" className="btn" onClick={() => setTestSheet(t)}>Saisir {t === 'pullups' ? 'tractions' : t === 'situps' ? 'abdos' : t === 'run3000' ? '3000 m' : t === 'sprint50' ? 'sprint' : 'natation'}</button>
          ))}
        </div>
      </div>
      {doneSheet && <DoneSheet session={s} onClose={() => setDoneSheet(false)} />}
      {testSheet && <TestSheet initialEvent={testSheet} initialDate={s.date} onClose={() => setTestSheet(null)} />}
    </Card>
  );
}

function BlocksCard({ date }: { date: Ymd }) {
  const data = useData();
  const p = dayPlan(date);
  if (!p.blocks.length) return null;
  const done = p.blocks.filter((b) => isDone(data, b.id)).length;
  return (
    <Card title="Concours" aside={<span className="caption num">{done}/{p.blocks.length} fait{done > 1 ? 's' : ''}</span>}>
      <div className="items">
        {p.blocks.map((b) => (
          <CheckItem key={b.id} time={b.start} title={b.title} sub={<><Code kind="conc">{KIND_LABEL[b.kind]}</Code> jusqu’à {hm(b.end)}{b.detail ? ` · ${b.detail}` : ''}</>} done={isDone(data, b.id)} onToggle={() => toggleDone(b.id)} />
        ))}
      </div>
    </Card>
  );
}

function RemindersCard({ date }: { date: Ymd }) {
  const data = useData();
  const p = dayPlan(date);
  if (!p.reminders.length) return null;
  return (
    <Card title="Rappels">
      <div className="items">
        {p.reminders.map((r) => (
          <CheckItem key={r.id} time={r.time} title={r.title} done={isDone(data, r.id)} onToggle={() => toggleDone(r.id)} />
        ))}
      </div>
    </Card>
  );
}

function NextDeadline({ date }: { date: Ymd }) {
  const data = useData();
  const next = sortedDeadlines().filter((d) => d.date >= date && !(data.deadlines[d.id] && !data.deadlines[d.id]?.deleted)).slice(0, 2);
  if (!next.length) return null;
  return (
    <Card title="Prochaines échéances" aside={<a className="caption" href={href({ name: 'concours' })}>Tout voir</a>}>
      <div className="items">
        {next.map((d) => {
          const j = diffDays(d.date, date);
          return (
            <a key={d.id} className="item" href={href({ name: 'concours' })} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="t"><b>{d.title}</b><span>{d.approx ? '~' : ''}{fmtShort(d.date)}{d.time ? ` · ${hm(d.time)} LR` : ''}{d.tbc ? ' · à confirmer' : ''}</span></span>
              <span className={`pill ${d.critical ? 'crit' : ''} num`}>{j === 0 ? 'Aujourd’hui' : `J-${j}`}</span>
            </a>
          );
        })}
      </div>
    </Card>
  );
}

export function DayView({ date }: { date: Ymd }) {
  const data = useData();
  const isToday = date === todayYmd();
  const p = dayPlan(date);
  const guard = guardFor(data, date);
  const hasQuality = p.sport.some((s) => s.quality);
  return (
    <div className="stack-16">
      <DayHeader date={date} isToday={isToday} />
      <div className="cols">
        <div className="stack-16">
          <HealthCard date={date} />
          {hasQuality && <GuardBanner guard={guard} />}
          {p.sport.length ? p.sport.map((s) => <SessionCard key={s.id} s={s} guard={guard} />) : (
            p.week >= 1 && p.week <= PLAN_WEEKS && <Card><p className="muted">Pas de séance de sport prévue. Récupération.</p></Card>
          )}
        </div>
        <div className="stack-16">
          <BlocksCard date={date} />
          <RemindersCard date={date} />
          {isToday && <NextDeadline date={date} />}
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
