import type { ISODate } from './dates';
import type { ChapterRef } from './bible';

/** Primeiro dia em que algo conta. Nada antes disso pode ser marcado. */
export const START_DATE: ISODate = '2026-10-12';
/** 3 anos de plano. */
export const PLAN_WEEKS = 156;
/** Semana forte: 90% ou mais dos pontos possíveis. */
export const STRONG_WEEK = 0.9;

export type AreaId = 'espiritual' | 'saude' | 'trabalho';

export const AREAS: ReadonlyArray<{ id: AreaId; name: string; tone: Tone }> = [
  { id: 'espiritual', name: 'Espiritual', tone: 'bib' },
  { id: 'saude', name: 'Saúde', tone: 'saude' },
  { id: 'trabalho', name: 'Trabalho', tone: 'trab' }
];

/** Família de cor de cada item na tela. */
export type Tone = 'txt' | 'bib' | 'reu' | 'pre' | 'est' | 'prep' | 'saude' | 'trab';

/**
 * Tipos de item. Cada tipo sabe quantos pontos vale e quando está feito (ver scoring.ts).
 * - check: um toque.
 * - meeting: presença + pelo menos 1 comentário (2 pontos).
 * - service: saída de pregação; vale a presença, as horas são só registro.
 * - dailyText: texto do dia, com link para o WOL.
 * - bible: pelo menos 1 capítulo marcado no dia.
 * - timer: cronômetro com meta de minutos líquidos no dia.
 */
export type HabitKind = 'check' | 'meeting' | 'service' | 'dailyText' | 'bible' | 'timer';

/**
 * Dias da semana em que o item vale, a partir de uma data.
 * Mudar os dias cria uma nova entrada; o histórico continua contando pela regra antiga.
 */
export interface Schedule {
  from: ISODate;
  /** 0 = segunda ... 6 = domingo. */
  days: number[];
}

export interface Habit {
  id: string;
  area: AreaId;
  name: string;
  hint?: string;
  kind: HabitKind;
  tone: Tone;
  order: number;
  schedules: Schedule[];
  /** Só para timer: meta diária em minutos. */
  targetMinutes?: number;
  /** A partir desta data o item deixa de valer (histórico preservado). */
  archivedFrom?: ISODate;
}

/** Registro de um item em um dia. id = `${date}|${habitId}`. */
export interface Entry {
  id: string;
  date: ISODate;
  habitId: string;
  /** 'excused' = justificado: sai da conta. */
  status?: 'done' | 'excused';
  /** Comentários na reunião. */
  count?: number;
  /** Minutos registrados (pregação, ajuste manual). */
  minutes?: number;
  /** Capítulos lidos no dia. */
  chapters?: ChapterRef[];
  /** Cronômetro: instante (ms) em que foi iniciado, ou null se parado. */
  timerStart?: number | null;
  /** Cronômetro: tempo já acumulado em ms, sem contar o trecho em andamento. */
  timerMs?: number;
  updatedAt: number;
}

export const entryId = (date: ISODate, habitId: string) => `${date}|${habitId}`;

/** Horas de pregação fora das saídas de sábado e domingo: um registro por semana, na segunda. */
export const EXTRA_SERVICE_ID = 'pregacao-extra';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS_MON_FRI = [0, 1, 2, 3, 4];
const from = START_DATE;

export const DEFAULT_HABITS: Habit[] = [
  { id: 'texto-do-dia', area: 'espiritual', name: 'Texto do dia', kind: 'dailyText', tone: 'txt', order: 10, schedules: [{ from, days: ALL_DAYS }] },
  { id: 'leitura-biblia', area: 'espiritual', name: 'Leitura da Bíblia', hint: '1 capítulo por dia', kind: 'bible', tone: 'bib', order: 20, schedules: [{ from, days: ALL_DAYS }] },
  { id: 'preparar-reunioes', area: 'espiritual', name: 'Preparar as reuniões', hint: 'Para a reunião de quarta e a de sábado', kind: 'check', tone: 'prep', order: 30, schedules: [{ from, days: [2] }] },
  { id: 'reuniao-quarta', area: 'espiritual', name: 'Reunião de quarta', hint: 'Estar presente e comentar', kind: 'meeting', tone: 'reu', order: 40, schedules: [{ from, days: [2] }] },
  { id: 'estudo-familia', area: 'espiritual', name: 'Estudo em família', kind: 'check', tone: 'est', order: 50, schedules: [{ from, days: [3] }] },
  { id: 'estudo-pessoal', area: 'espiritual', name: 'Estudo pessoal', kind: 'check', tone: 'est', order: 60, schedules: [{ from, days: [3] }] },
  { id: 'reuniao-sabado', area: 'espiritual', name: 'Reunião de sábado', hint: 'Estar presente e comentar', kind: 'meeting', tone: 'reu', order: 70, schedules: [{ from, days: [5] }] },
  { id: 'pregacao-sabado', area: 'espiritual', name: 'Pregação de sábado', hint: 'A presença conta ponto; as horas ficam no registro', kind: 'service', tone: 'pre', order: 80, schedules: [{ from, days: [5] }] },
  { id: 'pregacao-domingo', area: 'espiritual', name: 'Pregação de domingo', hint: 'A presença conta ponto; as horas ficam no registro', kind: 'service', tone: 'pre', order: 90, schedules: [{ from, days: [6] }] },
  { id: 'academia', area: 'saude', name: 'Academia', kind: 'check', tone: 'saude', order: 110, schedules: [{ from, days: WEEKDAYS_MON_FRI }] },
  { id: 'pilates', area: 'saude', name: 'Pilates', kind: 'check', tone: 'saude', order: 120, schedules: [{ from, days: [0, 2, 4] }] },
  { id: 'trabalhar', area: 'trabalho', name: 'Trabalhar', hint: '6 horas líquidas, somando todos os projetos', kind: 'timer', tone: 'trab', order: 210, targetMinutes: 360, schedules: [{ from, days: WEEKDAYS_MON_FRI }] }
];
