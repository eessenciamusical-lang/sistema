# Essência Musical — Sistema

Este repositório está preparado para:
- Desenvolvimento local com SQLite (zero configuração)
- Deploy em Vercel com Supabase Postgres

## Stack
- Next.js 16 (App Router)
- Prisma ORM
- Banco: SQLite (local) / Postgres (Supabase em produção)

## Variáveis de ambiente

Local (arquivo `.env`):
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="open-access"
```

Produção (Vercel → Project Settings → Environment Variables):
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
AUTH_SECRET=<string longa e aleatória>
```

Observação: não commite segredos no repositório. Configure sempre via painel da Vercel/Supabase.

## Scripts
- `npm run dev` — inicia dev server
- `npm run build` — build de produção
- `npm run typecheck` — verificação TypeScript
- `npm run lint` — ESLint
- `npx prisma generate` — gera Prisma Client
- `npx prisma db push` — aplica o schema no banco atual (SQLite local / Postgres em produção, dependendo do `DATABASE_URL`)
- `node prisma/seed.mjs` — popula dados iniciais (idempotente)

### Postgres (Supabase)
Para aplicar schema em Postgres (fora do build da Vercel, por segurança):
```
npx prisma db push
node prisma/seed.mjs   # opcional se quiser dados de exemplo
```

## Desenvolvimento local
1. Instale dependências:
   ```
   npm install
   ```
2. Gere client e crie banco SQLite:
   ```
   npx prisma generate
   npx prisma db push
   node prisma/seed.mjs
   ```
3. Rode:
   ```
   npm run dev
   ```
4. Acesse:
   - Painel: http://localhost:3000/admin
   - Escala: http://localhost:3000/admin/events
   - Restaurantes: http://localhost:3000/admin/restaurantes

## Deploy em Vercel (com Supabase)
1. Crie o projeto no GitHub e conecte à Vercel.
2. Em Project Settings → Environment Variables:
   - `DATABASE_URL` com a string do Supabase (use Postgres padrão)
   - `AUTH_SECRET` com uma string longa
3. (Recomendado) Rode migração fora do build:
   - Localmente ou numa pipeline:  
     ```
    npx prisma db push
     node prisma/seed.mjs   # opcional
     ```
   - Ou configure um Job (CI) com acesso ao banco.
4. Faça o deploy. O build da Vercel executa `npm run build` e roda `prisma generate` pelo `buildCommand` do `vercel.json`.

## Autenticação
Atualmente, o sistema está **aberto** (sem login).  
O módulo de autenticação foi mantido, e pode ser reativado depois (NextAuth + Credenciais).

## Observações
- Não commitamos segredos. Use variáveis no provedor (Vercel / Supabase).
- Para produção com Postgres, preferimos rodar `db push / seed` fora do build (mais seguro).
