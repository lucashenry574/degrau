# Decisões de arquitetura

Registro curto do que foi decidido e por quê. Mudou de ideia: acrescente uma entrada nova, não apague a antiga.

## 1. PWA estático, sem servidor (10/10/2026)

App de uso pessoal, um aparelho. Vite + React + TypeScript gera arquivos estáticos que o GitHub Pages serve de graça. Next.js ficou de fora porque exigiria servidor sem necessidade.

## 2. Dados no aparelho, em IndexedDB com Dexie (10/10/2026)

Os dados são pessoais e ficam no celular. O Dexie versiona o esquema: toda mudança de estrutura entra como `db.version(N+1)` com `.upgrade()`, nunca alterando uma versão já publicada. Isso permite o app crescer sem perder histórico.

## 3. Modelo genérico: áreas, itens e registros (10/10/2026)

- Item (`Habit`): área, tipo e dias da semana em que vale. Os dias guardam a data a partir da qual valem, então mudar a agenda não reescreve o passado.
- Registro (`Entry`): um por item por dia, com id `data|item`.
- Tipos atuais: check, reunião (presença + comentário), pregação (presença + horas), texto do dia, capítulo da Bíblia e cronômetro. Função nova entra como tipo novo.

## 4. Regras em funções puras com testes (10/10/2026)

Datas, pontuação e sequências ficam em `src/domain/` e são testadas com Vitest. As datas são strings `AAAA-MM-DD` e as contas de dias usam UTC, o que elimina erro de fuso e de horário de verão.

## 5. Backup diário pelo Apps Script do próprio usuário (10/10/2026)

Um app web não grava no Drive sozinho em segundo plano. Ao abrir o app (no máximo uma vez por dia), ele envia o backup para um script do usuário, que grava na pasta "Degrau backups" e mantém os últimos 60. O endereço do script e a chave ficam só no aparelho, nunca no código, porque o repositório é público. Restauração por arquivo `.json` na tela de configurações.

## 7. Cronômetro único "Trabalhar" (10/10/2026)

O tempo de trabalho soma todos os projetos (Workana e produto próprio), então o item deixou de ter nome de plataforma. Primeira migração do banco (versão 2): troca o id do item e move os registros. A mesma conversão roda ao restaurar backup antigo. Testada com banco em memória (fake-indexeddb).

## 6. Cronômetro por instante de início (10/10/2026)

O cronômetro guarda o instante em que começou e o tempo já acumulado. Assim continua certo com a tela bloqueada ou o app fechado. O tempo pertence ao dia em que o cronômetro foi iniciado.
