import { createRoot } from 'react-dom/client';
import { App } from './App';
import { askPersist, loadAll } from './data/idb';
import { replaceAll } from './data/store';
import { seedOnce } from './data/actions';
import { startAutoSync } from './data/sync';
import { applyTheme, getTheme } from './data/prefs';

async function boot() {
  applyTheme(getTheme());
  replaceAll(await loadAll());
  seedOnce();
  const el = document.getElementById('app');
  if (!el) return;
  createRoot(el).render(<App />);
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
  startAutoSync();
  void askPersist();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* hors ligne indisponible */ });
  }
}

void boot();
