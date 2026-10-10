# Degrau

Um passo por dia: vida espiritual, saúde e trabalho, com metas diárias e semanais.

Aplicativo web instalável (PWA). Os dados ficam no próprio celular (IndexedDB) e podem ir, uma vez por dia, para uma pasta do Google Drive do usuário, por meio de um script do Google Apps Script que ele mesmo publica.

## Rodar

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:5173/degrau/
npm test         # regras de datas, pontuação e Bíblia
npm run build    # gera dist/
```

Publicação: cada envio para a branch `main` roda os testes, gera o build e publica no GitHub Pages (`.github/workflows/deploy.yml`).

## Organização

- `src/domain/`: regras puras e testadas (datas, Bíblia, itens, pontuação, sequências).
- `src/data/`: banco local (Dexie), ações de escrita e backup.
- `src/ui/`: telas.
- `apps-script/Codigo.gs`: script do backup no Drive.
- `docs/decisoes.md`: decisões de arquitetura e o porquê de cada uma.
