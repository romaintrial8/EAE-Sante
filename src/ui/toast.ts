import { useSyncExternalStore } from 'react';

export interface Toast { id: number; text: string; undo?: () => void }

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(text: string, undo?: () => void): void {
  current = { id: Date.now(), text, undo };
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => { current = null; emit(); }, undo ? 6000 : 3000);
}

export function dismissToast(): void {
  current = null;
  clearTimeout(timer);
  emit();
}

export function useToast(): Toast | null {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => current, () => current);
}
