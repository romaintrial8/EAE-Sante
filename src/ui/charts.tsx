// Graphiques SVG faits main : à l'échelle réelle du conteneur, couleurs par jetons (clair/sombre automatique).
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { diffDays, fmtDdMm, addDays, type Ymd } from '../domain/dates';

function useWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(320);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(200, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export interface Pt { date: Ymd; value: number }
export interface LineSeries { points: Pt[]; color: string; label: string; dashed?: boolean; dots?: boolean; /** écart max (jours) relié par un trait */ maxGap?: number }

interface Frame { from: Ymd; to: Ymd; height?: number; fmt?: (v: number) => string; ariaLabel: string; yMin?: number; yMax?: number }

export function LineChart({ series, band, from, to, height = 180, fmt = (v) => String(v), ariaLabel, yMin, yMax, children }: Frame & { series: LineSeries[]; band?: { date: Ymd; low: number; high: number }[]; children?: ReactNode }) {
  const [ref, W] = useWidth();
  const all = [...series.flatMap((s) => s.points.map((p) => p.value)), ...(band ?? []).flatMap((b) => [b.low, b.high])];
  const has = series.some((s) => s.points.length > 0);
  let lo = yMin ?? (all.length ? Math.min(...all) : 0);
  let hi = yMax ?? (all.length ? Math.max(...all) : 1);
  const pad = (hi - lo) * 0.12 || 1;
  if (yMin === undefined) lo -= pad;
  if (yMax === undefined) hi += pad;
  const ticks = niceTicks(lo, hi);
  lo = Math.min(lo, ticks[0] ?? lo);
  hi = Math.max(hi, ticks[ticks.length - 1] ?? hi);
  const labelW = Math.max(...ticks.map((t) => fmt(t).length)) * 6.5 + 10;
  const L = labelW, R = 10, T = 10, B = 24;
  const days = Math.max(1, diffDays(to, from));
  const x = (d: Ymd) => L + (diffDays(d, from) / days) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (height - T - B);
  const path = (pts: Pt[], maxGap = 3) => {
    let d = '';
    let prev: Pt | null = null;
    for (const p of pts) {
      const gap = prev ? diffDays(p.date, prev.date) > maxGap : true;
      d += `${gap ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`;
      prev = p;
    }
    return d;
  };
  const bandPath = band && band.length > 1
    ? `M${band.map((b) => `${x(b.date).toFixed(1)},${y(b.high).toFixed(1)}`).join('L')}L${[...band].reverse().map((b) => `${x(b.date).toFixed(1)},${y(b.low).toFixed(1)}`).join('L')}Z`
    : null;
  const xTicks = [from, addDays(from, Math.round(days / 2)), to];
  return (
    <div ref={ref}>
      <svg className="chart" width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {xTicks.map((d, i) => (
          <text key={d + i} x={x(d)} y={height - 6} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>{fmtDdMm(d)}</text>
        ))}
        {bandPath && <path className="band" d={bandPath} />}
        {series.map((s) => (
          <g key={s.label}>
            <path d={path(s.points, s.maxGap)} fill="none" style={{ stroke: s.color }} strokeWidth={s.dashed ? 1.5 : 2} strokeDasharray={s.dashed ? '4 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
            {(s.dots || s.points.length < 20) && !s.dashed && s.points.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.5} style={{ fill: s.color }} />)}
            {!s.dashed && s.points.length > 0 && (() => {
              const last = s.points[s.points.length - 1] as Pt;
              return <circle cx={x(last.date)} cy={y(last.value)} r={4.5} style={{ fill: s.color, stroke: 'var(--panel)' }} strokeWidth={2} />;
            })()}
          </g>
        ))}
        {!has && <text x={W / 2} y={height / 2} textAnchor="middle">Pas encore de données</text>}
      </svg>
      {children}
    </div>
  );
}

export function BarChart({ points, from, to, height = 160, color, fmt = (v) => String(v), ariaLabel, yMin = 0, yMax, threshold }: Frame & { points: Pt[]; color: string; threshold?: { value: number; label: string } }) {
  const [ref, W] = useWidth();
  const vals = points.map((p) => p.value);
  const hi = yMax ?? Math.max(1, ...vals, threshold?.value ?? 0);
  const ticks = niceTicks(yMin, hi, 3);
  const top = Math.max(hi, ticks[ticks.length - 1] ?? hi);
  const labelW = Math.max(...ticks.map((t) => fmt(t).length)) * 6.5 + 10;
  const L = labelW, R = 10, T = 10, B = 24;
  const days = Math.max(1, diffDays(to, from) + 1);
  const slot = (W - L - R) / days;
  const bw = Math.max(1.5, Math.min(18, slot * 0.7));
  const y = (v: number) => T + (1 - (v - yMin) / (top - yMin)) * (height - T - B);
  const xTicks = [from, addDays(from, Math.round((days - 1) / 2)), to];
  return (
    <div ref={ref}>
      <svg className="chart" width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {points.map((p) => {
          const cx = L + (diffDays(p.date, from) + 0.5) * slot;
          return <rect key={p.date} x={cx - bw / 2} y={y(p.value)} width={bw} height={Math.max(1, y(yMin) - y(p.value))} rx={Math.min(3, bw / 2)} style={{ fill: color }} />;
        })}
        {threshold && <line x1={L} x2={W - R} y1={y(threshold.value)} y2={y(threshold.value)} style={{ stroke: 'var(--ink-3)' }} strokeDasharray="4 4" />}
        {xTicks.map((d, i) => (
          <text key={d + i} x={L + (diffDays(d, from) + 0.5) * slot} y={height - 6} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>{fmtDdMm(d)}</text>
        ))}
        {!points.length && <text x={W / 2} y={height / 2} textAnchor="middle">Pas encore de données</text>}
      </svg>
    </div>
  );
}

/** Petite courbe d'historique (tests). */
export function Spark({ values, color, better }: { values: number[]; color: string; better: 'higher' | 'lower' }) {
  const W = 120, H = 36, P = 4;
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const y = (v: number) => better === 'higher' ? H - P - ((v - lo) / span) * (H - 2 * P) : P + ((v - lo) / span) * (H - 2 * P);
  const x = (i: number) => P + (i / (values.length - 1)) * (W - 2 * P);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const last = values[values.length - 1] as number;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={d} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r={3.5} style={{ fill: color }} />
    </svg>
  );
}
