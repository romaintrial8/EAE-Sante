import { useState } from 'react';
import { EVENT_ORDER, EVENTS, fmtPerf, noteFor, parsePerf, type TestEvent } from '../domain/bareme';
import { fmtLong, todayYmd, type Ymd } from '../domain/dates';
import { dayHealth } from '../domain/health';
import type { SportSession } from '../domain/plan';
import type { DoneStatus, HrvStatus } from '../domain/types';
import { addTest, clearDone, saveCheckin, setDone } from '../data/actions';
import { useData } from '../data/store';
import { Seg, Sheet } from '../ui/kit';
import { showToast } from '../ui/toast';

const toNum = (s: string): number | undefined => {
  const n = Number(s.replace(',', '.').trim());
  return s.trim() && Number.isFinite(n) ? n : undefined;
};

export function CheckinSheet({ date, onClose }: { date: Ymd; onClose: () => void }) {
  const data = useData();
  const c = data.checkin[date];
  const w = data.wellness[date];
  const h = dayHealth(data, date);
  const manual = c && !c.deleted ? c : undefined;
  const [bb, setBb] = useState(manual?.bodyBattery?.toString() ?? '');
  const [status, setStatus] = useState<HrvStatus | 'none'>(manual?.hrvStatus ?? 'none');
  const [weight, setWeight] = useState(manual?.weight?.toString().replace('.', ',') ?? '');
  const [sleep, setSleep] = useState(manual?.sleepScore?.toString() ?? '');
  const [rhr, setRhr] = useState(manual?.restingHR?.toString() ?? '');
  const [note, setNote] = useState(manual?.note ?? '');
  const ph = (v: number | undefined, unit = '') => (v !== undefined ? `Garmin : ${String(v).replace('.', ',')}${unit}` : 'non reçu');
  const save = () => {
    saveCheckin(date, {
      bodyBattery: toNum(bb), hrvStatus: status === 'none' ? undefined : status,
      weight: toNum(weight), sleepScore: toNum(sleep), restingHR: toNum(rhr), note: note.trim() || undefined,
    });
    showToast('Check-in enregistré');
    onClose();
  };
  return (
    <Sheet title={`Check-in du ${fmtLong(date)}`} onClose={onClose}>
      <p className="small muted">Les valeurs Garmin arrivent seules. Ce que tu saisis ici les remplace pour ce jour et n’est jamais écrasé par un import.</p>
      <div className="fields">
        <label className="field"><span>Body Battery au réveil</span>
          <input id="ci-bb" className="input num" inputMode="numeric" value={bb} onChange={(e) => setBb(e.target.value)} placeholder={ph(w?.bodyBattery)} />
        </label>
        <label className="field"><span>Poids (kg)</span>
          <input id="ci-weight" className="input num" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={ph(w?.weight, ' kg')} />
        </label>
        <label className="field"><span>Score de sommeil</span>
          <input id="ci-sleep" className="input num" inputMode="numeric" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder={ph(w?.sleepScore)} />
        </label>
        <label className="field"><span>FC de repos (bpm)</span>
          <input id="ci-rhr" className="input num" inputMode="numeric" value={rhr} onChange={(e) => setRhr(e.target.value)} placeholder={ph(w?.restingHR)} />
        </label>
      </div>
      <div className="field">
        <span>Statut VFC affiché par Garmin</span>
        <Seg label="Statut VFC" value={status} onChange={setStatus} options={[
          { value: 'none', label: 'Auto' }, { value: 'balanced', label: 'Équilibré' }, { value: 'unbalanced', label: 'Déséquilibré' }, { value: 'low', label: 'Faible' },
        ]} />
        <span className="caption" style={{ textTransform: 'none', letterSpacing: 0 }}>« Auto » : l’app compare ta VFC de la nuit ({h.hrv ? `${Math.round(h.hrv.value)} ms` : 'non reçue'}) à ta zone habituelle.</span>
      </div>
      <label className="field"><span>Note</span>
        <textarea id="ci-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Courbatures, stress, voyage…" />
      </label>
      <div className="sheet-actions">
        <button type="button" className="btn" onClick={onClose}>Fermer</button>
        <button type="button" className="btn primary" onClick={save}>Enregistrer</button>
      </div>
    </Sheet>
  );
}

