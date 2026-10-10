import { todayISO } from '../domain/dates';
import { applyHabitRenames, db, getSetting, SCHEMA_VERSION, setSetting } from './db';

export interface BackupFile {
  app: 'degrau';
  schema: number;
  exportedAt: string;
  data: {
    habits: unknown[];
    entries: unknown[];
    bibleReads: unknown[];
    notes: unknown[];
    settings: unknown[];
  };
}

/** Chaves de configuração que ficam só no aparelho e não viajam no backup. */
const LOCAL_ONLY = new Set(['backupUrl', 'backupKey', 'lastBackupDay', 'lastBackupStatus']);

export async function buildBackup(): Promise<BackupFile> {
  const [habits, entries, bibleReads, notes, settings] = await Promise.all([
    db.habits.toArray(),
    db.entries.toArray(),
    db.bibleReads.toArray(),
    db.notes.toArray(),
    db.settings.toArray()
  ]);
  return {
    app: 'degrau',
    schema: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { habits, entries, bibleReads, notes, settings: settings.filter((s) => !LOCAL_ONLY.has(s.key)) }
  };
}

export class BackupError extends Error {}

/** Confere se o arquivo é um backup do Degrau que esta versão consegue ler. */
export function parseBackup(text: string): BackupFile {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new BackupError('O arquivo não é um backup válido (não consegui ler o conteúdo).');
  }
  const b = obj as Partial<BackupFile>;
  if (!b || b.app !== 'degrau' || typeof b.schema !== 'number' || !b.data) {
    throw new BackupError('Este arquivo não é um backup do Degrau.');
  }
  if (b.schema > SCHEMA_VERSION) {
    throw new BackupError('Este backup veio de uma versão mais nova do app. Atualize o app e tente de novo.');
  }
  for (const k of ['habits', 'entries', 'bibleReads', 'notes', 'settings'] as const) {
    if (!Array.isArray(b.data[k])) throw new BackupError(`O backup está incompleto (faltou "${k}").`);
  }
  return b as BackupFile;
}

/** Substitui todos os dados do aparelho pelos do backup, numa única transação. */
export async function restoreBackup(b: BackupFile): Promise<void> {
  await db.transaction('rw', [db.habits, db.entries, db.bibleReads, db.notes, db.settings], async () => {
    await Promise.all([db.habits.clear(), db.entries.clear(), db.bibleReads.clear(), db.notes.clear()]);
    const keep = (await db.settings.toArray()).filter((s) => LOCAL_ONLY.has(s.key));
    await db.settings.clear();
    await db.habits.bulkPut(b.data.habits as never[]);
    await db.entries.bulkPut(b.data.entries as never[]);
    await db.bibleReads.bulkPut(b.data.bibleReads as never[]);
    await db.notes.bulkPut(b.data.notes as never[]);
    await db.settings.bulkPut([...(b.data.settings as never[]), ...keep]);
    // Backup feito antes de uma mudança de estrutura: aplica as mesmas conversões da atualização.
    await applyHabitRenames(db.habits, db.entries);
  });
}

/** Baixa o backup como arquivo .json no aparelho. */
export async function downloadBackup(): Promise<void> {
  const b = await buildBackup();
  const blob = new Blob([JSON.stringify(b)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `degrau-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
  await setSetting('lastExportAt', new Date().toISOString());
}

export type CloudStatus = { ok: boolean; at: string; message: string };

/**
 * Envia o backup do dia para o script do Google do próprio usuário, que grava no Drive dele.
 * O corpo vai como text/plain para o navegador não fazer a checagem prévia de CORS,
 * que o Apps Script não responde.
 */
export async function sendCloudBackup(): Promise<CloudStatus> {
  const url = await getSetting<string>('backupUrl', '');
  const key = await getSetting<string>('backupKey', '');
  const at = new Date().toISOString();
  if (!url) return { ok: false, at, message: 'Endereço do backup não configurado.' };
  const day = todayISO();
  let status: CloudStatus;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ chave: key, nome: `degrau-${day}.json`, conteudo: await buildBackup() })
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
    if (res.ok && body?.ok) status = { ok: true, at, message: 'Backup salvo no Drive.' };
    else if (body?.erro === 'chave') status = { ok: false, at, message: 'O script recusou a chave. Confira se é a mesma nos dois lugares.' };
    else status = { ok: false, at, message: `O script respondeu com erro${body?.erro ? `: ${body.erro}` : ''}.` };
  } catch {
    status = { ok: false, at, message: 'Não consegui falar com o script. Confira a internet e o endereço.' };
  }
  await setSetting('lastBackupStatus', status);
  if (status.ok) await setSetting('lastBackupDay', day);
  return status;
}

/** Chamado ao abrir o app e ao voltar para ele: envia no máximo um backup por dia. */
export async function autoBackupIfDue(): Promise<void> {
  const url = await getSetting<string>('backupUrl', '');
  if (!url) return;
  const last = await getSetting<string>('lastBackupDay', '');
  if (last === todayISO()) return;
  await sendCloudBackup();
}

/** Gera uma chave aleatória para o usuário colar no script. */
export function newBackupKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
