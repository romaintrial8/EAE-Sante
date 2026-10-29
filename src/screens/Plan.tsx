import { addDays, dow, fmtDayMonth, mondayOfWeek, PLAN_WEEKS, todayYmd, weekOf } from '../domain/dates';
import { weekAdapt, weekPlanFor } from '../domain/adapt';
import { runKmWeek } from '../domain/health';
import { BLOCS, weekDef, WEEKS } from '../domain/plan';
import { isDone, weekCompletion } from '../domain/progress';
import { useData } from '../data/store';
import { IconCheck, IconLeft, IconRight } from '../ui/icons';
import { Card, Code, fmtNum } from '../ui/kit';
import { href } from '../ui/router';
import { AdaptCard } from './Perfs';

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function WeekStrip({ week }: { week: number }) {
  return (
    <div className="strip" role="img" aria-label={`Semaine ${week} sur ${PLAN_WEEKS}`}>
      {WEEKS.map((w) => (
        <a key={w.n} href={href({ name: 'plan', week: w.n })} title={`S${w.n} · ${BLOCS[w.bloc]}`}
          className={[`b${w.bloc}`, w.deload ? 'deload' : '', w.testWeek || w.penta || w.n === 1 ? 'test' : '', w.n === week ? 'now' : ''].join(' ')}>
          <span hidden>S{w.n}</span>
        </a>
      ))}
    </div>
  );
}

export function PlanScreen({ week }: { week?: number }) {
  const data = useData();
  const today = todayYmd();
  const cur = Math.min(PLAN_WEEKS, Math.max(1, weekOf(today)));
  const n = Math.min(PLAN_WEEKS, Math.max(1, week ?? cur));
  const w = weekDef(n);
  const mon = mondayOfWeek(n);
  const days = weekPlanFor(data, n);
  const ad = weekAdapt(data, n);
  const km = runKmWeek(data, mon);
  const comp = weekCompletion(data, n, today);
  if (!w) return null;
  return (
    <div className="stack-16">
      <div className="weeknav">
        <a className="iconbtn" href={href({ name: 'plan', week: Math.max(1, n - 1) })} aria-label="Semaine précédente"><IconLeft /></a>
        <h2>S{n} <span className="muted" style={{ fontWeight: 500, fontSize: 18 }}>{fmtDayMonth(mon)} → {fmtDayMonth(addDays(mon, 6))}</span></h2>
        <a className="iconbtn" href={href({ name: 'plan', week: Math.min(PLAN_WEEKS, n + 1) })} aria-label="Semaine suivante"><IconRight /></a>
      </div>
      <WeekStrip week={n} />
      <div className="pills">
        <span className="pill brand">{BLOCS[w.bloc]}</span>
        {w.deload && <span className="pill">Décharge</span>}
        {w.notes.filter((x) => x !== 'Décharge' && !x.startsWith('Écart')).map((x) => <span key={x} className={`pill ${x.startsWith('⚠') ? 'crit' : x.startsWith('TEST') || x.startsWith('SIMULATION') ? 'warn' : ''}`}>{x}</span>)}
      </div>
      <div className="summary3">
        <div><b className="num">{fmtNum(km, 1)}<small>/{w.km} km</small></b><span>course Garmin</span></div>
        <div><b className="num">{comp.sport.done}<small>/{comp.sport.total}</small></b><span>séances</span></div>
        <div><b className="num">{comp.concours.done}<small>/{comp.concours.total}</small></b><span>blocs concours</span></div>
      </div>
      <div className="cols">
        <Card>
          <div>
            {days.map((d) => {
              const isToday = d.date === today;
              const conc = d.blocks.length;
              const concDone = d.blocks.filter((b) => isDone(data, b.id)).length;
              return (
                <a key={d.date} href={href({ name: 'day', date: d.date })} className={`day ${isToday ? 'today' : ''}`}>
                  <div className="day-d"><b>{DOW[dow(d.date)]}</b><span className="num">{d.date.slice(8)}</span></div>
                  <div className="day-body">
                    {d.sport.map((s) => {
                      const ok = isDone(data, s.id);
                      return (
                        <div key={s.id} className={`day-line ${ok ? 'done' : ''}`}>
                          <Code kind={s.discipline}>{s.code}</Code>
                          <span className="ttl">{s.title}</span>
                          {s.boosts.length > 0 && <span className="pill brand" title="Adaptée à ta progression">＋</span>}
                          {ok && <span className="okmark"><IconCheck /></span>}
                        </div>
                      );
                    })}
                    {!d.sport.length && <div className="day-line"><span className="ttl faint">{d.flags[0] ?? 'Repos'}</span></div>}
                    {conc > 0 && (
                      <div className="day-line small">
                        <span className="ttl muted">{d.blocks.map((b) => b.title.split(' — ')[0]).join(' · ')}</span>
                        <span className="num caption">{concDone}/{conc}</span>
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </Card>
        <AdaptCard ad={ad} />
      </div>
    </div>
  );
}
