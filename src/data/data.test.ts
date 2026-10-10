import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timerMinutes } from '../domain/scoring';
import { timerAdjust, timerPause, timerStart } from './actions';
import { DegrauDB, db } from './db';
import { parseBackup, restoreBackup } from './backup';

const DAY = '2026-10-14';
const T0 = new Date('2026-10-14T08:00:00').getTime();

describe('cronômetro: pausar e retomar soma os trechos', () => {
  beforeEach(async () => {
    await db.entries.clear();
    // Só o relógio é simulado; os timers reais continuam, porque o banco em memória depende deles.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('2h + pausa de 1h + 1h30 = 3h30 líquidas', async () => {
    await timerStart(DAY, 'trabalhar');
    vi.setSystemTime(T0 + 2 * 3600_000);
    await timerPause(DAY, 'trabalhar');
    vi.setSystemTime(T0 + 3 * 3600_000); // pausa de 1h não conta
    await timerStart(DAY, 'trabalhar');
    vi.setSystemTime(T0 + 4.5 * 3600_000);
    await timerPause(DAY, 'trabalhar');
    const e = await db.entries.get(`${DAY}|trabalhar`);
    expect(e?.timerStart).toBeNull();
    expect(timerMinutes(e)).toBe(210);
  });

  it('conta o trecho em andamento sem precisar pausar, e o ajuste manual soma', async () => {
    await timerStart(DAY, 'trabalhar');
    vi.setSystemTime(T0 + 45 * 60_000);
    await timerAdjust(DAY, 'trabalhar', 15);
    const e = await db.entries.get(`${DAY}|trabalhar`);
    expect(timerMinutes(e, Date.now())).toBe(60);
  });

  it('tocar em iniciar com o cronômetro já rodando não zera o trecho', async () => {
    await timerStart(DAY, 'trabalhar');
    vi.setSystemTime(T0 + 30 * 60_000);
    await timerStart(DAY, 'trabalhar');
    const e = await db.entries.get(`${DAY}|trabalhar`);
    expect(timerMinutes(e, Date.now())).toBe(30);
  });
});

describe('migração da versão 1 para a 2', () => {
  it('troca Workana por Trabalhar e leva os registros junto', async () => {
    const name = 'degrau-migracao-teste';
    const v1 = new Dexie(name);
    v1.version(1).stores({ habits: 'id, area, order', entries: 'id, date, habitId', bibleReads: 'id, date', notes: 'date', settings: 'key' });
    await v1.table('habits').put({ id: 'workana', area: 'trabalho', name: 'Workana', kind: 'timer', tone: 'trab', order: 210, targetMinutes: 360, schedules: [{ from: '2026-10-12', days: [0, 1, 2, 3, 4] }] });
    await v1.table('entries').put({ id: `${DAY}|workana`, date: DAY, habitId: 'workana', timerMs: 3_600_000, updatedAt: 1 });
    v1.close();

    const v2 = new DegrauDB(name);
    await v2.open();
    expect(await v2.habits.get('workana')).toBeUndefined();
    expect((await v2.habits.get('trabalhar'))?.name).toBe('Trabalhar');
    expect(await v2.entries.get(`${DAY}|workana`)).toBeUndefined();
    expect((await v2.entries.get(`${DAY}|trabalhar`))?.timerMs).toBe(3_600_000);
    v2.close();
  });

  it('backup antigo restaurado também é convertido', async () => {
    const old = JSON.stringify({
      app: 'degrau', schema: 1, exportedAt: '2026-10-14T12:00:00Z',
      data: {
        habits: [{ id: 'workana', area: 'trabalho', name: 'Workana', kind: 'timer', tone: 'trab', order: 210, targetMinutes: 360, schedules: [{ from: '2026-10-12', days: [0, 1, 2, 3, 4] }] }],
        entries: [{ id: `${DAY}|workana`, date: DAY, habitId: 'workana', timerMs: 600_000, updatedAt: 1 }],
        bibleReads: [], notes: [], settings: []
      }
    });
    await restoreBackup(parseBackup(old));
    expect((await db.habits.get('trabalhar'))?.name).toBe('Trabalhar');
    expect((await db.entries.get(`${DAY}|trabalhar`))?.timerMs).toBe(600_000);
    expect(await db.entries.get(`${DAY}|workana`)).toBeUndefined();
  });
});
