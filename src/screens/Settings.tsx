import { useRef, useState } from 'react';
import { ago, fmtShort, todayYmd } from '../domain/dates';
import { diagnose, latestNight } from '../domain/syncstate';
import { live } from '../domain/types';
import { exportBackup, importBackup, wipeAll } from '../data/backup-io';
import { getIcuConfig, getTheme, setIcuConfig, setSyncMeta, setTheme, type ThemePref } from '../data/prefs';
import { useData } from '../data/store';
import { refreshMeta, syncIntervals, useSync } from '../data/sync';
import { IconSync } from '../ui/icons';
import { Card, Seg } from '../ui/kit';
import { showToast } from '../ui/toast';

const FIELD_LABEL: Record<string, string> = {
  sleepScore: 'score de sommeil', sleepSecs: 'durée de sommeil', hrv: 'VFC', restingHR: 'FC de repos', avgSleepingHR: 'FC nocturne',
  weight: 'poids', readiness: 'disponibilité', spO2: 'SpO2', steps: 'pas', respiration: 'respiration', bodyBattery: 'Body Battery',
};

function IntervalsCard() {
  const sync = useSync();
  const data = useData();
  const cfg = getIcuConfig();
  const [athlete, setAthlete] = useState(cfg?.athleteId ?? '0');
  const [key, setKey] = useState(cfg?.apiKey ?? '');
  const [editing, setEditing] = useState(!cfg);
  const save = async () => {
    const c = { athleteId: athlete.trim() || '0', apiKey: key.trim() };
    if (!c.apiKey) return;
    const r = await syncIntervals({ force: true, full: true, cfg: c });
    if (r.ok) {
      setIcuConfig(c);
      setEditing(false);
      showToast(`Connecté : ${r.wellness ?? 0} jours de santé et ${r.activities ?? 0} activités importés`);
    }
    refreshMeta();
  };
  const m = sync.meta;
  return (
    <Card title="Garmin via Intervals.icu" aside={cfg ? <span className="pill ok">Connecté</span> : <span className="pill">Non connecté</span>}>
      <div className="stack">
        {editing ? (
          <>
            <p className="small muted">Dans Intervals.icu : <b>Settings</b>, tout en bas <b>Developer Settings</b>. Copie la clé API. La clé reste sur cet appareil : elle n’est envoyée qu’à Intervals.icu.</p>
            <div className="fields">
              <label className="field"><span>Clé API</span>
                <input id="icu-key" className="input" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="colle ta clé ici" />
              </label>
              <label className="field"><span>Identifiant athlète</span>
                <input id="icu-athlete" className="input" value={athlete} onChange={(e) => setAthlete(e.target.value)} placeholder="0" />
              </label>
            </div>
            <p className="caption">« 0 » désigne le propriétaire de la clé : laisse-le sauf si une erreur te demande ton identifiant (il commence par « i »).</p>
            <div className="row-wrap">
              <button type="button" className="btn primary" disabled={!key.trim() || sync.running} onClick={() => void save()}><IconSync />{sync.running ? 'Connexion…' : 'Connecter et importer'}</button>
              {cfg && <button type="button" className="btn" onClick={() => setEditing(false)}>Annuler</button>}
            </div>
          </>
        ) : (
          <div className="row-wrap">
            <button type="button" className="btn primary" disabled={sync.running} onClick={() => void syncIntervals({ force: true })}><IconSync />{sync.running ? 'Synchronisation…' : 'Synchroniser maintenant'}</button>
            <button type="button" className="btn" disabled={sync.running} onClick={() => void syncIntervals({ force: true, full: true })}>Réimporter depuis le 01/09</button>
            <button type="button" className="btn" onClick={() => setEditing(true)}>Changer la clé</button>
            <button type="button" className="btn danger" onClick={() => { setIcuConfig(null); setSyncMeta({}); refreshMeta(); setEditing(true); setKey(''); }}>Déconnecter</button>
          </div>
        )}
        {cfg && (() => {
          const d = diagnose(m, data, true, todayYmd());
          return d.level === 'ok' ? null : <div className={`banner ${d.level === 'error' ? 'alert' : 'unknown'}`}><div className="banner-body"><strong>{d.side === 'garmin' ? 'Côté Garmin → Intervals.icu' : d.side === 'app' ? 'Côté app → Intervals.icu' : 'État'}</strong><span className="small">{d.text}</span></div></div>;
        })()}
        <dl className="diag">
          <dt>Dernière nuit reçue</dt><dd>{latestNight(data) ? fmtShort(latestNight(data) as string) : '—'}</dd>
          <dt>Dernière synchro</dt><dd>{m.lastOkAt ? `${ago(m.lastOkAt)} (${new Date(m.lastOkAt).toLocaleString('fr-FR')})` : 'jamais'}</dd>
          <dt>Période relue</dt><dd>{m.range ?? '—'}</dd>
          <dt>Dernier lot</dt><dd>{m.wellnessDays !== undefined ? `${m.wellnessDays} jours de santé, ${m.activities ?? 0} activités` : '—'}</dd>
          <dt>Données reçues</dt><dd>{m.fields?.length ? m.fields.map((f) => FIELD_LABEL[f] ?? f).join(', ') : '—'}</dd>
          <dt>Fréquence</dt><dd>à l’ouverture de l’app, au plus toutes les 3 h ; relit les 7 derniers jours</dd>
        </dl>
        {m.fields && !m.fields.includes('bodyBattery') && <p className="caption">Body Battery n’est pas reçu : saisis-le le matin dans le check-in (le garde-fou en a besoin).</p>}
      </div>
    </Card>
  );
}

