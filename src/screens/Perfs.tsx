import { useState } from 'react';
import { EVENT_ORDER, EVENTS, fmtPerf, noteFor, type TestEvent } from '../domain/bareme';
import { fmtShort, PLAN_WEEKS, todayYmd, weekOf } from '../domain/dates';
import { weekAdapt, type WeekAdapt } from '../domain/adapt';
import { allProgress, pathAt, requiredPath, sportScore, STATUS_LABEL, testsOf, type Progress } from '../domain/progression';
import { MILESTONES, TARGETS } from '../domain/targets';
import { deleteTest } from '../data/actions';
import { useData } from '../data/store';
import { IconPlus, IconRight, IconTrash } from '../ui/icons';
import { Card, fmtNum, Method, Sheet } from '../ui/kit';
import { TestSheet } from './sheets';

const unit = (e: TestEvent, v: number) => `${fmtPerf(e, v)}${EVENTS[e].unit === 'reps' ? ' rép.' : ''}`;

export function fmtGap(e: TestEvent, gap: number): string {
  if (EVENTS[e].unit === 'reps') return `${Math.ceil(gap - 1e-9)} rép.`;
  return `${fmtNum(gap, e === 'run3000' ? 0 : e === 'sprint50' ? 2 : 1)} s`;
}

const weeksTxt = (w: number) => `${fmtNum(Math.abs(w), 1)} sem.`;

function statusPill(p: Progress) {
  if (p.status === 'none') return <span className="pill">Pas de mesure</span>;
  if (p.status === 'ahead') return <span className="pill ok">Avance {weeksTxt(p.delayWeeks)}</span>;
  if (p.status === 'ontrack') return <span className="pill ok">Dans les clous</span>;
  return <span className={`pill ${p.status === 'farbehind' ? 'crit' : 'warn'}`}>Retard {weeksTxt(p.delayWeeks)}</span>;
}

const BOOST_TXT: Record<TestEvent, [string, string]> = {
  pullups: ['GTG tous les jours + 1 série de tractions le lundi', 'séance courte le samedi : 3 à 5 × (max − 2)'],
  situps: ['+2 répétitions par série d’abdos (lun. et jeu.)', '3 × 30 s d’abdos après la natation'],
  run3000: ['400 m à l’allure du prochain jalon en fin de seuil', '1 fraction de plus en VMA'],
  sprint50: ['2 départs de plus le mardi', 'foulées bondissantes + départs en échauffement du lundi'],
  swim50: ['4 × 15 m sprint et 2 départs plongés de plus', 'séance technique optionnelle le dimanche'],
};

