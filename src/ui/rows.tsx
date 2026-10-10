import { useState } from 'react';
import * as act from '../data/actions';
import { BOOKS, chapterName, chapterUrl, dailyTextUrl, suggestNext, type ChapterRead } from '../domain/bible';
import type { Entry, Habit } from '../domain/habits';
import { timerMinutes } from '../domain/scoring';
import { ExtLink, hm, Stepper } from './bits';
import { IconCheck, IconDash, IconPause, IconPlay, ToneIcon } from './icons';

interface RowProps {
  habit: Habit;
  entry: Entry | undefined;
  date: string;
  /** Dia futuro: nada pode ser marcado. */
  lock: boolean;
}

function Title({ habit, sub }: { habit: Habit; sub?: string }) {
  return (
    <div>
      <div className="rt"><ToneIcon tone={habit.tone} />{habit.name}</div>
      {sub && <div className="rs">{sub}</div>}
    </div>
  );
}

function ExcuseButton({ habit, entry, date, lock }: RowProps) {
  const excused = entry?.status === 'excused';
  return (
    <button type="button" className="jbtn" disabled={lock && !excused} onClick={() => act.toggleExcused(date, habit.id)}>
      {excused ? 'Desfazer' : 'Justificar'}
    </button>
  );
}

/** Check simples, reunião (com comentários) e pregação (com horas). */
export function CheckRow(p: RowProps) {
  const { habit, entry, date, lock } = p;
  const excused = entry?.status === 'excused';
  const done = entry?.status === 'done';
  return (
    <div className={`row t-${habit.tone}`}>
      <button
        type="button"
        className={`chk${excused ? ' j' : ''}`}
        aria-pressed={done}
        disabled={excused || lock}
        aria-label={`${habit.name}: ${excused ? 'justificado' : done ? 'feito' : 'não feito'}`}
        onClick={() => act.toggleDone(date, habit.id)}
      >
        {excused ? <IconDash /> : done ? <IconCheck /> : null}
      </button>
      <Title habit={habit} sub={excused ? 'Justificado, fora da conta' : habit.hint} />
      <ExcuseButton {...p} />
      {habit.kind === 'meeting' && !excused && (
        <div className="sub">
          <span className="lab">Comentários (meta: 1 ou mais)</span>
          <Stepper
            label={`comentários na ${habit.name.toLowerCase()}`}
            value={String(entry?.count ?? 0)}
            disabled={lock}
            onMinus={() => act.changeCount(date, habit.id, -1)}
            onPlus={() => act.changeCount(date, habit.id, 1)}
          />
        </div>
      )}
      {habit.kind === 'service' && !excused && (
        <div className="sub">
          <span className="lab">Horas nesta saída</span>
          <Stepper
            label={`horas na ${habit.name.toLowerCase()}`}
            value={hm(entry?.minutes ?? 0)}
            disabled={lock}
            onMinus={() => act.changeMinutes(date, habit.id, -15)}
            onPlus={() => act.changeMinutes(date, habit.id, 15)}
          />
        </div>
      )}
    </div>
  );
}

export function DailyTextRow({ habit, entry, date, lock }: RowProps) {
  const done = entry?.status === 'done';
  return (
    <div className={`row t-${habit.tone}`}>
      <button type="button" className="chk" aria-pressed={done} disabled={lock} aria-label={`${habit.name}: ${done ? 'lido' : 'não lido'}`} onClick={() => act.toggleDone(date, habit.id)}>
        {done ? <IconCheck /> : null}
      </button>
      <Title habit={habit} sub="Abre a página do dia no WOL" />
      <ExtLink href={dailyTextUrl(date)}>Abrir texto</ExtLink>
    </div>
  );
}

