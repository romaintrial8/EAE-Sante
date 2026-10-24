// Store en mémoire : une seule source de vérité, un seul chemin d'écriture (commit).
import { useSyncExternalStore } from 'react';
import { emptyData, type AppData, type Coll, type Rec } from '../domain/types';
import { writeMany } from './idb';

let data: AppData = emptyData();
const listeners = new Set<() => void>();

export function getData(): AppData {
  return data;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData, getData);
}

export function replaceAll(next: AppData): void {
  data = next;
  listeners.forEach((l) => l());
}

export interface Tx {
  put<C extends Coll>(coll: C, rec: Omit<AppData[C][string], 'updatedAt'> & { updatedAt?: string }): void;
  remove(coll: Coll, id: string): void;
}

/**
 * Lot atomique d'écritures. 'local' horodate maintenant ; 'import' garde l'horodatage fourni.
 * Une suppression écrit une pierre tombale { id, updatedAt, deleted: true } pour une future synchronisation.
 */
export function commit(fn: (tx: Tx) => void, origin: 'local' | 'import' = 'local'): void {
  const now = new Date().toISOString();
  const next: AppData = { ...data };
  const touched = new Set<Coll>();
  const writes: { coll: Coll; rec: Rec }[] = [];
  const tx: Tx = {
    put(coll, rec) {
      if (!touched.has(coll)) { (next as Record<Coll, unknown>)[coll] = { ...data[coll] }; touched.add(coll); }
      const full = { ...rec, updatedAt: origin === 'local' || !rec.updatedAt ? now : rec.updatedAt } as Rec;
      (next[coll] as Record<string, Rec>)[full.id] = full;
      writes.push({ coll, rec: full });
    },
    remove(coll, id) {
      if (!touched.has(coll)) { (next as Record<Coll, unknown>)[coll] = { ...data[coll] }; touched.add(coll); }
      const tomb: Rec = { id, updatedAt: now, deleted: true };
      (next[coll] as Record<string, Rec>)[id] = tomb;
      writes.push({ coll, rec: tomb });
    },
  };
  fn(tx);
  if (!writes.length) return;
  data = next;
  listeners.forEach((l) => l());
  void writeMany(writes);
}