export function DoneSheet({ session, onClose }: { session: SportSession; onClose: () => void }) {
  const data = useData();
  const prev = data.done[session.id];
  const existing = prev && !prev.deleted ? prev : undefined;
  const [status, setStatus] = useState<DoneStatus>(existing?.status ?? 'done');
  const [rpe, setRpe] = useState<number | undefined>(existing?.rpe);
  const [note, setNote] = useState(existing?.note ?? '');
  const options: { value: DoneStatus; label: string }[] = [{ value: 'done', label: 'Faite' }];
  if (session.quality) options.push({ value: 'swapped', label: "Remplacée par 40' EF" });
  options.push({ value: 'skipped', label: 'Pas faite' });
  const save = () => {
    setDone(session.id, status, { rpe: status === 'skipped' ? undefined : rpe, note: note.trim() || undefined });
    showToast(status === 'skipped' ? 'Séance notée comme non faite' : 'Séance enregistrée');
    onClose();
  };
  return (
    <Sheet title={session.title} onClose={onClose}>
      <Seg label="Statut" value={status} onChange={setStatus} options={options} />
      {status !== 'skipped' && (
        <div className="field">
          <span>Ressenti (RPE 1 = très facile · 10 = maximal)</span>
          <div className="rpe" role="group" aria-label="RPE">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" aria-pressed={rpe === n} onClick={() => setRpe(n)}>{n}</button>
            ))}
          </div>
        </div>
      )}
      <label className="field"><span>Commentaire</span>
        <textarea id="done-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allures réelles, sensations, douleurs…" />
      </label>
      <div className="sheet-actions">
        {existing && <button type="button" className="btn danger" onClick={() => { clearDone(session.id); onClose(); }}>Effacer</button>}
        <button type="button" className="btn primary" onClick={save}>Enregistrer</button>
      </div>
    </Sheet>
  );
}

export function TestSheet({ initialEvent, initialDate, onClose }: { initialEvent?: TestEvent; initialDate?: Ymd; onClose: () => void }) {
  const [event, setEvent] = useState<TestEvent>(initialEvent ?? 'pullups');
  const [date, setDate] = useState<Ymd>(initialDate ?? todayYmd());
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');
  const value = parsePerf(event, raw);
  const info = EVENTS[event];
  const hint = event === 'run3000' ? "ex. 12'40 ou 12:40" : event === 'swim50' ? 'ex. 32,1 (secondes)' : event === 'sprint50' ? 'ex. 7,08 (secondes)' : 'nombre de répétitions';
  const save = () => {
    if (value === null) return;
    addTest(event, date, value, note.trim() || undefined);
    showToast(`${info.short} : ${fmtPerf(event, value)} enregistré`);
    onClose();
  };
  return (
    <Sheet title="Saisir un résultat" onClose={onClose}>
      <Seg label="Épreuve" value={event} onChange={(e) => { setEvent(e); setRaw(''); }} options={EVENT_ORDER.map((e) => ({ value: e, label: EVENTS[e].short }))} />
      <div className="fields">
        <label className="field"><span>{info.unit === 'reps' ? 'Répétitions' : 'Temps'}</span>
          <input id="test-value" className="input num" inputMode={event === 'run3000' ? 'text' : 'decimal'} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={hint} autoFocus />
        </label>
        <label className="field"><span>Date</span>
          <input id="test-date" className="input num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <p className="small" aria-live="polite">
        {value === null
          ? <span className="faint">{raw ? 'Format non reconnu. ' + hint : 'La note /20 s’affiche dès la saisie.'}</span>
          : <span>Note au barème : <b className="num">{noteFor(event, value)}/20</b> pour {fmtPerf(event, value)}{info.unit === 'reps' ? ' rép.' : ''}</span>}
      </p>
      <label className="field"><span>Note</span>
        <input id="test-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Conditions, piste, bassin en yards…" />
      </label>
      <div className="sheet-actions">
        <button type="button" className="btn" onClick={onClose}>Annuler</button>
        <button type="button" className="btn primary" disabled={value === null} onClick={save}>Enregistrer</button>
      </div>
    </Sheet>
  );
}
