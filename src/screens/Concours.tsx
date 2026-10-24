import { diffDays, fmtShort, mondayOfWeek, PLAN_WEEKS, todayYmd, weekOf } from '../domain/dates';
import { MOCK_ORALS, sortedDeadlines } from '../domain/deadlines';
import { CG_THEMES, dayPlan, type BlockKind } from '../domain/plan';
import { isDone, weekCompletion } from '../domain/progress';
import { setDeadlineDone } from '../data/actions';
import { useData } from '../data/store';
import { Card, CheckItem, hm } from '../ui/kit';
import { href } from '../ui/router';

const CAT: { kind: BlockKind; label: string }[] = [
  { kind: 'PSY', label: 'Psychotech' },
  { kind: 'ANG', label: 'Anglais' },
  { kind: 'CG', label: 'Fiche culture G' },
  { kind: 'EXP', label: 'Exposé filmé' },
  { kind: 'ACT', label: 'Actualité défense' },
  { kind: 'DOS', label: 'Dossier / entretien' },
  { kind: 'ENT', label: 'Entretien / culture G' },
  { kind: 'ORAL', label: 'Oral blanc' },
];

export function ConcoursScreen() {
  const data = useData();
  const today = todayYmd();
  const wk = Math.min(PLAN_WEEKS, Math.max(1, weekOf(today)));
  const comp = weekCompletion(data, wk, today);
  const dls = sortedDeadlines();
  const dlDone = (id: string) => !!data.deadlines[id] && !data.deadlines[id]?.deleted;
  const upcoming = dls.filter((d) => d.date >= today && !dlDone(d.id));
  const focus = [...upcoming.filter((d) => d.critical), ...upcoming.filter((d) => !d.critical)].slice(0, 3).sort((a, b) => a.date.localeCompare(b.date));
  const oralBlock = (date: string) => dayPlan(date).blocks.find((b) => b.kind === 'ORAL');
  return (
    <div className="stack-16">
      <div className="countdown">
        {focus.map((d) => {
          const j = diffDays(d.date, today);
          return (
            <div key={d.id} className={`cd ${d.critical ? 'critical' : ''}`}>
              <span className="j">{j === 0 ? 'J' : `J-${j}`}</span>
              <div className="stack-8" style={{ gap: 2, minWidth: 0 }}>
                <span className="label">{d.approx ? '~' : ''}{fmtShort(d.date)}{d.time ? ` · ${hm(d.time)} LR` : ''}</span>
                <p>{d.title}{d.tbc ? ' (à confirmer)' : ''}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="cols">
        <div className="stack-16">
          <Card title={`Semaine S${wk}`} aside={<span className="caption num">{comp.concours.done}/{comp.concours.total} blocs faits</span>}>
            <div className="stack">
              {CAT.filter((c) => comp.byKind[c.kind]).map((c) => {
                const k = comp.byKind[c.kind] as { done: number; total: number };
                return (
                  <div key={c.kind} className="stack-8">
                    <div className="spread"><span className="small">{c.label}</span><span className="num small"><b>{k.done}</b> / {k.total}</span></div>
                    <div className="bar"><i style={{ width: `${k.total ? (k.done / k.total) * 100 : 0}%` }} /></div>
                  </div>
                );
              })}
              <p className="caption">Compté du lundi à aujourd’hui. Coche les blocs sur l’écran du jour.</p>
            </div>
          </Card>
          <Card title="Échéances">
            <div className="items">
              {dls.map((d) => {
                const past = d.date < today;
                return (
                  <CheckItem key={d.id} done={dlDone(d.id)} onToggle={() => setDeadlineDone(d.id, !dlDone(d.id))}
                    title={d.title}
                    sub={<>{d.approx ? '~' : ''}{fmtShort(d.date)}{d.time ? ` · ${hm(d.time)} Little Rock` : ''}{d.tbc ? ' · à confirmer' : ''}{past && !dlDone(d.id) ? ' · passée' : ''}{d.detail ? <><br />{d.detail}</> : null}</>} />
                );
              })}
            </div>
          </Card>
        </div>
        <div className="stack-16">
          <Card title="Fiches de culture générale" aside={<span className="caption">lundi 20 h → exposé du samedi</span>}>
            <div className="fiches">
              {CG_THEMES.map((theme, i) => {
                const n = i + 1;
                const mon = mondayOfWeek(n);
                const cg = dayPlan(mon).blocks.find((b) => b.kind === 'CG' || b.kind === 'ENT');
                const done = cg ? isDone(data, cg.id) : false;
                return (
                  <a key={n} href={href({ name: 'day', date: mon })} className={`fiche ${done ? 'done' : ''} ${n === wk ? 'now' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <b>S{n}{done ? ' · faite' : ''}</b>
                    <span>{theme}</span>
                  </a>
                );
              })}
            </div>
          </Card>
          <Card title="Oraux blancs" aside={<span className="caption">visio 5e escadre de chasse</span>}>
            <div className="items">
              {MOCK_ORALS.map((o) => {
                const b = oralBlock(o.date);
                const done = b ? isDone(data, b.id) : false;
                return (
                  <a key={o.n} className={`item ${done ? 'is-done' : ''}`} href={href({ name: 'day', date: o.date })} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className="t"><b>Oral blanc {o.n}</b><span>{fmtShort(o.date)} · {o.lr !== '—' ? `${hm(o.lr)} LR = ` : ''}{hm(o.paris)} Paris · à confirmer</span></span>
                    <span className={`pill ${done ? 'ok' : o.date < today ? '' : 'brand'}`}>{done ? 'Fait' : o.date < today ? 'Passé' : `J-${diffDays(o.date, today)}`}</span>
                  </a>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