export function AdaptCard({ ad }: { ad: WeekAdapt }) {
  return (
    <Card title={`Adaptations S${ad.week}`} aside={<span className="caption">décidées le lundi</span>}>
      <div className="stack">
        {ad.boosts.length > 0 ? (
          <div className="items">
            {ad.boosts.map((b) => (
              <div key={b.event} className="item">
                <span className="t">
                  <b>{EVENTS[b.event].label} · retard {weeksTxt(b.delayWeeks)}</b>
                  <span>{BOOST_TXT[b.event][0]}{b.level === 2 ? ` ; ${BOOST_TXT[b.event][1]}` : ''}.</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="small">{ad.suspended ? `Pas de renfort cette semaine : ${ad.suspended}.` : 'Aucune épreuve en retard : plan de base.'}</p>
        )}
        {ad.waiting.length > 0 && (
          <p className="small muted">En attente : {ad.waiting.map((w) => `${EVENTS[w.event].short.toLowerCase()} (retard ${weeksTxt(w.delayWeeks)})`).join(', ')}{ad.boosts.length ? ' — plafond de 2 renforts par semaine' : ''}.</p>
        )}
        <p className="small muted">Allures calculées sur une VMA de <b>{fmtNum(ad.vma.vma, 1)} km/h</b>{ad.vma.source === '3000' && ad.vma.date && ad.vma.value ? ` (3000 m en ${fmtPerf('run3000', ad.vma.value)} le ${fmtShort(ad.vma.date)})` : ' (demi-Cooper du S0)'}.</p>
        <Method summary="Règles d’adaptation">
          <p>Chaque lundi, l’app compare ta dernière mesure de chaque épreuve à la trajectoire de la passation (ligne droite entre ta première mesure et les jalons S7, S15, S20, Jour J). Le retard est converti en semaines de progression prévue. Une épreuve est renforcée dès 0,5 semaine de retard (niveau 1), plus fort au-delà de 4 semaines (niveau 2).</p>
          <p>Sécurité : au plus 2 épreuves renforcées par semaine ; course : au plus +10 % du kilométrage prévu ; aucun renfort en décharge, semaine de tests, simulation ou affûtage, ni si le garde-fou s’est déclenché 2 jours ou plus la semaine précédente. Un résultat saisi en cours de semaine compte à partir du lundi suivant.</p>
          <p>Allures : celles de la passation sont écrites pour une VMA de 15,0 km/h. Elles sont recalculées avec ta VMA du moment, estimée à partir de ton dernier 3000 m (vitesse ÷ 0,93). L’allure cible du 3000 m (4'03/km) ne change pas.</p>
        </Method>
      </div>
    </Card>
  );
}

function EventSheet({ p, onClose, onAdd }: { p: Progress; onClose: () => void; onAdd: () => void }) {
  const data = useData();
  const e = p.event;
  const all = testsOf(data, e);
  const path = p.baseline ? requiredPath(e, p.baseline) : null;
  const today = todayYmd();
  return (
    <Sheet title={EVENTS[e].label} onClose={onClose}>
      <div className="spread">
        <div>
          <div className="big">{p.latest ? fmtPerf(e, p.latest.value) : '—'}{p.latest && EVENTS[e].unit === 'reps' && <small>rép.</small>}</div>
          <div className="caption">{p.latest ? `${fmtShort(p.latest.date)} · ${p.note}/20` : 'aucun résultat'}</div>
        </div>
        {statusPill(p)}
      </div>
      {path && (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Trajectoire</th><th>Exigé</th><th>Note</th></tr></thead>
            <tbody>
              <tr><td>Aujourd’hui</td><td>{unit(e, Math.round(pathAt(path, today) * 100) / 100)}</td><td>{noteFor(e, EVENTS[e].unit === 'reps' ? Math.floor(pathAt(path, today)) : pathAt(path, today))}/20</td></tr>
              {MILESTONES.filter((m) => m.key !== 'S0' && m.date >= today).map((m) => {
                const v = TARGETS[e][m.key as 'S7' | 'S15' | 'S20' | 'J'];
                return <tr key={m.key}><td>{m.label} · {fmtShort(m.date)}</td><td>{TARGETS[e].text?.[m.key as 'S7'] ?? unit(e, v)}</td><td>{noteFor(e, v)}/20</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
      {p.projection && p.count >= 2 && (
        <p className="small">Projection Jour J : <b>{unit(e, Math.round(p.projection.value * 100) / 100)} · {p.projection.note}/20</b> <span className="muted">({p.projection.method === 'trend' ? 'tendance de tes mesures' : 'si ton écart actuel reste le même'})</span></p>
      )}
      {all.length > 0 && (
        <div className="hist">
          {[...all].reverse().map((r) => (
            <div key={r.id} className="item">
              <span className="t"><b className="num">{unit(e, r.value)} · {noteFor(e, r.value)}/20</b><span>{fmtShort(r.date)}{r.note ? ` · ${r.note}` : ''}</span></span>
              <button type="button" className="iconbtn" aria-label="Supprimer ce résultat" onClick={() => deleteTest(r.id)}><IconTrash /></button>
            </div>
          ))}
        </div>
      )}
      <div className="sheet-actions"><button type="button" className="btn primary" onClick={onAdd}><IconPlus />Saisir un résultat</button></div>
    </Sheet>
  );
}

export function PerfsScreen() {
  const data = useData();
  const today = todayYmd();
  const [add, setAdd] = useState<TestEvent | 'any' | null>(null);
  const [detail, setDetail] = useState<TestEvent | null>(null);
  const prog = allProgress(data, today);
  const score = sportScore(data, today);
  const wk = Math.min(PLAN_WEEKS, Math.max(1, weekOf(today)));
  const ad = weekAdapt(data, wk);
  const reachable = EVENT_ORDER.map((e) => prog[e]).filter((p) => p.nextPoint)
    .sort((a, b) => (a.nextPoint?.weeks ?? 99) - (b.nextPoint?.weeks ?? 99));
  const missing = EVENT_ORDER.filter((e) => prog[e].status === 'none');
  return (
    <div className="stack-16">
      <div className="score-hero">
        <div className="spread" style={{ alignItems: 'flex-end' }}>
          <div>
            <span className="label">Note sportive actuelle</span>
            <div className="big">{score.avg !== null ? fmtNum(score.avg, 1) : '—'}<small>/20</small></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="label">Cible</span>
            <div className="big">15<small>/20</small></div>
          </div>
        </div>
        <span className="small" style={{ opacity: 0.8 }}>
          Moyenne de {score.count} épreuve{score.count > 1 ? 's' : ''} sur 5{missing.length ? ` · sans mesure : ${missing.map((e) => EVENTS[e].short.toLowerCase()).join(', ')}` : ''}.
        </span>
      </div>
      <div className="cols">
        <div className="stack-16">
          <Card title="Tes épreuves" aside={<button type="button" className="btn small primary" onClick={() => setAdd('any')}><IconPlus />Saisir</button>}>
            <div className="items">
              {EVENT_ORDER.map((e) => {
                const p = prog[e];
                return (
                  <button key={e} type="button" className="item" onClick={() => setDetail(e)}>
                    <span className="t">
                      <b>{EVENTS[e].label}</b>
                      <span className="num">{p.latest ? `${unit(e, p.latest.value)} · ${p.note}/20` : TARGETS[e].s0Estimate ?? 'aucun résultat'}</span>
                    </span>
                    {statusPill(p)}
                    <span className="chev"><IconRight /></span>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card title="Où gagner des points">
            <div className="items">
              {reachable.map((p) => (
                <div key={p.event} className="item">
                  <span className="t">
                    <b>{EVENTS[p.event].label} : {fmtGap(p.event, p.nextPoint?.gap ?? 0)} → {p.nextPoint?.note}/20</b>
                    <span>{p.nextPoint?.weeks !== null && p.nextPoint?.weeks !== undefined ? `≈ ${fmtNum(Math.max(0.5, p.nextPoint.weeks), 1)} sem. de progression au rythme du plan` : ''}</span>
                  </span>
                </div>
              ))}
              {!reachable.length && <p className="small muted">Saisis au moins un résultat pour voir où sont les points les plus proches.</p>}
            </div>
            <p className="caption" style={{ marginTop: 8 }}>Classé du point le plus proche au plus lointain, en semaines de progression prévue par la passation.</p>
          </Card>
        </div>
        <div className="stack-16">
          <AdaptCard ad={ad} />
          <Card title="Barème">
            <Method summary="Comment la note est calculée">
              <p>Barème hommes de l’arrêté du 30 août 2021. Une performance entre deux valeurs reçoit la note de la valeur inférieure. Moyenne simple de ta dernière performance sur chaque épreuve mesurée ; les coefficients réels sont dans l’arrêté d’organisation du concours. Seuil éliminatoire : moyenne ≤ 6/20.</p>
              <p>Tolérance de mesure pour le retard : répétitions arrondies à l’entier inférieur, 0,15 s en natation, 0,05 s au sprint, 5 s au 3000 m.</p>
            </Method>
          </Card>
        </div>
      </div>
      {detail && <EventSheet p={prog[detail]} onClose={() => setDetail(null)} onAdd={() => { setAdd(detail); setDetail(null); }} />}
      {add && <TestSheet initialEvent={add === 'any' ? undefined : add} onClose={() => setAdd(null)} />}
    </div>
  );
}
