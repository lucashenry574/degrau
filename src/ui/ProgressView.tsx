import { useState } from 'react';
import { setSetting } from '../data/db';
import { addDays, eachDay, formatShort, monthKey, MONTHS, mondayOf, type ISODate } from '../domain/dates';
import { AREAS, EXTRA_SERVICE_ID, PLAN_WEEKS, START_DATE, STRONG_WEEK, type AreaId, type Habit } from '../domain/habits';
import { habitDayScore, habitStreak, isStrong, planWeek, ratio, strongWeekStreak, timerMinutes, weekScore, type EntryMap, type Score } from '../domain/scoring';
import { Bar, hm, pct } from './bits';
import { useAllEntries, useNow, useSetting } from './hooks';
import { IconCheck } from './icons';

export function ProgressView({ habits, today }: { habits: Habit[]; today: string }) {
  const entries = useAllEntries();
  const [area, setArea] = useState<AreaId>('espiritual');
  const running = !!entries && [...entries.values()].some((e) => e.timerStart);
  const now = useNow(running, 30_000);
  if (!entries) return <div className="card"><p className="muted">Carregando seus dados...</p></div>;

  const a = AREAS.find((x) => x.id === area)!;
  const areaHabits = habits.filter((h) => h.area === area);
  const thisMonday = mondayOf(today);
  const lastClosedSunday = addDays(thisMonday, -1);
  const week = weekScore(habits, entries, today, area, now);
  const strong = strongWeekStreak(habits, entries, today, area, now);
  const started = today >= START_DATE;

  return (
    <div className="stack">
      <div className="seg" role="group" aria-label="Área">
        {AREAS.map((x) => (
          <button key={x.id} type="button" className={`t-${x.tone}`} aria-pressed={x.id === area} onClick={() => setArea(x.id)}>{x.name}</button>
        ))}
      </div>

      {!started && (
        <div className="card"><h3>Os números começam na segunda, 12/10</h3><p className="lead" style={{ marginTop: 4 }}>Dia ou semana sem marcação conta como não feito. Justificado sai da conta.</p></div>
      )}

      <div className={`tiles t-${a.tone}`}>
        <div className="card tile"><div className="k">Esta semana</div><div className="n">{week.possible ? pct(week.done / week.possible) : '0%'}</div><div className="small muted">{week.done} de {week.possible} pontos</div></div>
        <div className="card tile"><div className="k">Semanas fortes seguidas</div><div className="n">{strong.current}</div><div className="small muted">Melhor: {strong.best}. Forte é {pct(STRONG_WEEK)} ou mais.</div></div>
        {area === 'espiritual' && <SpiritualTiles habits={areaHabits} entries={entries} today={today} />}
        {area === 'saude' && areaHabits.map((h) => <StreakTile key={h.id} habit={h} entries={entries} today={today} />)}
        {area === 'trabalho' && areaHabits.filter((h) => h.kind === 'timer').map((h) => <TimerTiles key={h.id} habit={h} entries={entries} today={today} now={now} />)}
      </div>

      <section className={`card t-${a.tone}`}>
        <h2>Últimas 12 semanas</h2>
        <p className="lead">Pontos feitos em cada semana. A linha tracejada é a meta de {pct(STRONG_WEEK)}. A barra mais clara é a semana em andamento.</p>
        <WeeksChart habits={habits} entries={entries} today={today} area={area} now={now} />
      </section>

      <section className="card">
        <h2>O que pede mais atenção</h2>
        <p className="lead">Taxa de cada item nas semanas fechadas, do menor para o maior.</p>
        <ItemRates habits={areaHabits} entries={entries} to={lastClosedSunday} />
      </section>

      {area === 'espiritual' && <Milestones habits={habits} entries={entries} today={today} />}
    </div>
  );
}

