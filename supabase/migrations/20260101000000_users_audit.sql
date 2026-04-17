alter table if exists "public"."User"
add column if not exists "active" boolean not null default true;

create table if not exists "public"."AuditLog" (
  "id" text primary key,
  "actorUserId" text null references "public"."User" ("id") on delete set null,
  "targetUserId" text null references "public"."User" ("id") on delete set null,
  "action" text not null,
  "meta" jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists "AuditLog_createdAt_idx" on "public"."AuditLog" ("createdAt" desc);
create index if not exists "AuditLog_actorUserId_idx" on "public"."AuditLog" ("actorUserId");
create index if not exists "AuditLog_targetUserId_idx" on "public"."AuditLog" ("targetUserId");

