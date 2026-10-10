/**
 * Recebe o backup diário do app Degrau e grava na pasta "Degrau backups" do seu Google Drive.
 *
 * Como instalar (uma vez):
 * 1. Abra https://script.google.com, crie um projeto novo e cole este arquivo inteiro.
 * 2. Troque o texto de CHAVE pela chave que aparece no app, em Configurações.
 * 3. Clique em Implantar > Nova implantação > Tipo: App da Web.
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 * 4. Autorize o acesso ao Drive quando o Google pedir.
 * 5. Copie o endereço que termina em /exec e cole no app, em Configurações.
 */
const CHAVE = 'COLE_AQUI_A_CHAVE_QUE_APARECE_NO_APP';
const PASTA = 'Degrau backups';
/** Quantos backups diários manter. Os mais antigos vão para a lixeira do Drive. */
const MANTER = 60;

function doPost(e) {
  try {
    const corpo = JSON.parse(e.postData.contents);
    if (corpo.chave !== CHAVE) return responder({ ok: false, erro: 'chave' });
    if (!/^degrau-\d{4}-\d{2}-\d{2}\.json$/.test(corpo.nome || '')) return responder({ ok: false, erro: 'nome' });
    if (!corpo.conteudo || corpo.conteudo.app !== 'degrau') return responder({ ok: false, erro: 'conteudo' });

    const pasta = obterPasta();
    const repetidos = pasta.getFilesByName(corpo.nome);
    while (repetidos.hasNext()) repetidos.next().setTrashed(true);
    pasta.createFile(corpo.nome, JSON.stringify(corpo.conteudo), 'application/json');
    limparAntigos(pasta);
    return responder({ ok: true });
  } catch (err) {
    return responder({ ok: false, erro: String(err) });
  }
}

/** Permite abrir o endereço no navegador para conferir se o script está no ar. */
function doGet() {
  return responder({ ok: true, app: 'degrau-backup' });
}

function obterPasta() {
  const it = DriveApp.getFoldersByName(PASTA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PASTA);
}

function limparAntigos(pasta) {
  const arquivos = [];
  const it = pasta.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (/^degrau-\d{4}-\d{2}-\d{2}\.json$/.test(f.getName())) arquivos.push(f);
  }
  arquivos.sort((a, b) => (a.getName() < b.getName() ? 1 : -1));
  arquivos.slice(MANTER).forEach((f) => f.setTrashed(true));
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
