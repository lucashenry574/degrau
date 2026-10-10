/**
 * Livros e quantidade de capítulos conferidos em 10/10/2026 contra o índice da Bíblia
 * no WOL (wol.jw.org/pt/wol/binav/r5/lp-t): 66 livros, 1.189 capítulos.
 * O número do livro (1 a 66) é o mesmo usado nos endereços do site.
 */
export const BOOKS: ReadonlyArray<readonly [name: string, chapters: number]> = [
  ['Gênesis', 50], ['Êxodo', 40], ['Levítico', 27], ['Números', 36], ['Deuteronômio', 34],
  ['Josué', 24], ['Juízes', 21], ['Rute', 4], ['1 Samuel', 31], ['2 Samuel', 24],
  ['1 Reis', 22], ['2 Reis', 25], ['1 Crônicas', 29], ['2 Crônicas', 36], ['Esdras', 10],
  ['Neemias', 13], ['Ester', 10], ['Jó', 42], ['Salmos', 150], ['Provérbios', 31],
  ['Eclesiastes', 12], ['Cântico de Salomão', 8], ['Isaías', 66], ['Jeremias', 52], ['Lamentações', 5],
  ['Ezequiel', 48], ['Daniel', 12], ['Oseias', 14], ['Joel', 3], ['Amós', 9],
  ['Obadias', 1], ['Jonas', 4], ['Miqueias', 7], ['Naum', 3], ['Habacuque', 3],
  ['Sofonias', 3], ['Ageu', 2], ['Zacarias', 14], ['Malaquias', 4],
  ['Mateus', 28], ['Marcos', 16], ['Lucas', 24], ['João', 21], ['Atos', 28],
  ['Romanos', 16], ['1 Coríntios', 16], ['2 Coríntios', 13], ['Gálatas', 6], ['Efésios', 6],
  ['Filipenses', 4], ['Colossenses', 4], ['1 Tessalonicenses', 5], ['2 Tessalonicenses', 3], ['1 Timóteo', 6],
  ['2 Timóteo', 4], ['Tito', 3], ['Filêmon', 1], ['Hebreus', 13], ['Tiago', 5],
  ['1 Pedro', 5], ['2 Pedro', 3], ['1 João', 5], ['2 João', 1], ['3 João', 1],
  ['Judas', 1], ['Apocalipse', 22]
];

export const TOTAL_CHAPTERS = 1189;
/** Gênesis a Malaquias. */
export const FIRST_PART_CHAPTERS = 929;
export const FIRST_PART_LAST_BOOK = 39;

export type ChapterRef = [book: number, chapter: number];

export const chapterKey = (b: number, c: number) => `${b}:${c}`;

export function chapterName(b: number, c: number): string {
  return `${BOOKS[b - 1][0]} ${c}`;
}

export function chapterUrl(b: number, c: number): string {
  return `https://wol.jw.org/pt/wol/b/r5/lp-t/nwtsty/${b}/${c}`;
}

/** Página do texto do dia no WOL. O site usa mês e dia sem zero à esquerda. */
export function dailyTextUrl(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `https://wol.jw.org/pt/wol/h/r5/lp-t/${y}/${m}/${d}`;
}

/** Capítulo seguinte; depois de Apocalipse 22 volta para Gênesis 1. */
export function nextChapter(b: number, c: number): ChapterRef {
  if (c < BOOKS[b - 1][1]) return [b, c + 1];
  if (b < BOOKS.length) return [b + 1, 1];
  return [1, 1];
}

export interface ChapterRead {
  id: string;
  book: number;
  chapter: number;
  date: string;
}

/**
 * Sugestão do próximo capítulo: o seguinte ao capítulo marcado mais recentemente.
 * Empate de data fica com o capítulo mais adiante na Bíblia.
 */
export function suggestNext(reads: ChapterRead[]): ChapterRef {
  let best: ChapterRead | null = null;
  for (const r of reads) {
    if (!best || r.date > best.date || (r.date === best.date && r.book * 1000 + r.chapter > best.book * 1000 + best.chapter)) best = r;
  }
  return best ? nextChapter(best.book, best.chapter) : [1, 1];
}
