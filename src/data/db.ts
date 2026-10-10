import Dexie, { type Table } from 'dexie';
import type { ChapterRead } from '../domain/bible';
import { DEFAULT_HABITS, type Entry, type Habit } from '../domain/habits';

export interface DayNote {
  date: string;
  text: string;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

/** Versão do formato dos dados. Sobe junto com cada db.version() novo. */
export const SCHEMA_VERSION = 2;

/** Itens que mudaram de id: id antigo para o item novo (com nome e texto novos). */
const RENAMED_HABITS: Record<string, string> = { workana: 'trabalhar' };

/**
 * Versão 2 (10/10/2026): o cronômetro "Workana" virou "Trabalhar", porque soma o tempo de todos os projetos.
 * Troca o item e move os registros do id antigo para o novo. Também roda depois de restaurar um backup antigo.
 */
export async function applyHabitRenames(habits: Table<Habit, string>, entries: Table<Entry, string>): Promise<void> {
  for (const [oldId, newId] of Object.entries(RENAMED_HABITS)) {
    const fresh = DEFAULT_HABITS.find((h) => h.id === newId);
    const old = await habits.get(oldId);
    if (old && fresh) {
      await habits.delete(oldId);
      await habits.put({ ...fresh, schedules: old.schedules, archivedFrom: old.archivedFrom });
    }
    const moved = await entries.where('habitId').equals(oldId).toArray();
    for (const e of moved) {
      await entries.delete(e.id);
      await entries.put({ ...e, id: `${e.date}|${newId}`, habitId: newId });
    }
  }
}

/**
 * Banco local (IndexedDB) do aparelho.
 * Regra para crescer: nunca alterar uma versão já publicada. Mudança de estrutura entra
 * como db.version(N+1) com .upgrade() que converte os dados antigos.
 */
export class DegrauDB extends Dexie {
  habits!: Table<Habit, string>;
  entries!: Table<Entry, string>;
  bibleReads!: Table<ChapterRead, string>;
  notes!: Table<DayNote, string>;
  settings!: Table<Setting, string>;

  constructor(name = 'degrau') {
    super(name);
    this.version(1).stores({
      habits: 'id, area, order',
      entries: 'id, date, habitId',
      bibleReads: 'id, date',
      notes: 'date',
      settings: 'key'
    });
    this.version(2)
      .stores({})
      .upgrade((tx) => applyHabitRenames(tx.table('habits'), tx.table('entries')));
    this.on('populate', (tx) => {
      tx.table('habits').bulkAdd(DEFAULT_HABITS);
    });
  }
}

export const db = new DegrauDB();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key);
  return s === undefined ? fallback : (s.value as T);
}

export function setSetting(key: string, value: unknown): Promise<string> {
  return db.settings.put({ key, value });
}

/** Pede ao navegador para não apagar os dados quando faltar espaço. Resultado só informativo. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