function SpiritualTiles({ habits, entries, today }: { habits: Habit[]; entries: EntryMap; today: string }) {
  const bible = habits.find((h) => h.kind === 'bible');
  const text = habits.find((h) => h.kind === 'dailyText');
  const month = monthKey(today);
  let participated = false;
  let minutes = 0;
  for (const e of entries.values()) {
    if (monthKey(e.date) !== month) continue;
    const h = habits.find((x) => x.id === e.habitId);
    if (h?.kind === 'service' || e.habitId === EXTRA_SERVICE_ID) {
      minutes += e.minutes ?? 0;
      if (e.status === 'done' || (e.minutes ?? 0) > 0) participated = true;
    }
  }
  return (
    <>
      {bible && <StreakTile habit={bible} entries={entries} today={today} label="Dias seguidos com a Bíblia" />}
      {text && <StreakTile habit={text} entries={entries} today={today} label="Dias seguidos com o texto do dia" />}
      <div className="card tile t-pre">
        <div className="k">Ministério em {MONTHS[Number(month.slice(5)) - 1]}</div>
        <div className="n" style={{ fontSize: 24 }}>{participated ? 'Sim' : 'Ainda não'}</div>
        <div className="small muted">Horas registradas: {hm(minutes)}</div>
      </div>
    </>
  );
}

function StreakTile({ habit, entries, today, label }: { habit: Habit; entries: EntryMap; today: string; label?: string }) {
  const s = habitStreak(habit, entries, today);
  return (
    <div className={`card tile t-${habit.tone}`}>
      <div className="k">{label ?? `${habit.name}: vezes seguidas`}</div>
      <div className="n">{s.current}</div>
      <div className="small muted">Melhor: {s.best}</div>
    </div>
  );
}

function TimerTiles({ habit, entries, today, now }: { habit: Habit; entries: EntryMap; today: string; now: number }) {
  const sum = (days: ISODate[]) => days.reduce((acc, d) => acc + timerMinutes(entries.get(`${d}|${habit.id}`), now), 0);
  const mon = mondayOf(today);
  const weekMin = sum(eachDay(mon, today));
  const first = `${monthKey(today)}-01`;
  const monthMin = sum(eachDay(first, today));
  const weekTarget = (habit.targetMinutes ?? 0) * 5;
  return (
    <>
      <div className="card tile"><div className="k">{habit.name} na semana</div><div className="n">{hm(weekMin)}</div><div className="small muted">Meta da semana: {hm(weekTarget)}</div><div style={{ marginTop: 8 }}><Bar value={weekTarget ? weekMin / weekTarget : 0} /></div></div>
      <div className="card tile"><div className="k">{habit.name} no mês</div><div className="n">{hm(monthMin)}</div><div className="small muted">Desde o dia 1º</div></div>
    </>
  );
}

function WeeksChart({ habits, entries, today, area, now }: { habits: Habit[]; entries: EntryMap; today: string; area: AreaId; now: number }) {
  const weeks: { mon: string; s: Score; cur: boolean }[] = [];
  const thisMonday = mondayOf(today);
  for (let mon = START_DATE; mon <= thisMonday; mon = addDays(mon, 7)) {
    weeks.push({ mon, s: weekScore(habits, entries, mon, area, now), cur: mon === thisMonday });
  }
  const last = weeks.slice(-12);
  if (!last.length) return <p className="small muted">A primeira semana começa em {formatShort(START_DATE)}.</p>;
  return (
    <>
      <div className="cols">
        {last.map((w) => {
          const r = ratio(w.s) ?? 0;
          return (
            <div key={w.mon} className={`col${w.cur ? ' cur' : ''}`} role="img" aria-label={`Semana ${planWeek(w.mon)}: ${w.s.done} de ${w.s.possible} pontos`}>
              <div className="v">{w.s.done}</div>
              <div className="b" style={{ height: `calc((100% - 20px) * ${r})` }} />
            </div>
          );
        })}
        <div className="goal" style={{ bottom: `calc((100% - 28px) * ${STRONG_WEEK})` }} />
      </div>
      <div className="xl">{last.map((w) => <span key={w.mon}>{planWeek(w.mon)}</span>)}</div>
    </>
  );
}

function ItemRates({ habits, entries, to }: { habits: Habit[]; entries: EntryMap; to: string }) {
  if (to < START_DATE) return <p className="small muted">Aparece quando a primeira semana fechar.</p>;
  const days = eachDay(START_DATE, to);
  const rows = habits
    .map((h) => {
      let s: Score = { done: 0, possible: 0 };
      for (const d of days) {
        const x = habitDayScore(h, entries, d);
        s = { done: s.done + x.done, possible: s.possible + x.possible };
      }
      return { h, r: ratio(s) };
    })
    .filter((x): x is { h: Habit; r: number } => x.r !== null)
    .sort((a, b) => a.r - b.r);
  return (
    <>
      {rows.map(({ h, r }) => (
        <div key={h.id} className={`irow t-${h.tone}${r < STRONG_WEEK ? ' low' : ''}`}>
          <span>{h.name}</span>
          <span className="p">{pct(r)}</span>
          <span className="tr"><i style={{ width: `${r * 100}%` }} /></span>
        </div>
      ))}
    </>
  );
}

