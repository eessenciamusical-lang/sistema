$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\\package.json")) {
  Write-Output "Execute este script na raiz do projeto (onde existe package.json)."
  exit 1
}

if (-not (Test-Path ".\\prisma\\schema.postgres.prisma")) {
  Write-Output "Arquivo prisma\\schema.postgres.prisma nao encontrado."
  exit 1
}

if (-not $env:DATABASE_URL) {
  if ($env:SUPABASE_PROJECT_REF -and $env:SUPABASE_DB_PASSWORD) {
    $encoded = [System.Uri]::EscapeDataString($env:SUPABASE_DB_PASSWORD)
    $env:DATABASE_URL = "postgresql://postgres:$encoded@db.$($env:SUPABASE_PROJECT_REF).supabase.co:5432/postgres?sslmode=require&schema=public"
    Write-Output "DATABASE_URL montado automaticamente usando SUPABASE_PROJECT_REF e SUPABASE_DB_PASSWORD."
  } else {
    Write-Output "DATABASE_URL nao foi definido."
    Write-Output "Opcao 1 (recomendada):"
    Write-Output "  `$env:SUPABASE_PROJECT_REF = 'omhrhjrdrdjvwmwdhhuq'"
    Write-Output "  `$env:SUPABASE_DB_PASSWORD = 'SUA_SENHA'"
    Write-Output "  powershell -ExecutionPolicy Bypass -File .\\supabase-setup.ps1"
    Write-Output ""
    Write-Output "Opcao 2:"
    Write-Output "  `$env:DATABASE_URL = 'postgresql://postgres:SENHA_URLENCODED@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require&schema=public'"
    exit 1
  }
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
