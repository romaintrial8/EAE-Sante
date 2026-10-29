import { useState } from 'react';
import { addDays, fmtShort, range, todayYmd, type Ymd } from '../domain/dates';
import { BB_LIMIT, dayHealth, fmtDuration, seriesOf, zoneBefore } from '../domain/health';
import { WEIGHT_PATH, weightTarget } from '../domain/targets';
import { useData } from '../data/store';
import { BarChart, LineChart } from '../ui/charts';
import { Card, fmtNum, Method, Seg } from '../ui/kit';
import { getIcuConfig } from '../data/prefs';
import { href } from '../ui/router';

type Period = '30' | '90' | 'all';

export function HealthScreen() {
  const data = useData();
  const [period, setPeriod] = useState<Period>('30');
  const to = todayYmd();
  const from: Ymd = period === '30' ? addDays(to, -29) : period === '90' ? addDays(to, -89) : '2026-09-01';
  const hrv = seriesOf(data, 'hrv', from, to);
  const band = range(from, to).map((d) => {
    const z = zoneBefore(data, 'hrv', d);
    return z ? { date: d, low: z.low, high: z.high } : null;
  }).filter((b): b is { date: Ymd; low: number; high: number } => !!b);
  const rhr = seriesOf(data, 'restingHR', from, to);
  const sleepScore = seriesOf(data, 'sleepScore', from, to);
  const sleepH = seriesOf(data, 'sleepSecs', from, to).map((p) => ({ date: p.date, value: p.value / 3600 }));
  const weight = seriesOf(data, 'weight', from, to);
  const target = range(from, to).filter((d, i, arr) => i === 0 || i === arr.length - 1 || WEIGHT_PATH.some((w) => w.date === d))
    .map((d) => ({ date: d, value: weightTarget(d) })).filter((p): p is { date: Ymd; value: number } => p.value !== null);
  const bb = seriesOf(data, 'bodyBattery', from, to);
  const avg = (pts: { value: number }[]) => (pts.length ? pts.reduce((a, b) => a + b.value, 0) / pts.length : null);
  const last14 = range(addDays(to, -13), to).reverse();
  const noData = !hrv.length && !rhr.length && !sleepScore.length && !weight.length;
  return (
    <div className="stack-16">
      <div className="row-wrap">
        <Seg label="Période" value={period} onChange={setPeriod} options={[{ value: '30', label: '30 j' }, { value: '90', label: '90 j' }, { value: 'all', label: 'Depuis sept.' }]} />
      </div>
      {noData && (
        <div className="empty">
          <b>Aucune donnée santé pour l’instant.</b>
          <span className="small muted">{getIcuConfig() ? 'La première synchronisation peut prendre quelques secondes. Vérifie dans Intervals.icu que la connexion Garmin importe bien les données « wellness ».' : 'Connecte Intervals.icu pour recevoir ton sommeil, ta VFC, ta FC de repos et ton poids depuis ta montre.'}</span>
          {!getIcuConfig() && <a className="btn primary" href={href({ name: 'settings' })}>Connecter Intervals.icu</a>}
        </div>
      )}
      <div className="cols">
        <div className="stack-16">
          <Card title="VFC de la nuit" aside={<span className="caption num">{hrv.length ? `moy. ${Math.round(avg(hrv) ?? 0)} ms` : ''}</span>}>
            <LineChart ariaLabel="VFC de la nuit en millisecondes, avec ta zone habituelle" from={from} to={to} series={[{ points: hrv, color: 'var(--brand)', label: 'VFC' }]} band={band} fmt={(v) => `${Math.round(v)}`}>
              <div className="legend"><span><i style={{ background: 'var(--brand)' }} />VFC (ms)</span><span><i className="bandk" />zone habituelle (28 nuits)</span></div>
            </LineChart>
            <Method><p>rMSSD moyen de la nuit mesuré par ta montre. La bande montre, pour chaque jour, la moyenne ± 1 écart-type des 28 nuits précédentes (dès 10 nuits). Deux nuits de suite sous la bande déclenchent le garde-fou des séances qualité.</p></Method>
          </Card>
          <Card title="FC de repos" aside={<span className="caption num">{rhr.length ? `moy. ${Math.round(avg(rhr) ?? 0)} bpm` : ''}</span>}>
            <LineChart ariaLabel="Fréquence cardiaque de repos en battements par minute" from={from} to={to} series={[{ points: rhr, color: 'var(--d-run)', label: 'FC repos' }]} fmt={(v) => `${Math.round(v)}`}>
              <div className="legend"><span><i style={{ background: 'var(--d-run)' }} />FC de repos (bpm)</span></div>
            </LineChart>
            <Method><p>Valeur journalière calculée par Garmin. Une hausse de plus de 5 bpm au-dessus de ta moyenne sur 28 jours est signalée en rouge sur l’écran du jour : fatigue, maladie ou manque de sommeil.</p></Method>
          </Card>
          <Card title="Poids" aside={<span className="caption num">{weight.length ? `dernier : ${fmtNum((weight[weight.length - 1] as { value: number }).value, 1)} kg` : ''}</span>}>
            <LineChart ariaLabel="Poids en kilogrammes et trajectoire cible" from={from} to={to} series={[{ points: target, color: 'var(--ink-3)', label: 'cible', dashed: true, maxGap: 400 }, { points: weight, color: 'var(--ink)', label: 'poids', dots: true, maxGap: 10 }]} fmt={(v) => fmtNum(v, 1)}>
              <div className="legend"><span><i style={{ background: 'var(--ink)' }} />poids (kg)</span><span><i className="dash" />trajectoire cible : 87 → 81 kg en S20</span></div>
            </LineChart>
            <Method><p>Pesées Garmin (balance connectée) ou saisies dans le check-in du mercredi et du samedi. La cible relie les jalons de la passation en ligne droite.</p></Method>
          </Card>
        </div>
        <div className="stack-16">
          <Card title="Sommeil" aside={<span className="caption num">{sleepScore.length ? `moy. ${Math.round(avg(sleepScore) ?? 0)}/100` : ''}{sleepH.length ? ` · ${fmtDuration((avg(sleepH) ?? 0) * 3600)}` : ''}</span>}>
            <BarChart ariaLabel="Score de sommeil Garmin sur 100" from={from} to={to} points={sleepScore} color="var(--brand)" yMax={100} fmt={(v) => `${v}`} />
            <Method><p>Score de sommeil calculé par Garmin (sur 100). La durée en haut à droite est le temps réellement endormi, pas le temps au lit : vise près de 7 h 30 pour 7 h 45 au lit (22 h 00 – 05 h 45).</p></Method>
          </Card>
          {bb.length > 0 && (
            <Card title="Body Battery au réveil">
              <BarChart ariaLabel="Body Battery au réveil" from={from} to={to} points={bb} color="var(--ok)" yMax={100} threshold={{ value: BB_LIMIT, label: '40' }} />
              <div className="legend"><span><i className="dash" />seuil du garde-fou : {BB_LIMIT}</span></div>
            </Card>
          )}
          <details className="card fold">
            <summary>Détail des 14 derniers jours</summary>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Jour</th><th>Sommeil</th><th>Durée</th><th>VFC</th><th>FC rep.</th><th>BB</th><th>Poids</th></tr></thead>
                <tbody>
                  {last14.map((d) => {
                    const h = dayHealth(data, d);
                    const c = (v: { value: number; src: string } | undefined, f: (n: number) => string) => v ? <span className={v.src === 'manual' ? 'm' : ''}>{f(v.value)}</span> : <span className="faint">—</span>;
                    return (
                      <tr key={d}>
                        <td>{fmtShort(d)}</td>
                        <td>{c(h.sleepScore, (n) => `${Math.round(n)}`)}</td>
                        <td>{c(h.sleepSecs, (n) => fmtDuration(n))}</td>
                        <td>{c(h.hrv, (n) => `${Math.round(n)}`)}</td>
                        <td>{c(h.restingHR, (n) => `${Math.round(n)}`)}</td>
                        <td>{c(h.bodyBattery, (n) => `${Math.round(n)}`)}</td>
                        <td>{c(h.weight, (n) => fmtNum(n, 1))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="caption" style={{ marginTop: 8 }}>En bleu : valeur saisie à la main (elle remplace celle de Garmin).</p>
          </details>
        </div>
      </div>
    </div>
  );
}