const PHASES = [
  { a: 1, b: 12, t: 'Formar o hábito', d: 'Ter 9 das 12 semanas fortes.', strongTarget: 9 },
  { a: 13, b: 52, t: 'Manter o ritmo', d: 'Ficar em 90% dos pontos ou mais.' },
  { a: 53, b: 104, t: 'Ano 2', d: 'Manter 90% e assumir uma tarefa na congregação, a combinar com os anciãos.' },
  { a: 105, b: 156, t: 'Ano 3', d: 'Manter 90% e revisar com os anciãos o que ainda falta.' }
];
const ELDER_WEEKS = [26, 52, 78, 104, 130, 156];

function Milestones({ habits, entries, today }: { habits: Habit[]; entries: EntryMap; today: string }) {
  const elders = useSetting<number[]>('elderTalks', []);
  const cw = planWeek(today);
  const weekStart = (n: number) => addDays(START_DATE, 7 * (n - 1));
  const toggleElder = (n: number) => setSetting('elderTalks', elders.includes(n) ? elders.filter((x) => x !== n) : [...elders, n]);

  return (
    <>
      <section className="card t-bib">
        <h2>Marcos do plano</h2>
        <p className="lead">{cw < 1 ? `O plano começa em ${formatShort(START_DATE)}.` : `Semana ${Math.min(cw, PLAN_WEEKS)} de ${PLAN_WEEKS}.`} A nomeação é decisão dos anciãos. Aqui fica o que está nas suas mãos.</p>
        {PHASES.map((p) => {
          const closed: Score[] = [];
          for (let n = p.a; n <= p.b; n++) {
            const mon = weekStart(n);
            if (addDays(mon, 6) < today) closed.push(weekScore(habits, entries, mon, 'espiritual'));
          }
          const status = cw < p.a ? 'Ainda não começou' : cw > p.b ? 'Encerrada' : 'Em andamento';
          let metric: string;
          let value: number;
          let mark: number;
          if (p.strongTarget) {
            const c = closed.filter(isStrong).length;
            metric = `${c} ${c === 1 ? 'semana forte' : 'semanas fortes'} (meta: ${p.strongTarget} das ${p.b - p.a + 1})`;
            value = c / (p.b - p.a + 1);
            mark = p.strongTarget / (p.b - p.a + 1);
          } else {
            const t = closed.reduce((acc, s) => ({ done: acc.done + s.done, possible: acc.possible + s.possible }), { done: 0, possible: 0 });
            const r = ratio(t);
            metric = r === null ? 'Sem semanas fechadas ainda' : `${pct(r)} dos pontos (meta: ${pct(STRONG_WEEK)})`;
            value = r ?? 0;
            mark = STRONG_WEEK;
          }
          return (
            <div key={p.t} className="ph">
              <div className="row-between"><b>{p.t}</b><span className={`chip${status === 'Em andamento' ? '' : ' plain'}`}>{status}</span></div>
              <div className="small muted">Semanas {p.a} a {p.b}, de {formatShort(weekStart(p.a))} a {formatShort(addDays(weekStart(p.b), 6))}</div>
              <div>{p.d}</div>
              <div className="small">{metric}</div>
              <Bar value={value} mark={mark} />
            </div>
          );
        })}
      </section>

      <section className="card t-reu">
        <h2>Conversas com os anciãos</h2>
        <p className="lead">Uma a cada 6 meses, para pedir orientação sobre o que desenvolver. Marque quando acontecer.</p>
        {ELDER_WEEKS.map((n, i) => {
          const on = elders.includes(n);
          return (
            <div key={n} className="er">
              <button type="button" className="chk" aria-pressed={on} aria-label={`Conversa ${i + 1}: ${on ? 'feita' : 'não feita'}`} onClick={() => toggleElder(n)}>{on ? <IconCheck /> : null}</button>
              <div><div className="rt">Conversa {i + 1}</div><div className="rs">Até {formatShort(addDays(weekStart(n), 6))}, semana {n}</div></div>
            </div>
          );
        })}
      </section>
    </>
  );
}
