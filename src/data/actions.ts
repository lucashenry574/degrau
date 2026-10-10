import { chapterKey } from '../domain/bible';
import { entryId, type Entry } from '../domain/habits';
import { db } from './db';

/**
 * Todas as escritas do app passam por aqui. Cada ação lê o registro atual, aplica a mudança
 * e grava dentro de uma transação, para que dois toques rápidos não se atropelem.
 */
async function updateEntry(date: string, habitId: string, change: (e: Entry) => void): Promise<void> {
  await db.transaction('rw', db.entries, async () => {
    const id = entryId(date, habitId);
    const current = (await db.entries.get(id)) ?? { id, date, habitId, updatedAt: 0 };
    const next: Entry = structuredClone(current);
    change(next);
    next.updatedAt = Date.now();
    await db.entries.put(next);
  });
}

export function toggleDone(date: string, habitId: string) {
  return updateEntry(date, habitId, (e) => {
    if (e.status === 'done') delete e.status;
    else e.status = 'done';
  });
}

export function toggleExcused(date: string, habitId: string) {
  return updateEntry(date, habitId, (e) => {
    if (e.status === 'excused') delete e.status;
    else e.status = 'excused';
  });
}

/** Comentários da reunião. Comentar implica presença. */
export function changeCount(date: string, habitId: string, delta: number) {
  return updateEntry(date, habitId, (e) => {
    e.count = Math.max(0, (e.count ?? 0) + delta);
    if (e.count > 0 && !e.status) e.status = 'done';
  });
}

/** Minutos registrados (pregação). Lançar o primeiro tempo marca a presença. */
export function changeMinutes(date: string, habitId: string, delta: number, markDone = true) {
  return updateEntry(date, habitId, (e) => {
    const before = e.minutes ?? 0;
    e.minutes = Math.min(24 * 60, Math.max(0, before + delta));
    if (markDone && before === 0 && e.minutes > 0 && !e.status) e.status = 'done';
  });
}

export function timerStart(date: string, habitId: string) {
  return updateEntry(date, habitId, (e) => {
    if (!e.timerStart) e.timerStart = Date.now();
  });
}

export function timerPause(date: string, habitId: string) {
  return updateEntry(date, habitId, (e) => {
    if (e.timerStart) {
      e.timerMs = (e.timerMs ?? 0) + Math.max(0, Date.now() - e.timerStart);
      e.timerStart = null;
    }
  });
}

/** Ajuste manual do cronômetro (esqueceu de iniciar ou de pausar). */
export function timerAdjust(date: string, habitId: string, deltaMinutes: number) {
  return updateEntry(date, habitId, (e) => {
    e.timerMs = Math.max(0, (e.timerMs ?? 0) + deltaMinutes * 60_000);
  });
}

/** Marca um capítulo como lido no dia e atualiza o mapa de capítulos lidos. */
export async function markChapter(book: number, chapter: number, date: string, habitId = 'leitura-biblia') {
  await db.transaction('rw', db.entries, db.bibleReads, async () => {
    await updateEntry(date, habitId, (e) => {
      const list = e.chapters ?? [];
      if (!list.some(([b, c]) => b === book && c === chapter)) list.push([book, chapter]);
      e.chapters = list;
    });
    await db.bibleReads.put({ id: chapterKey(book, chapter), book, chapter, date });
  });
}

/**
 * Tira o capítulo do dia informado. O mapa de capítulos lidos passa a apontar para a leitura
 * anterior desse capítulo, se houver; sem nenhuma, ele volta a constar como não lido.
 */
export async function unmarkChapter(book: number, chapter: number, date: string, habitId = 'leitura-biblia') {
  await db.transaction('rw', db.entries, db.bibleReads, async () => {
    await updateEntry(date, habitId, (e) => {
      e.chapters = (e.chapters ?? []).filter(([b, c]) => !(b === book && c === chapter));
    });
    const id = chapterKey(book, chapter);
    const others = await db.entries
      .where('habitId').equals(habitId)
      .filter((e) => (e.chapters ?? []).some(([b, c]) => b === book && c === chapter))
      .toArray();
    const latest = others.reduce<string | null>((acc, e) => (!acc || e.date > acc ? e.date : acc), null);
    if (latest) await db.bibleReads.put({ id, book, chapter, date: latest });
    else await db.bibleReads.delete(id);
  });
}

export function saveNote(date: string, text: string) {
  const clean = text.trim();
  return clean ? db.notes.put({ date, text: clean, updatedAt: Date.now() }) : db.notes.delete(date);
}
