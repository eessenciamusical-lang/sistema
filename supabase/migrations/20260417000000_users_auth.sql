create extension if not exists pgcrypto;

alter table if exists "User"
add column if not exists active boolean not null default true;

create table if not exists "AuditLog" (
  id text primary key default (gen_random_uuid()::text),
  "actorUserId" text not null,
  action text not null,
  "targetUserId" text null,
  "targetType" text null,
  metadata jsonb null,
  "createdAt" timestamptz not null default now()
);

create index if not exists "AuditLog_createdAt_idx" on "AuditLog" ("createdAt");
create index if not exists "AuditLog_actorUserId_idx" on "AuditLog" ("actorUserId");

insert into "User" (id, login, email, name, role, "passwordHash", active, "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'master',
  null,
  'Master',
  'ADMIN',
  crypt('12345678', gen_salt('bf')),
  true,
  now(),
  now()
)
on conflict (login)
do update set
  role = excluded.role,
  active = true,
  "updatedAt" = now();

