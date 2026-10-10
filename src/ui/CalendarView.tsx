import { useState } from 'react';
import { addDays, daysInMonth, firstOfMonth, formatLong, monthIndex, MONTHS, weekday, WEEKDAYS_SHORT, year } from '../domain/dates';
import { AREAS, START_DATE, type Habit } from '../domain/habits';

const START_MONTH = `${START_DATE.slice(0, 7)}-01`;
import { dayScore, type EntryMap } from '../domain/scoring';
import { useEntries } from './hooks';
import { IconLeft, IconRight } from './icons';

interface Props {
  habits: Habit[];
  today: string;
  date: string;
  onPick: (d: string) => void;
}

export function CalendarView({ habits, today, date, onPick }: Props) {
  const [ym, setYm] = useState<[number, number]>([year(date), monthIndex(date)]);
  const [y, m] = ym;
  const first = firstOfMonth(y, m);
  const n = daysInMonth(y, m);
  const last = addDays(first, n - 1);
  const entries = useEntries(first, last);

  const canPrev = first > START_MONTH;
  const go = (delta: number) => {
    const d = new Date(Date.UTC(y, m + delta, 1));
    setYm([d.getUTCFullYear(), d.getUTCMonth()]);
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="weeknav">
          <button type="button" className="nb" disabled={!canPrev} aria-label="Mês anterior" onClick={() => go(-1)}><IconLeft /></button>
          <div className="t" style={{ fontSize: 18 }}>{MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)} de {y}</div>
          <button type="button" className="nb" aria-label="Próximo mês" onClick={() => go(1)}><IconRight /></button>
        </div>
        <div className="cal">
          {WEEKDAYS_SHORT.map((w) => <div key={w} className="cw">{w}</div>)}
          {Array.from({ length: weekday(first) }, (_, i) => <div key={`v${i}`} />)}
          {entries
            ? Array.from({ length: n }, (_, i) => <Cell key={i} d={addDays(first, i)} habits={habits} entries={entries} today={today} sel={date} onPick={onPick} />)
            : null}
        </div>
        <div className="legend">
          {AREAS.map((a) => <span key={a.id} className={`t-${a.tone}`}><span className="dots"><i /></span>{a.name}</span>)}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>Dia preenchido: tudo feito. Contorno: parte feita. Cada ponto colorido é uma área com algo feito no dia.</p>
      </section>
    </div>
  );
}

function Cell({ d, habits, entries, today, sel, onPick }: { d: string; habits: Habit[]; entries: EntryMap; today: string; sel: string; onPick: (d: string) => void }) {
  const s = dayScore(habits, entries, d);
  const pre = d < START_DATE;
  const fut = d > today;
  const cls = ['cd'];
  if (fut || pre) cls.push(fut ? 'fut' : 'pre');
  if (!fut && s.possible > 0 && s.done === s.possible) cls.push('full');
  else if (s.done > 0) cls.push('part');
  if (d === today) cls.push('today');
  if (d === sel) cls.push('sel');
  const dots = AREAS.filter((a) => dayScore(habits, entries, d, a.id).done > 0);
  return (
    <button type="button" className={cls.join(' ')} disabled={pre} aria-label={`${formatLong(d)}: ${s.done} de ${s.possible} pontos`} onClick={() => onPick(d)}>
      {Number(d.slice(8))}
      <span className="dots">{dots.map((a) => <i key={a.id} className={`t-${a.tone}`} />)}</span>
    </button>
  );
}
