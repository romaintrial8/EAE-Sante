import type { ReactNode } from 'react';
import { todayYmd } from './domain/dates';
import { useSync } from './data/sync';
import { ConcoursScreen } from './screens/Concours';
import { DayView } from './screens/Day';
import { HealthScreen } from './screens/Health';
import { PlanScreen } from './screens/Plan';
import { SettingsScreen } from './screens/Settings';
import { PerfsScreen } from './screens/Perfs';
import { IconConcours, IconGear, IconHealth, IconPlan, IconTests, IconToday, Roundel } from './ui/icons';
import { Toaster } from './ui/kit';
import { href, useRoute, type Route } from './ui/router';

const TABS: { name: Route['name']; label: string; icon: () => ReactNode; to: Route }[] = [
  { name: 'today', label: 'Aujourd’hui', icon: IconToday, to: { name: 'today' } },
  { name: 'plan', label: 'Plan', icon: IconPlan, to: { name: 'plan' } },
  { name: 'health', label: 'Santé', icon: IconHealth, to: { name: 'health' } },
  { name: 'tests', label: 'Perfs', icon: IconTests, to: { name: 'tests' } },
  { name: 'concours', label: 'Concours', icon: IconConcours, to: { name: 'concours' } },
];

const TITLES: Record<Route['name'], string> = {
  today: 'Aujourd’hui', day: 'Journée', plan: 'Plan', health: 'Santé', tests: 'Perfs', concours: 'Concours', settings: 'Réglages',
};

function current(r: Route): Route['name'] {
  return r.name === 'day' ? (r.date === todayYmd() ? 'today' : 'plan') : r.name;
}

export function App() {
  const route = useRoute();
  const sync = useSync();
  const active = current(route);
  let screen: ReactNode;
  switch (route.name) {
    case 'today': screen = <DayView date={todayYmd()} />; break;
    case 'day': screen = <DayView date={route.date} />; break;
    case 'plan': screen = <PlanScreen week={route.week} />; break;
    case 'health': screen = <HealthScreen />; break;
    case 'tests': screen = <PerfsScreen />; break;
    case 'concours': screen = <ConcoursScreen />; break;
    case 'settings': screen = <SettingsScreen />; break;
  }
  return (
    <div className="shell">
      <nav className="side" aria-label="Navigation">
        <div className="wordmark"><Roundel size={22} />Cocarde</div>
        {TABS.map((t) => (
          <a key={t.name} href={href(t.to)} aria-current={active === t.name ? 'page' : undefined}><t.icon />{t.label}</a>
        ))}
        <div className="side-foot">
          <a href={href({ name: 'settings' })} aria-current={active === 'settings' ? 'page' : undefined}><IconGear />Réglages</a>
        </div>
      </nav>
      <div>
        <header className="topbar">
          <div className="topbar-in">
            <span className="wordmark"><Roundel size={20} /></span>
            <h1>{TITLES[route.name]}</h1>
            {sync.running && <span className="caption">Synchro…</span>}
            <a className="iconbtn" href={href({ name: 'settings' })} aria-label="Réglages"><IconGear /></a>
          </div>
        </header>
        <main className="main">{screen}</main>
      </div>
      <nav className="tabbar" aria-label="Onglets">
        {TABS.map((t) => (
          <a key={t.name} className="tab" href={href(t.to)} aria-current={active === t.name ? 'page' : undefined}><t.icon /><span>{t.label}</span></a>
        ))}
      </nav>
      <Toaster />
    </div>
  );
}
