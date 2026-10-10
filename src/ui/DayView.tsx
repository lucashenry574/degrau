import { useEffect, useState } from 'react';
import * as act from '../data/actions';
import { addDays, dayOfMonth, formatLong, MONTHS, mondayOf, WEEKDAYS_SHORT } from '../domain/dates';
import { AREAS, entryId, EXTRA_SERVICE_ID, START_DATE, type Habit } from '../domain/habits';
import { dayScore, isScheduled, planWeek, weekScore, type EntryMap } from '../domain/scoring';
import { Bar, hm, Stepper } from './bits';
import { useBibleReads, useEntries, useNote, useNow } from './hooks';
import { IconLeft, IconRight } from './icons';
import { BibleRow, CheckRow, DailyTextRow, TimerRow } from './rows';

interface Props {
  habits: Habit[];
  today: string;
  date: string;
  onDate: (d: string) => void;
}

export function DayView({ habits, today, date, onDate }: Props) {
  const mon = mondayOf(date);
  const sun = addDays(mon, 6);
  const entries = useEntries(mon, sun);
  const reads = useBibleReads();
  const anyRunning = !!entries && [...entries.values()].some((e) => e.timerStart);
  const now = useNow(anyRunning);

  if (!entries || !reads) return <div className="card"><p className="muted">Carregando seus dados...</p></div>;

  const lock = date > today;
  const beforeStart = today < START_DATE;
  const canPrev = addDays(mon, -7) >= mondayOf(START_DATE);
  const canNext = addDays(mon, 7) <= mondayOf(today < START_DATE ? START_DATE : today);
  const weekNo = planWeek(date);

  return (
    <div className="stack">
      {beforeStart && (
        <section className="card">
          <h3>O plano começa na segunda, 12 de outubro</h3>
          <p className="lead" style={{ marginTop: 4 }}>Até lá nada conta e nada pode ser marcado. Você já pode explorar as telas.</p>
        </section>
      )}

      <section className="card">
        <div className="weeknav">
          <button type="button" className="nb" disabled={!canPrev} aria-label="Semana anterior" onClick={() => onDate(addDays(mon, -7))}><IconLeft /></button>
          <div className="t">Semana {weekNo} de 156</div>
          <button type="button" className="nb" disabled={!canNext} aria-label="Próxima semana" onClick={() => onDate(addDays(mon, 7))}><IconRight /></button>
        </div>
        <div className="strip">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(mon, i);
            const s = dayScore(habits, entries, d, undefined, now);
            const cls = ['sd'];
            if (d <= today && s.possible > 0 && s.done === s.possible) cls.push('full');
            else if (s.done > 0) cls.push('part');
            if (d === date) cls.push('sel');
            if (d === today) cls.push('today');
            return (
              <button key={d} type="button" className={cls.join(' ')} disabled={d < START_DATE} aria-current={d === date ? 'date' : undefined}
                aria-label={`${formatLong(d)}: ${s.done} de ${s.possible} pontos`} onClick={() => onDate(d)}>
                <span className="w">{WEEKDAYS_SHORT[i]}</span>
                <span className="n">{dayOfMonth(d)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>{formatLong(date)}</h2>
          {date === today ? <span className="chip">Hoje</span> : lock ? <span className="chip plain">Ainda não chegou</span> : null}
        </div>
        {date !== today && !beforeStart && (
          <button type="button" className="link" onClick={() => onDate(today)}>Ir para hoje</button>
        )}
        <div className="stack" style={{ gap: 10, marginTop: 12 }}>
          {AREAS.map((a) => {
            const w = weekScore(habits, entries, date, a.id, now);
            if (w.possible === 0) return null;
            return (
              <div key={a.id} className={`t-${a.tone}`}>
                <div className="row-between small"><span>{a.name} na semana</span><span className="muted">{w.done} de {w.possible}</span></div>
                <Bar value={w.done / w.possible} />
              </div>
            );
          })}
        </div>
      </section>

      {AREAS.map((a) => {
        const list = habits.filter((h) => h.area === a.id && isScheduled(h, date));
        const showExtra = a.id === 'espiritual' && date >= START_DATE;
        if (!list.length && !showExtra) return null;
        const s = dayScore(habits, entries, date, a.id, now);
        return (
          <section key={a.id} className={`card t-${a.tone}`}>
            <div className="area-h">
              <h3><span className="area-dot" />{a.name}</h3>
              {s.possible > 0 && <span className="chip tone">{s.done} de {s.possible}</span>}
            </div>
            <div className="rows">
              {list.map((h) => {
                const e = entries.get(entryId(date, h.id));
                const props = { habit: h, entry: e, date, lock };
                if (h.kind === 'dailyText') return <DailyTextRow key={h.id} {...props} />;
                if (h.kind === 'bible') return <BibleRow key={h.id} {...props} reads={reads} />;
                if (h.kind === 'timer') return <TimerRow key={h.id} {...props} now={now} />;
                return <CheckRow key={h.id} {...props} />;
              })}
            </div>
            {a.id === 'espiritual' && list.some((h) => h.kind === 'bible' || h.kind === 'dailyText') && (
              <ReadingNote date={date} lock={lock} />
            )}
            {showExtra && <ExtraService entries={entries} monday={mon} />}
          </section>
        );
      })}
    </div>
  );
}

/** Uma linha sobre a leitura do dia (texto do dia e capítulo). */
function ReadingNote({ date, lock }: { date: string; lock: boolean }) {
  const note = useNote(date);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => {
    setText(note?.text ?? '');
    setState('idle');
  }, [note?.text, date]);

  const save = async () => {
    if ((note?.text ?? '') === text.trim()) return;
    setState('saving');
    await act.saveNote(date, text);
    setState('saved');
  };

  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 4 }}>
      <label htmlFor={`nota-${date}`} className="rt" style={{ marginBottom: 6 }}>O que me marcou na leitura</label>
      <textarea id={`nota-${date}`} className="note" value={text} disabled={lock} maxLength={600}
        placeholder="Opcional. Uma frase sobre o texto do dia ou o capítulo."
        onChange={(e) => { setText(e.target.value); setState('idle'); }} onBlur={save} />
      <div className="small muted" aria-live="polite">{state === 'saving' ? 'Salvando...' : state === 'saved' ? 'Salvo' : 'Salva quando você sai do campo.'}</div>
    </div>
  );
}

/** Horas de pregação da semana fora das saídas de sábado e domingo. Só registro. */
function ExtraService({ entries, monday }: { entries: EntryMap; monday: string }) {
  const extra = entries.get(entryId(monday, EXTRA_SERVICE_ID))?.minutes ?? 0;
  let total = extra;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    for (const id of ['pregacao-sabado', 'pregacao-domingo']) total += entries.get(entryId(d, id))?.minutes ?? 0;
  }
  const end = addDays(monday, 6);
  return (
    <div className="row-between" style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }}>
      <div>
        <div className="rt">Outras horas de pregação</div>
        <div className="rs">Semana de {dayOfMonth(monday)} a {dayOfMonth(end)} de {MONTHS[Number(end.slice(5, 7)) - 1]}. Total: {hm(total)}</div>
      </div>
      <Stepper label="outras horas de pregação na semana" value={hm(extra)}
        onMinus={() => act.changeMinutes(monday, EXTRA_SERVICE_ID, -15, false)}
        onPlus={() => act.changeMinutes(monday, EXTRA_SERVICE_ID, 15, false)} />
    </div>
  );
}