function DataCard() {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(0);
  const counts = `${live(data.done).length} éléments cochés · ${live(data.tests).length} résultats de tests · ${live(data.wellness).length} jours de santé · ${live(data.activity).length} activités`;
  return (
    <Card title="Tes données">
      <div className="stack">
        <p className="small muted">{counts}. Tout est stocké sur cet appareil. Les données Garmin se réimportent à tout moment ; tes coches, tests et check-ins, non : exporte une sauvegarde chaque dimanche au bilan.</p>
        <div className="row-wrap">
          <button type="button" className="btn primary" onClick={exportBackup}>Exporter la sauvegarde (.json)</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Restaurer…</button>
          <input ref={fileRef} id="restore" type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try { const n = await importBackup(f); showToast(`Sauvegarde restaurée (${n} enregistrements)`); }
            catch (err) { showToast((err as Error).message); }
            e.target.value = '';
          }} />
        </div>
        <p className="caption">Pour ton bilan du dimanche avec Claude : joins ce fichier .json à la conversation.</p>
        <div className="row-wrap">
          {confirmWipe === 0 && <button type="button" className="btn danger small" onClick={() => setConfirmWipe(1)}>Tout effacer…</button>}
          {confirmWipe === 1 && <><span className="small">As-tu exporté une sauvegarde ?</span><button type="button" className="btn small" onClick={() => setConfirmWipe(0)}>Non, annuler</button><button type="button" className="btn danger small" onClick={() => setConfirmWipe(2)}>Oui, continuer</button></>}
          {confirmWipe === 2 && <><span className="small">Effacer définitivement toutes les données de cet appareil ?</span><button type="button" className="btn small" onClick={() => setConfirmWipe(0)}>Annuler</button><button type="button" className="btn danger small" onClick={() => { void wipeAll().then(() => { setConfirmWipe(0); showToast('Données effacées'); }); }}>Effacer</button></>}
        </div>
      </div>
    </Card>
  );
}

function ThemeCard() {
  const [t, setT] = useState<ThemePref>(getTheme());
  return (
    <Card title="Affichage">
      <Seg label="Thème" value={t} onChange={(v) => { setT(v); setTheme(v); }} options={[{ value: 'system', label: 'Comme le téléphone' }, { value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' }]} />
    </Card>
  );
}

function GarminFix() {
  return (
    <Card title="Garmin ne transmet plus ?" className="help">
      <div className="stack">
        <p>Si l’app joint Intervals.icu mais que la dernière nuit reçue date de plusieurs jours, la liaison Garmin → Intervals.icu est coupée. Dans l’ordre :</p>
        <ol>
          <li>Sur <b>intervals.icu</b> (le site), ouvre ton calendrier : si les derniers jours n’y ont pas de sommeil ni de VFC, le problème est bien là.</li>
          <li>Dans <b>Settings</b>, section <b>Garmin</b> : vérifie que la connexion est active et que les champs <b>Wellness</b> sont cochés.</li>
          <li>Si c’est déjà le cas : <b>déconnecte puis reconnecte Garmin</b>, et sur l’écran Garmin, <b>accepte toutes les autorisations</b>, y compris les données de santé quotidiennes.</li>
          <li>Dans l’app <b>Garmin Connect</b>, synchronise la montre, attends 5 minutes.</li>
          <li>Reviens ici et touche <b>Réimporter depuis le 01/09</b>.</li>
        </ol>
      </div>
    </Card>
  );
}

function Help() {
  return (
    <Card title="Aide" className="help">
      <div className="stack">
        <h3>Installer l’app sur ton iPhone</h3>
        <ol>
          <li>Ouvre l’adresse de l’app dans <b>Safari</b>.</li>
          <li>Touche <b>Partager</b> (carré avec une flèche), puis <b>Sur l’écran d’accueil</b>.</li>
          <li>Ouvre Cocarde depuis l’icône : elle marche hors ligne et garde tes données.</li>
        </ol>
        <h3>D’où viennent les chiffres santé</h3>
        <p>Montre → Garmin Connect (synchro Bluetooth du téléphone) → Intervals.icu (automatique, dans le cloud) → Cocarde (à l’ouverture). Si une valeur manque le matin, ouvre Garmin Connect pour forcer la synchro de la montre, attends une minute, puis touche « Synchroniser ».</p>
        <h3>Si la synchronisation échoue</h3>
        <ul>
          <li>« Clé API refusée » : recopie la clé depuis Intervals.icu › Settings › Developer Settings.</li>
          <li>« Injoignable » : vérifie le réseau. Si le réseau marche, le navigateur bloque l’appel ; écris-le à Claude avec le texte exact de l’erreur.</li>
          <li>Rien de reçu : dans Intervals.icu › Settings › Garmin, vérifie que les champs « Wellness » sont cochés.</li>
        </ul>
        <h3>Le garde-fou</h3>
        <p>Il s’applique aux séances qualité (VIT, SEU, tests). Déclenché si Body Battery &lt; 40 au réveil, ou si ta VFC est sous ta zone habituelle deux nuits de suite. Il te propose alors 40' EF à la place.</p>
        <h3>Le plan</h3>
        <p>Les séances et les blocs concours sont ceux de ta passation v2 du 04/10/2026, sans modification. Les allures sont valables jusqu’au test S7 : envoie tes nouvelles allures après S7 et S15 pour mettre à jour les semaines suivantes.</p>
      </div>
    </Card>
  );
}

export function SettingsScreen() {
  return (
    <div className="stack-16">
      <div className="cols">
        <div className="stack-16"><IntervalsCard /><GarminFix /><ThemeCard /></div>
        <div className="stack-16"><DataCard /><Help /></div>
      </div>
    </div>
  );
}
