import { useEffect, useRef, useState } from 'react';
import { BackupError, downloadBackup, newBackupKey, parseBackup, restoreBackup, sendCloudBackup, type BackupFile, type CloudStatus } from '../data/backup';
import { requestPersistentStorage, setSetting } from '../data/db';
import { useSetting } from './hooks';

export function SettingsView() {
  return (
    <div className="stack">
      <CloudBackup />
      <ManualBackup />
      <StorageInfo />
    </div>
  );
}

function CloudBackup() {
  const savedUrl = useSetting<string>('backupUrl', '');
  const key = useSetting<string>('backupKey', '');
  const last = useSetting<CloudStatus | null>('lastBackupStatus', null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setUrl(savedUrl), [savedUrl]);
  useEffect(() => {
    if (!key) setSetting('backupKey', newBackupKey());
  }, [key]);

  const validUrl = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url.trim());

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card">
      <h2>Backup diário no Google Drive</h2>
      <p className="lead" style={{ marginTop: 4 }}>
        Uma vez por dia, ao abrir o app, ele envia uma cópia dos seus dados para um script seu, que grava na pasta "Degrau backups" do seu Drive.
      </p>
      <div className="stack" style={{ gap: 12, marginTop: 12 }}>
        <div className="field">
          <label>Chave deste aparelho</label>
          <div className="code">{key || 'gerando...'}</div>
          <div className="acts">
            <button type="button" className="btn ghost" onClick={copy}>{copied ? 'Copiada' : 'Copiar chave'}</button>
          </div>
          <span className="small muted">Cole esta chave no script, no lugar indicado. Ela impede que outra pessoa grave no seu Drive.</span>
        </div>
        <div className="field">
          <label htmlFor="backup-url">Endereço do script</label>
          <input id="backup-url" type="url" inputMode="url" autoComplete="off" placeholder="https://script.google.com/macros/s/.../exec"
            value={url} onChange={(e) => setUrl(e.target.value)} />
          {url && !validUrl && <span className="msg-err">O endereço precisa começar com https://script.google.com/macros/s/ e terminar com /exec.</span>}
        </div>
        <div className="acts">
          <button type="button" className="btn" disabled={!validUrl || url.trim() === savedUrl} onClick={() => setSetting('backupUrl', url.trim())}>Salvar endereço</button>
          <button type="button" className="btn ghost" disabled={!savedUrl || busy} onClick={async () => { setBusy(true); await sendCloudBackup(); setBusy(false); }}>
            {busy ? 'Enviando...' : 'Enviar backup agora'}
          </button>
        </div>
        {last && (
          <p className={last.ok ? 'msg-ok' : 'msg-err'} aria-live="polite">
            {last.message} {new Date(last.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        )}
      </div>
    </section>
  );
}

function ManualBackup() {
  const lastExport = useSetting<string>('lastExportAt', '');
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onFile = async (f: File | undefined) => {
    setMsg(null);
    setPending(null);
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BackupError ? e.message : 'Não consegui ler o arquivo.' });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="card">
      <h2>Backup em arquivo</h2>
      <p className="lead" style={{ marginTop: 4 }}>Baixa um arquivo com todos os dados, ou restaura um arquivo baixado antes.</p>
      <div className="acts" style={{ marginTop: 12 }}>
        <button type="button" className="btn ghost" onClick={() => downloadBackup()}>Baixar backup</button>
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>Restaurar backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {lastExport && <p className="small muted" style={{ marginTop: 8 }}>Último arquivo baixado em {new Date(lastExport).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</p>}
      {pending && (
        <div className="detail" style={{ marginTop: 12 }}>
          <b>Substituir os dados deste aparelho?</b>
          <span className="small">
            O arquivo é de {new Date(pending.exportedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} e tem {pending.data.entries.length} registros.
            Tudo o que está no aparelho agora será trocado por ele.
          </span>
          <div className="acts">
            <button type="button" className="btn danger" onClick={async () => {
              await restoreBackup(pending);
              setPending(null);
              setMsg({ ok: true, text: 'Backup restaurado.' });
            }}>Substituir dados</button>
            <button type="button" className="link" onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p className={msg.ok ? 'msg-ok' : 'msg-err'} style={{ marginTop: 8 }}>{msg.text}</p>}
    </section>
  );
}

function StorageInfo() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    requestPersistentStorage().then(setPersisted);
  }, []);
  return (
    <section className="card">
      <h2>Onde ficam seus dados</h2>
      <p className="lead" style={{ marginTop: 4 }}>
        Tudo fica neste aparelho, dentro do navegador. Limpar os dados do navegador apaga o app; o backup diário existe para isso.
      </p>
      <p className="small" style={{ marginTop: 8 }}>
        {persisted === null ? 'Conferindo a proteção dos dados...' : persisted ? 'O navegador marcou os dados como protegidos contra limpeza automática.' : 'O navegador ainda não protegeu os dados contra limpeza automática. Instalar o app na tela inicial costuma resolver.'}
      </p>
      <p className="small muted" style={{ marginTop: 8 }}>Versão {__APP_VERSION__}</p>
    </section>
  );
}
