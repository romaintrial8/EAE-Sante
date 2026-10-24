// Format de sauvegarde .json. Toute restauration redonne exactement les mêmes données.
import { COLLS, emptyData, type AppData } from './types';

export const BACKUP_FORMAT = 'cocarde-backup/1';

export interface Backup { format: string; exportedAt: string; data: AppData }

export function makeBackup(data: AppData, now: string): Backup {
  return { format: BACKUP_FORMAT, exportedAt: now, data };
}

export function parseBackup(text: string): AppData {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { throw new Error('Ce fichier n’est pas un JSON lisible.'); }
  if (!obj || typeof obj !== 'object') throw new Error('Fichier vide ou illisible.');
  const b = obj as Partial<Backup>;
  if (b.format !== BACKUP_FORMAT) throw new Error('Ce fichier n’est pas une sauvegarde Cocarde.');
  if (!b.data || typeof b.data !== 'object') throw new Error('La sauvegarde ne contient pas de données.');
  const out = emptyData();
  for (const c of COLLS) {
    const src = (b.data as unknown as Record<string, unknown>)[c];
    if (src && typeof src === 'object') {
      for (const [id, rec] of Object.entries(src as Record<string, unknown>)) {
        if (rec && typeof rec === 'object' && (rec as { id?: unknown }).id === id) {
          (out[c] as Record<string, unknown>)[id] = rec;
        }
      }
    }
  }
  return out;
}