export function BibleRow({ habit, entry, date, lock, reads }: RowProps & { reads: ChapterRead[] }) {
  const list = entry?.chapters ?? [];
  const done = list.length > 0;
  const [sb, sc] = suggestNext(reads);
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<[number, number]>([sb, sc]);

  const openPicker = () => {
    setPick([sb, sc]);
    setPicking(true);
  };

  return (
    <div className={`row t-${habit.tone}`}>
      {done ? (
        <span className="chk on" role="img" aria-label={`${habit.name}: feita`}><IconCheck /></span>
      ) : (
        <button type="button" className="chk" disabled={lock} aria-label={`Marcar ${chapterName(sb, sc)} como lido`} onClick={() => act.markChapter(sb, sc, date, habit.id)} />
      )}
      <Title habit={habit} sub={habit.hint} />
      <span />
      {done && (
        <div className="sub col">
          {list.map(([b, c]) => (
            <div className="chap" key={`${b}:${c}`}>
              <span className="chip tone">{chapterName(b, c)}</span>
              <span className="acts">
                <ExtLink href={chapterUrl(b, c)}>Abrir</ExtLink>
                <button type="button" className="jbtn" onClick={() => act.unmarkChapter(b, c, date, habit.id)}>Remover</button>
              </span>
            </div>
          ))}
          {!lock && !picking && <div><button type="button" className="link" onClick={openPicker}>Marcar outro capítulo</button></div>}
        </div>
      )}
      {!done && !lock && !picking && (
        <div className="sub col">
          <div className="chap">
            <span>Próximo: <b>{chapterName(sb, sc)}</b></span>
            <ExtLink href={chapterUrl(sb, sc)}>Abrir</ExtLink>
          </div>
          <div className="acts">
            <button type="button" className="btn" onClick={() => act.markChapter(sb, sc, date, habit.id)}>Marcar como lido</button>
            <button type="button" className="link" onClick={openPicker}>Escolher outro</button>
          </div>
        </div>
      )}
      {picking && !lock && (
        <div className="sub col">
          <div className="pick">
            <label>
              <span className="small muted">Livro</span>
              <select className="sel-box" value={pick[0]} onChange={(e) => setPick([Number(e.target.value), 1])}>
                {BOOKS.map(([name], i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </label>
            <label>
              <span className="small muted">Capítulo</span>
              <select className="sel-box" value={pick[1]} onChange={(e) => setPick([pick[0], Number(e.target.value)])}>
                {Array.from({ length: BOOKS[pick[0] - 1][1] }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </label>
          </div>
          <div className="acts">
            <button type="button" className="btn" onClick={async () => { await act.markChapter(pick[0], pick[1], date, habit.id); setPicking(false); }}>
              Marcar {chapterName(pick[0], pick[1])}
            </button>
            <ExtLink href={chapterUrl(pick[0], pick[1])}>Abrir</ExtLink>
            <button type="button" className="link" onClick={() => setPicking(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TimerRow(p: RowProps & { now: number }) {
  const { habit, entry, date, lock, now } = p;
  const excused = entry?.status === 'excused';
  const running = !!entry?.timerStart;
  const minutes = timerMinutes(entry, now);
  const target = habit.targetMinutes ?? 0;
  const done = minutes >= target;
  const left = Math.max(0, target - minutes);
  const totalSecs = entry ? Math.floor(((entry.timerMs ?? 0) + (running ? now - (entry.timerStart ?? now) : 0)) / 1000) : 0;
  const clock = `${Math.floor(totalSecs / 3600)}:${String(Math.floor(totalSecs / 60) % 60).padStart(2, '0')}:${String(totalSecs % 60).padStart(2, '0')}`;
  return (
    <div className={`row t-${habit.tone}`}>
      <span className={`chk${done ? ' on' : ''}${excused ? ' j' : ''}`} role="img" aria-label={`${habit.name}: ${excused ? 'justificado' : done ? 'meta cumprida' : 'em andamento'}`}>
        {excused ? <IconDash /> : done ? <IconCheck /> : null}
      </span>
      <Title habit={habit} sub={excused ? 'Justificado, fora da conta' : `Meta: ${hm(target)} líquidas`} />
      <ExcuseButton {...p} />
      {!excused && (
        <div className="sub col">
          <div className="row-between">
            <div>
              <div className="timer" aria-live="off" aria-label={`${hm(minutes)} trabalhadas`}>{clock}</div>
              <div className="small muted">{done ? 'Meta do dia cumprida' : `Faltam ${hm(left)}`}{running ? ', rodando' : ''}</div>
            </div>
            {running ? (
              <button type="button" className="btn" disabled={lock} onClick={() => act.timerPause(date, habit.id)}><IconPause />Pausar</button>
            ) : (
              <button type="button" className="btn" disabled={lock} onClick={() => act.timerStart(date, habit.id)}><IconPlay />{minutes > 0 ? 'Continuar' : 'Iniciar'}</button>
            )}
          </div>
          <div className="row-between">
            <span className="lab">Ajustar o tempo</span>
            <Stepper
              label="ajuste do cronômetro em 15 minutos"
              value="15 min"
              disabled={lock}
              onMinus={() => act.timerAdjust(date, habit.id, -15)}
              onPlus={() => act.timerAdjust(date, habit.id, 15)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
