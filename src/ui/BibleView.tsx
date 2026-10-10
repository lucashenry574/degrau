import { useMemo, useState } from 'react';
import * as act from '../data/actions';
import { BOOKS, chapterKey, chapterName, chapterUrl, FIRST_PART_CHAPTERS, FIRST_PART_LAST_BOOK, suggestNext, TOTAL_CHAPTERS } from '../domain/bible';
import { formatShort } from '../domain/dates';
import { START_DATE, type Habit } from '../domain/habits';
import { habitStreak } from '../domain/scoring';
import { Bar, ExtLink, num, pct } from './bits';
import { useAllEntries, useBibleReads } from './hooks';

export function BibleView({ habits, today }: { habits: Habit[]; today: string }) {
  const reads = useBibleReads();
  const entries = useAllEntries();
  const [open, setOpen] = useState(0);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const map = useMemo(() => new Map((reads ?? []).map((r) => [r.id, r])), [reads]);

  if (!reads || !entries) return <div className="card"><p className="muted">Carregando seus dados...</p></div>;

  const total = reads.length;
  const first = reads.filter((r) => r.book <= FIRST_PART_LAST_BOOK).length;
  const habit = habits.find((h) => h.kind === 'bible');
  const streak = habit ? habitStreak(habit, entries, today) : { current: 0, best: 0 };
  const [nb, nc] = suggestNext(reads);
  const canMark = today >= START_DATE;

  return (
    <div className="stack t-bib">
      <section className="card">
        <h2>Sua leitura da Bíblia</h2>
        <div className="row-between" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 700 }}>{num(total)} de {num(TOTAL_CHAPTERS)}</span>
          <span className="muted small">capítulos lidos ({pct(total / TOTAL_CHAPTERS)})</span>
        </div>
        <div style={{ marginTop: 8 }}><Bar value={total / TOTAL_CHAPTERS} /></div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Gênesis a Malaquias: {num(first)} de {num(FIRST_PART_CHAPTERS)}. Mateus a Apocalipse: {num(total - first)} de {num(TOTAL_CHAPTERS - FIRST_PART_CHAPTERS)}.
        </p>
        <p className="small muted">Dias seguidos lendo: {streak.current}. Melhor sequência: {streak.best}.</p>
      </section>

      <section className="card">
        <h3>Próximo capítulo</h3>
        <div className="chap" style={{ marginTop: 4 }}>
          <b>{chapterName(nb, nc)}</b>
          <ExtLink href={chapterUrl(nb, nc)}>Abrir</ExtLink>
        </div>
        <p className="small muted">Para marcar, use a tela do dia ou toque no capítulo na lista abaixo.</p>
      </section>

      <section className="card">
        <h3>Livros</h3>
        {BOOKS.map(([name, chapters], i) => {
          const b = i + 1;
          let read = 0;
          for (let c = 1; c <= chapters; c++) if (map.has(chapterKey(b, c))) read++;
          const isOpen = open === b;
          return (
            <div key={name}>
              {b === 1 && <p className="grp">Gênesis a Malaquias</p>}
              {b === 40 && <p className="grp">Mateus a Apocalipse</p>}
              <button type="button" className="book" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? 0 : b); setSel(null); }}>
                <span className="n">{name}</span>
                <span className="c">{read} de {chapters}</span>
                <span className="tr"><i style={{ width: `${(read / chapters) * 100}%` }} /></span>
              </button>
              {isOpen && (
                <>
                  <div className="chs">
                    {Array.from({ length: chapters }, (_, k) => {
                      const c = k + 1;
                      const r = map.get(chapterKey(b, c));
                      const isSel = sel?.[0] === b && sel?.[1] === c;
                      return (
                        <button key={c} type="button" className={`ch${r ? ' read' : ''}${isSel ? ' sel' : ''}`}
                          aria-label={`${chapterName(b, c)}: ${r ? 'lido' : 'não lido'}`} onClick={() => setSel([b, c])}>{c}</button>
                      );
                    })}
                  </div>
                  {sel && sel[0] === b && <ChapterDetail b={b} c={sel[1]} readDate={map.get(chapterKey(b, sel[1]))?.date} today={today} canMark={canMark} />}
                </>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function ChapterDetail({ b, c, readDate, today, canMark }: { b: number; c: number; readDate?: string; today: string; canMark: boolean }) {
  return (
    <div className="detail">
      <b>{chapterName(b, c)}</b>
      <span className="small">{readDate ? `Lido em ${formatShort(readDate)}` : 'Ainda não lido'}</span>
      <div className="acts">
        {readDate ? (
          <button type="button" className="btn ghost" onClick={() => act.unmarkChapter(b, c, readDate)}>Desmarcar</button>
        ) : (
          <button type="button" className="btn" disabled={!canMark} onClick={() => act.markChapter(b, c, today)}>Marcar como lido hoje</button>
        )}
        <ExtLink href={chapterUrl(b, c)}>Abrir</ExtLink>
      </div>
      {!canMark && !readDate && <span className="small muted">A marcação começa em 12/10/2026.</span>}
    </div>
  );
}
