import { addDays, eachDay, mondayOf, weekday, type ISODate } from './dates';
import { entryId, START_DATE, STRONG_WEEK, type AreaId, type Entry, type Habit } from './habits';

export type EntryMap = ReadonlyMap<string, Entry>;

export interface Score {
  done: number;
  possible: number;
}

const ZERO: Score = { done: 0, possible: 0 };

export function addScore(a: Score, b: Score): Score {
  return { done: a.done + b.done, possible: a.possible + b.possible };
}

export function ratio(s: Score): number | null {
  return s.possible > 0 ? s.done / s.possible : null;
}

/** O item vale neste dia? Considera a data de início do plano, a regra de dias vigente e o arquivamento. */
export function isScheduled(h: Habit, date: ISODate): boolean {
  if (date < START_DATE) return false;
  if (h.archivedFrom && date >= h.archivedFrom) return false;
  let current: Habit['schedules'][number] | undefined;
  for (const s of h.schedules) {
    if (s.from <= date && (!current || s.from > current.from)) current = s;
  }
  return !!current && current.days.includes(weekday(date));
}

/** Pontos que o item vale quando não está justificado. */
export function maxPoints(h: Habit): number {
  return h.kind === 'meeting' ? 2 : 1;
}

/** Minutos do cronômetro, incluindo o trecho em andamento. */
export function timerMinutes(e: Entry | undefined, now: number = Date.now()): number {
  if (!e) return 0;
  const running = e.timerStart ? Math.max(0, now - e.timerStart) : 0;
  return Math.floor(((e.timerMs ?? 0) + running) / 60_000);
}

/** Pontuação de um item em um dia, já sabendo que ele vale nesse dia. */
export function entryScore(h: Habit, e: Entry | undefined, now: number = Date.now()): Score {
  if (e?.status === 'excused') return ZERO;
  switch (h.kind) {
    case 'check':
    case 'service':
    case 'dailyText':
      return { done: e?.status === 'done' ? 1 : 0, possible: 1 };
    case 'bible':
      return { done: (e?.chapters?.length ?? 0) > 0 ? 1 : 0, possible: 1 };
    case 'meeting': {
      const presence = e?.status === 'done' ? 1 : 0;
      const comment = (e?.count ?? 0) >= 1 ? 1 : 0;
      return { done: presence + comment, possible: 2 };
    }
    case 'timer':
      return { done: timerMinutes(e, now) >= (h.targetMinutes ?? 0) ? 1 : 0, possible: 1 };
  }
}

export function habitDayScore(h: Habit, entries: EntryMap, date: ISODate, now?: number): Score {
  if (!isScheduled(h, date)) return ZERO;
  return entryScore(h, entries.get(entryId(date, h.id)), now);
}

export function dayScore(habits: Habit[], entries: EntryMap, date: ISODate, area?: AreaId, now?: number): Score {
  let s = ZERO;
  for (const h of habits) {
    if (area && h.area !== area) continue;
    s = addScore(s, habitDayScore(h, entries, date, now));
  }
  return s;
}

export function rangeScore(habits: Habit[], entries: EntryMap, from: ISODate, to: ISODate, area?: AreaId, now?: number): Score {
  let s = ZERO;
  for (const d of eachDay(from, to)) s = addScore(s, dayScore(habits, entries, d, area, now));
  return s;
}

export function weekScore(habits: Habit[], entries: EntryMap, anyDayOfWeek: ISODate, area?: AreaId, now?: number): Score {
  const mon = mondayOf(anyDayOfWeek);
  return rangeScore(habits, entries, mon, addDays(mon, 6), area, now);
}

export function isStrong(s: Score): boolean {
  const r = ratio(s);
  return r !== null && r >= STRONG_WEEK;
}

/** Número da semana do plano (1 = semana que começa em START_DATE). */
export function planWeek(date: ISODate): number {
  return Math.floor((Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) -
    Date.UTC(+START_DATE.slice(0, 4), +START_DATE.slice(5, 7) - 1, +START_DATE.slice(8, 10))) / (7 * 86_400_000)) + 1;
}

export interface Streak {
  current: number;
  best: number;
}

/**
 * Sequência de semanas fortes. A semana em andamento soma se já estiver forte
 * e não quebra a sequência enquanto não terminar.
 */
export function strongWeekStreak(habits: Habit[], entries: EntryMap, today: ISODate, area?: AreaId, now?: number): Streak {
  let current = 0;
  let best = 0;
  const thisMonday = mondayOf(today);
  for (let mon = START_DATE; mon <= thisMonday; mon = addDays(mon, 7)) {
    const s = weekScore(habits, entries, mon, area, now);
    if (s.possible === 0) continue;
    if (isStrong(s)) {
      current++;
      best = Math.max(best, current);
    } else if (mon < thisMonday) {
      current = 0;
    }
  }
  return { current, best };
}

/**
 * Sequência de dias em que o item foi feito, contando só os dias em que ele vale.
 * Justificado não quebra nem soma. Hoje ainda em aberto não quebra.
 */
export function habitStreak(h: Habit, entries: EntryMap, today: ISODate, now?: number): Streak {
  let current = 0;
  let best = 0;
  for (let d = START_DATE; d <= today; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    const s = entryScore(h, entries.get(entryId(d, h.id)), now);
    if (s.possible === 0) continue;
    if (s.done === s.possible) {
      current++;
      best = Math.max(best, current);
    } else if (d < today) {
      current = 0;
    }
  }
  return { current, best };
}
