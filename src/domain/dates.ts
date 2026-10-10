/**
 * Datas do app são strings 'AAAA-MM-DD' no horário local do aparelho.
 * Toda conta de dias é feita em UTC sobre esses números, para não sofrer com horário de verão
 * nem com o fuso: '2026-10-12' é sempre o mesmo dia, em qualquer lugar.
 */
export type ISODate = string;

const DAY_MS = 86_400_000;

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** Índice 0 = segunda-feira, 6 = domingo. */
export const WEEKDAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const pad = (n: number) => String(n).padStart(2, '0');

function parts(iso: ISODate): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function toUTCms(iso: ISODate): number {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
}

function fromUTCms(ms: number): ISODate {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Data local de hoje (ou do instante informado). */
export function todayISO(now: Date = new Date()): ISODate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: ISODate, n: number): ISODate {
  return fromUTCms(toUTCms(iso) + n * DAY_MS);
}

/** Dias de a até b (positivo quando b é depois de a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTCms(b) - toUTCms(a)) / DAY_MS);
}

/** 0 = segunda ... 6 = domingo. */
export function weekday(iso: ISODate): number {
  return (new Date(toUTCms(iso)).getUTCDay() + 6) % 7;
}

export function mondayOf(iso: ISODate): ISODate {
  return addDays(iso, -weekday(iso));
}

export function dayOfMonth(iso: ISODate): number {
  return parts(iso)[2];
}

export function monthIndex(iso: ISODate): number {
  return parts(iso)[1] - 1;
}

export function year(iso: ISODate): number {
  return parts(iso)[0];
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

export function firstOfMonth(y: number, m0: number): ISODate {
  return `${y}-${pad(m0 + 1)}-01`;
}

export function daysInMonth(y: number, m0: number): number {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
}

/** Lista de datas de a até b, inclusive. */
export function eachDay(a: ISODate, b: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = a; d <= b; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "Segunda-feira, 12 de outubro" */
export function formatLong(iso: ISODate): string {
  const [, m, d] = parts(iso);
  return `${WEEKDAYS[weekday(iso)]}, ${d} de ${MONTHS[m - 1]}`;
}

/** "12/10/2026" */
export function formatShort(iso: ISODate): string {
  const [y, m, d] = parts(iso);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** Comparação de strings ISO funciona como comparação de datas. */
export const minDate = (a: ISODate, b: ISODate) => (a < b ? a : b);
export const maxDate = (a: ISODate, b: ISODate) => (a > b ? a : b);
