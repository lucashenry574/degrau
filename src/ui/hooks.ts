import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { todayISO } from '../domain/dates';
import type { Entry, Habit } from '../domain/habits';
import type { EntryMap } from '../domain/scoring';

/**
 * Só no modo de desenvolvimento: localStorage 'degrau-hoje' = 'AAAA-MM-DD' simula outra data,
 * para testar telas antes do início do plano. Não existe no app publicado.
 */
function currentDay(): string {
  if (import.meta.env.DEV) {
    const fake = localStorage.getItem('degrau-hoje');
    if (fake && /^\d{4}-\d{2}-\d{2}$/.test(fake)) return fake;
  }
  return todayISO();
}

/** Data de hoje que vira sozinha à meia-noite e ao voltar para o app. */
export function useToday(): string {
  const [today, setToday] = useState(currentDay());
  useEffect(() => {
    const check = () => setToday(currentDay());
    const id = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

/** Relógio para o cronômetro; só faz tique quando há cronômetro rodando. */
export function useNow(enabled: boolean, everyMs = 1_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [enabled, everyMs]);
  return now;
}

export function useHabits(): Habit[] | undefined {
  return useLiveQuery(() => db.habits.orderBy('order').toArray(), []);
}

function toMap(list: Entry[] | undefined): EntryMap | undefined {
  if (!list) return undefined;
  return new Map(list.map((e) => [e.id, e]));
}

/** Registros entre duas datas (inclusive), como mapa por id. */
export function useEntries(from: string, to: string): EntryMap | undefined {
  const list = useLiveQuery(() => db.entries.where('date').between(from, to, true, true).toArray(), [from, to]);
  return useMemo(() => toMap(list), [list]);
}

export function useAllEntries(): EntryMap | undefined {
  const list = useLiveQuery(() => db.entries.toArray(), []);
  return useMemo(() => toMap(list), [list]);
}

export function useBibleReads() {
  return useLiveQuery(() => db.bibleReads.toArray(), []);
}

export function useNote(date: string) {
  return useLiveQuery(() => db.notes.get(date), [date]);
}

export function useSetting<T>(key: string, fallback: T): T {
  const s = useLiveQuery(() => db.settings.get(key), [key]);
  return s === undefined ? fallback : (s.value as T);
}
