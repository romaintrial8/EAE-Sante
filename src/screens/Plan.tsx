import { addDays, fmtDayMonth, mondayOfWeek, PLAN_WEEKS, todayYmd, weekOf, dow } from '../domain/dates';
import { runKmWeek } from '../domain/health';
import { BLOCS, weekDays, weekDef } from '../domain/plan';
import { isDone, weekCompletion } from '../domain/progress';
import { useData } from '../data/store';
import { IconCheck, IconLeft, IconRight } from '../ui/icons';
import { Card, Code, fmtNum } from '../ui/kit';
import { href } from '../ui/router';
import { WeekStrip } from './Day';

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function PlanScreen({ week }: { week?: number }) {
  const data = useData();
  const today = todayYmd();
  const cur = Math.min(PLAN_WEEKS, Math.max(1, weekOf(today)));
  const n = Math.min(PLAN_WEEKS, Math.max(1, week ?? cur));
  const w = weekDef(n);
  const mon = mondayOfWeek(n);
  const days = weekDays(n);
  const km = runKmWeek(data, mon);
  const comp = weekCompletion(data, n, today);
  const pct = (d: number, t: number) => (t ? Math.round((d / t) * 100) : 0);
  if (!w) return null;
  return (
    <div className="stack-16">
      <div className="weeknav">
        <a className={`iconbtn ${n <= 1 ? 'disabled' : ''}`} href={href({ name: 'plan', week: Math.max(1, n - 1) })} aria-label="Semaine précédente"><IconLeft /></a>
        <h2>S{n} <span className="muted" style={{ fontWeight: 500, fontSize: 18 }}>{fmtDayMonth(mon)} → {fmtDayMonth(addDays(mon, 6))}</span></h2>
        <a className="iconbtn" href={href({ name: 'plan', week: Math.min(PLAN_WEEKS, n + 1) })} aria-label="Semaine suivante"><IconRight /></a>
      </div>
      <WeekStrip week={n} />
      <div className="pills">
        <span className="pill brand">Bloc {w.bloc} · {BLOCS[w.bloc]}</span>
        {w.deload && <span className="pill">Décharge</span>}
        {w.notes.filter((x) => x !== 'Décharge').map((x) => <span key={x} className={`pill ${x.startsWith('⚠') ? 'crit' : x.startsWith('TEST') || x.startsWith('SIMULATION') ? 'warn' : ''}`}>{x}</span>)}
      </div>
      <div className="cols">
        <Card title="Bilan de la semaine" aside={n === cur ? <span className="caption">jusqu’à aujourd’hui</span> : undefined}>
          <div className="stack">
            <div className="stack-8">
              <div className="spread"><span className="small">Course (Garmin)</span><span className="num small"><b>{fmtNum(km, 1)}</b> / {w.km} km</span></div>
              <div className="bar"><i style={{ width: `${Math.min(100, pct(km, w.km))}%` }} /></div>
            </div>
            <div className="stack-8">
              <div className="spread"><span className="small">Séances cochées</span><span className="num small"><b>{comp.sport.done}</b> / {comp.sport.total}</span></div>
              <div className="bar ok"><i style={{ width: `${pct(comp.sport.done, comp.sport.total)}%` }} /></div>
            </div>
            <div className="stack-8">
              <div className="spread"><span className="small">Blocs concours</span><span className="num small"><b>{comp.concours.done}</b> / {comp.concours.total}</span></div>
              <div className="bar"><i style={{ width: `${pct(comp.concours.done, comp.concours.total)}%` }} /></div>
            </div>
            <p className="caption">Les totaux ne comptent que les jours passés et aujourd’hui. Kilomètres : activités de course reçues de Garmin, du lundi au dimanche.</p>
          </div>
        </Card>
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
                          {ok && <span className="okmark"><IconCheck /></span>}
                        </div>
                      );
                    })}
                    {!d.sport.length && <div className="day-line"><span className="ttl faint">{d.flags[0] ?? 'Repos'}</span></div>}
                    {conc > 0 && (
                      <div className="day-line small">
                        <Code kind="conc">CONC.</Code>
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
      </div>
    </div>
  );
}
