# Essência Musical — Sistema

Guia completo de funcionamento, navegação e operação em desenvolvimento e produção.

## Visão Geral
- Gestão de eventos, contratos, financeiro e escala de músicos.
- Calendário mensal com agenda 24h e tarefas com lembretes.
- Acesso aberto (sem login); pode ser reativado depois.
- Funciona com banco (Prisma + Postgres/SQLite) e tem fallback sem banco com persistência no navegador.

## Navegação e Seções
- Painel do Admin: `/admin`
  - Planner mensal com calendário.
  - Indicadores de “A receber”, “A pagar”.
  - Próximos eventos e contratos recentes.
- Escala de Eventos: `/admin/events`
  - Lista por mês e acesso ao detalhe do evento.
- Evento (detalhe): `/admin/events/[id]`
  - Cliente, local, data/hora, responsáveis, financeiro vinculado.
- Restaurantes: `/admin/restaurantes`
  - Contratos recorrentes com campo obrigatório “Valor a Receber por Contrato”.
  - Novo contrato: periodicidade e geração de recebíveis.
  - Edição: recalcula recebíveis pendentes conforme valor/frequência.
- Financeiro: `/admin/financeiro`
  - Lançamentos “A receber” e “A pagar” com filtros.
- Contratos e PDF: `/admin/contracts` e `/api/contracts/[id]/pdf`
  - Emissão de PDF de contratos.
- Relatórios:
  - DRE: `/api/reports/dre?from=YYYY-MM-DD&to=YYYY-MM-DD&format=pdf|xlsx`
  - Financeiro: `/api/reports/financeiro?from=...&to=...&direction=...&status=...&format=pdf|xlsx`
- Área do Músico: `/m`
  - Agenda: `/m/agenda` e Eventos: `/m/eventos`
  - Detalhe do evento com cachês, localização e confirmação.

## Calendário e Agenda de Tarefas
- Calendário mensal 6×7, navegação por meses, destaque do dia atual.
- Modal do dia com abas:
  - Eventos: badges por tipo, cliente, local e responsáveis.
  - Tarefas: visão 24h em intervalos de 30min.
- Tarefas:
  - Criar/editar/excluir.
  - Concluir/pendente com atualização imediata.
  - Drag-and-drop para mover entre horários.
  - Valida sobreposição por horário.
  - Notificações do navegador para lembretes do dia.
- Persistência no navegador:
  - Quando o banco está indisponível, as tarefas são salvas em `localStorage`.
  - Recarregar a página mantém as tarefas no mesmo navegador/dispositivo.

## Modo Sem Banco
- Detecção de disponibilidade: `/api/health/db` e utilitário `isDbAvailable`.
- Fallback das tarefas:
  - API `/api/tasks` usa store em memória quando não há DB.
  - No cliente, o calendário salva tarefas em `localStorage` automaticamente ao detectar falha de backend.
- Limitações:
  - Tarefas em `localStorage` são por navegador/dispositivo.
  - Limpar dados do site remove as tarefas locais.

## Banco de Dados e Prisma
- Modelagem com Prisma:
  - Eventos, Contratos, Pagamentos, Assignment (responsáveis), TaskReminder (agenda).
  - `RestaurantContract.receivableTotalCents` adiciona valor obrigatório por contrato.
- Operações principais:
  - `prisma db push` para aplicar o schema.
  - `node prisma/seed.mjs` para dados iniciais idempotentes.
- Cuidados:
  - Não executar migração/seed no build da Vercel para evitar falhas de rede; faça fora do build.
  - Em páginas que consultam DB, usamos renderização dinâmica e runtime Node.js.

## Supabase e Automação
- Script auxiliar: `supabase-setup.ps1`
  - Gera Prisma Client.
  - Monta `DATABASE_URL` se houver `SUPABASE_PROJECT_REF` e `SUPABASE_DB_PASSWORD` (com encode).
  - Aplica `db push` e roda `seed` quando necessário.

## Variáveis de Ambiente
- Local (`.env`):
  ```
  DATABASE_URL="file:./dev.db"
  AUTH_SECRET="open-access"
  ```
- Produção (Vercel → Project Settings → Environment Variables):
  ```
  DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
  AUTH_SECRET=<string longa e aleatória>
  ```
- Prática recomendada: não commitar segredos; configure no painel.

## Scripts
- `npm run dev` — desenvolvimento local.
- `npm run build` — build de produção.
- `npm run start` — start de produção local.
- `npm run typecheck` — verificação TypeScript.
- `npm run lint` — ESLint.
- `npx prisma generate` — Prisma Client.
- `npx prisma db push` — aplica schema no banco atual.
- `node prisma/seed.mjs` — dados iniciais (opcional).

## Deploy em Vercel
- Conecte o repositório ao projeto na Vercel.
- Configure `DATABASE_URL` e `AUTH_SECRET`.
- Aplique schema/seed fora do build (localmente, CI ou job).
- O build executa `next build` e `prisma generate` conforme `vercel.json`.

## Segurança e Boas Práticas
- Não commitar variáveis secretas.
- Evitar executar operações no DB durante o build.
- Em APIs críticas, validar entrada com `zod` e responder códigos apropriados.

## Diagnóstico e Troubleshooting
- `/api/health/db`:
  - Detecta ausência de `DATABASE_URL`, erros de conexão e parse da URL.
  - Ajuda a identificar senhas não URL-encoded.
- Em páginas que usam DB:
  - `export const dynamic = 'force-dynamic'` e `export const runtime = 'nodejs'` para evitar prerender com acesso ao DB.
- Se o DB estiver fora:
  - O Planner mostra aviso.
  - Tarefas funcionam localmente com persistência no navegador.

## Convenções de UI
- Inputs de moeda BRL com duas casas decimais.
- Modal de nova tarefa fixado no topo, com backdrop e scroll interno.
- Badges por tipo de evento e cores para tarefas.

## Observações
- Acesso aberto sem autenticação por decisão de produto; pode ser reativado depois.
- Para demonstrações, o modo sem banco e os dados “demo” ajudam a visualizar o sistema completo.
