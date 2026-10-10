import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, formatLong, mondayOf, todayISO, weekday } from './dates';
import { BOOKS, dailyTextUrl, nextChapter, suggestNext, TOTAL_CHAPTERS } from './bible';
import { DEFAULT_HABITS, entryId, type Entry, type Habit } from './habits';
import { dayScore, entryScore, habitStreak, isScheduled, planWeek, strongWeekStreak, timerMinutes, weekScore } from './scoring';

const H = (id: string) => DEFAULT_HABITS.find((h) => h.id === id)!;

function map(entries: Partial<Entry>[]): Map<string, Entry> {
  const m = new Map<string, Entry>();
  for (const e of entries) {
    const full = { updatedAt: 0, ...e, id: entryId(e.date!, e.habitId!) } as Entry;
    m.set(full.id, full);
  }
  return m;
}

describe('datas', () => {
  it('12/10/2026 é segunda-feira e a semana vai até domingo', () => {
    expect(weekday('2026-10-12')).toBe(0);
    expect(weekday('2026-10-18')).toBe(6);
    expect(mondayOf('2026-10-18')).toBe('2026-10-12');
    expect(mondayOf('2026-10-10')).toBe('2026-10-05');
  });
  it('soma dias atravessando mês e ano', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-10-12', '2029-10-08')).toBe(1092);
  });
  it('formata em português', () => {
    expect(formatLong('2026-10-14')).toBe('Quarta-feira, 14 de outubro');
  });
  it('usa a data local do aparelho', () => {
    expect(todayISO(new Date(2026, 9, 10, 23, 59))).toBe('2026-10-10');
  });
});

describe('Bíblia', () => {
  it('tem 66 livros e 1.189 capítulos', () => {
    expect(BOOKS.length).toBe(66);
    expect(BOOKS.reduce((a, b) => a + b[1], 0)).toBe(TOTAL_CHAPTERS);
  });
  it('avança de livro e volta ao início depois de Apocalipse', () => {
    expect(nextChapter(1, 50)).toEqual([2, 1]);
    expect(nextChapter(66, 22)).toEqual([1, 1]);
  });
  it('sugere o capítulo seguinte ao último lido', () => {
    expect(suggestNext([])).toEqual([1, 1]);
    expect(suggestNext([
      { id: '43:3', book: 43, chapter: 3, date: '2026-10-13' },
      { id: '43:2', book: 43, chapter: 2, date: '2026-10-12' }
    ])).toEqual([43, 4]);
  });
  it('monta o link do texto do dia sem zero à esquerda', () => {
    expect(dailyTextUrl('2026-11-03')).toBe('https://wol.jw.org/pt/wol/h/r5/lp-t/2026/11/3');
  });
});

describe('agenda dos itens', () => {
  it('nada vale antes de 12/10/2026', () => {
    expect(isScheduled(H('texto-do-dia'), '2026-10-11')).toBe(false);
    expect(isScheduled(H('texto-do-dia'), '2026-10-12')).toBe(true);
  });
  it('reunião só na quarta, pilates em seg/qua/sex', () => {
    expect(isScheduled(H('reuniao-quarta'), '2026-10-14')).toBe(true);
    expect(isScheduled(H('reuniao-quarta'), '2026-10-15')).toBe(false);
    expect(isScheduled(H('pilates'), '2026-10-13')).toBe(false);
    expect(isScheduled(H('pilates'), '2026-10-16')).toBe(true);
  });
  it('mudança de dias vale só dali para frente', () => {
    const h: Habit = { ...H('pilates'), schedules: [{ from: '2026-10-12', days: [0] }, { from: '2026-11-01', days: [1] }] };
    expect(isScheduled(h, '2026-10-19')).toBe(true);
    expect(isScheduled(h, '2026-11-02')).toBe(false);
    expect(isScheduled(h, '2026-11-03')).toBe(true);
  });
});

describe('pontuação', () => {
  it('a semana cheia vale 23 pontos espirituais, 8 de saúde e 5 de trabalho', () => {
    const empty = new Map();
    expect(weekScore(DEFAULT_HABITS, empty, '2026-10-14', 'espiritual').possible).toBe(23);
    expect(weekScore(DEFAULT_HABITS, empty, '2026-10-14', 'saude').possible).toBe(8);
    expect(weekScore(DEFAULT_HABITS, empty, '2026-10-14', 'trabalho').possible).toBe(5);
  });
  it('reunião: presença e comentário valem 1 ponto cada; justificada sai da conta', () => {
    const h = H('reuniao-quarta');
    expect(entryScore(h, { id: '', date: '', habitId: '', status: 'done', updatedAt: 0 })).toEqual({ done: 1, possible: 2 });
    expect(entryScore(h, { id: '', date: '', habitId: '', status: 'done', count: 2, updatedAt: 0 })).toEqual({ done: 2, possible: 2 });
    expect(entryScore(h, { id: '', date: '', habitId: '', status: 'excused', updatedAt: 0 })).toEqual({ done: 0, possible: 0 });
  });
  it('cronômetro conta o trecho em andamento e cumpre a meta com 360 minutos', () => {
    const now = 10_000_000;
    const e: Entry = { id: '', date: '', habitId: 'trabalhar', timerMs: 350 * 60_000, timerStart: now - 10 * 60_000, updatedAt: 0 };
    expect(timerMinutes(e, now)).toBe(360);
    expect(entryScore(H('trabalhar'), e, now)).toEqual({ done: 1, possible: 1 });
    expect(entryScore(H('trabalhar'), { ...e, timerStart: null }, now)).toEqual({ done: 0, possible: 1 });
  });
  it('Bíblia conta quando há capítulo marcado', () => {
    const m = map([{ date: '2026-10-12', habitId: 'leitura-biblia', chapters: [[43, 1]] }]);
    expect(dayScore([H('leitura-biblia')], m, '2026-10-12')).toEqual({ done: 1, possible: 1 });
  });
  it('número da semana do plano', () => {
    expect(planWeek('2026-10-12')).toBe(1);
    expect(planWeek('2026-10-18')).toBe(1);
    expect(planWeek('2026-10-19')).toBe(2);
  });
});

describe('sequências', () => {
  it('dia de hoje em aberto não quebra; dia passado em branco quebra', () => {
    const h = H('texto-do-dia');
    const m = map([
      { date: '2026-10-12', habitId: h.id, status: 'done' },
      { date: '2026-10-13', habitId: h.id, status: 'done' },
      { date: '2026-10-15', habitId: h.id, status: 'done' }
    ]);
    expect(habitStreak(h, m, '2026-10-14')).toEqual({ current: 2, best: 2 });
    // 14/10 em branco quebrou; 15/10 feito recomeça; 16/10 é hoje e ainda está em aberto.
    expect(habitStreak(h, m, '2026-10-16')).toEqual({ current: 1, best: 2 });
    expect(habitStreak(h, m, '2026-10-17')).toEqual({ current: 0, best: 2 });
  });
  it('semana forte em andamento soma sem quebrar a anterior', () => {
    const h = H('academia');
    const days = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19'];
    const m = map(days.map((date) => ({ date, habitId: h.id, status: 'done' as const })));
    expect(strongWeekStreak([h], m, '2026-10-20', 'saude')).toEqual({ current: 1, best: 1 });
  });
});
