import { makeBackup, parseBackup } from '../domain/backup';
import { COLLS, type Coll, type Rec } from '../domain/types';
import { todayYmd } from '../domain/dates';
import { clearAll, writeMany } from './idb';
import { getData, replaceAll } from './store';

export function exportBackup(): void {
  const json = JSON.stringify(makeBackup(getData(), new Date().toISOString()), null, 1);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cocarde-sauvegarde-${todayYmd()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function importBackup(file: File): Promise<number> {
  const data = parseBackup(await file.text());
  await clearAll();
  const items: { coll: Coll; rec: Rec }[] = [];
  for (const c of COLLS) for (const rec of Object.values(data[c] as Record<string, Rec>)) items.push({ coll: c, rec });
  await writeMany(items);
  replaceAll(data);
  return items.length;
}

export async function wipeAll(): Promise<void> {
  await clearAll();
  const empty = { wellness: {}, checkin: {}, activity: {}, tests: {}, done: {}, deadlines: {} };
  replaceAll(empty);
}
