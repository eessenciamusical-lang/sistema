$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\\package.json")) {
  Write-Output "Execute este script na raiz do projeto (onde existe package.json)."
  exit 1
}

if (-not $env:DATABASE_URL) {
  Write-Output "DATABASE_URL nao foi definido."
  Write-Output "Defina assim e rode novamente:"
  Write-Output "  `$env:DATABASE_URL = 'postgresql://postgres:SENHA@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require&schema=public'"
  exit 1
}

Write-Output "Instalando dependencias..."
npm install

Write-Output "Gerando Prisma Client (Postgres/Supabase)..."
npx prisma generate --schema prisma/schema.postgres.prisma

Write-Output "Aplicando schema no Supabase (db push)..."
npx prisma db push --schema prisma/schema.postgres.prisma

Write-Output "Rodando seed (idempotente)..."
node prisma/seed.mjs

Write-Output "OK. Banco no Supabase pronto."
