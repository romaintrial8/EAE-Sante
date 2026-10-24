// Copie locale des données (IndexedDB). Une clé par enregistrement : « collection/id ».
import { COLLS, emptyData, type AppData, type Coll, type Rec } from '../domain/types';

const DB_NAME = 'cocarde';
const STORE = 'records';

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

export async function loadAll(): Promise<AppData> {
  const data = emptyData();
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve();
        const key = String(c.key);
        const slash = key.indexOf('/');
        const coll = key.slice(0, slash) as Coll;
        if (COLLS.includes(coll)) (data[coll] as Record<string, Rec>)[key.slice(slash + 1)] = c.value as Rec;
        c.continue();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[cocarde] IndexedDB indisponible', e);
  }
  return data;
}

export async function writeMany(items: { coll: Coll; rec: Rec }[]): Promise<void> {
  if (!items.length) return;
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      for (const { coll, rec } of items) st.put(rec, `${coll}/${rec.id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[cocarde] écriture IndexedDB impossible', e);
  }
}

export async function clearAll(): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Demande au navigateur de ne pas effacer les données (important sur iPhone). */
export async function askPersist(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* rien */ }
  return false;
}
