create extension if not exists pgcrypto;

do $$ begin
  create type "Role" as enum ('ADMIN','MUSICIAN');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "AssignmentStatus" as enum ('PENDING','CONFIRMED','CANCELLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "EventType" as enum ('WEDDING','CEREMONY','RECEPTION','RESTAURANT','OTHER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "ContractStatus" as enum ('DRAFT','SENT','SIGNED','CANCELLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "PaymentDirection" as enum ('RECEIVABLE','PAYABLE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "PaymentStatus" as enum ('PENDING','RECEIVED','REFUNDED','PAID','CANCELLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "PaymentType" as enum ('CONTRACT_RECEIVABLE','MUSICIAN_PAYABLE','RESTAURANT_RECEIVABLE','OTHER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "PaymentFrequency" as enum ('DAILY','WEEKLY','MONTHLY');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "RestaurantContractStatus" as enum ('ACTIVE','ENDED','CANCELLED');
exception when duplicate_object then null;
end $$;

create table if not exists "User" (
  id text primary key default (gen_random_uuid()::text),
  email text unique,
  login text unique,
  name text not null,
  role "Role" not null default 'ADMIN',
  "passwordHash" text not null default '',
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "MusicianProfile" (
  id text primary key default (gen_random_uuid()::text),
  "userId" text not null unique references "User"(id) on delete cascade,
  phone text,
  instrument text,
  bio text,
  "baseCacheCents" integer not null default 0,
  active boolean not null default true,
  "lastSeen" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "Client" (
  id text primary key default (gen_random_uuid()::text),
  name text not null,
  email text,
  phone text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "Lead" (
  id text primary key default (gen_random_uuid()::text),
  name text not null,
  email text,
  phone text,
  message text,
  "createdAt" timestamptz not null default now()
);

create table if not exists "Restaurant" (
  id text primary key default (gen_random_uuid()::text),
  name text not null,
  address text not null,
  city text,
  state text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "RestaurantContract" (
  id text primary key default (gen_random_uuid()::text),
  "restaurantId" text not null references "Restaurant"(id) on delete cascade,
  "startDate" timestamptz not null,
  "endDate" timestamptz not null,
  time text not null,
  "paymentFrequency" "PaymentFrequency" not null default 'MONTHLY',
  "receivableTotalCents" integer not null default 0,
  "totalCents" integer not null default 0,
  status "RestaurantContractStatus" not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "Event" (
  id text primary key default (gen_random_uuid()::text),
  title text not null,
  date timestamptz not null,
  "eventType" "EventType" not null default 'WEDDING',
  "locationName" text,
  address text,
  city text,
  state text,
  "mapUrl" text,
  notes text,
  timeline text,
  repertoire text,
  "clientId" text references "Client"(id) on delete set null,
  "restaurantContractId" text references "RestaurantContract"(id) on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "Contract" (
  id text primary key default (gen_random_uuid()::text),
  "eventId" text not null unique references "Event"(id) on delete cascade,
  "totalAmount" integer not null default 0,
  terms text not null default '',
  status "ContractStatus" not null default 'DRAFT',
  "sentAt" timestamptz,
  "signedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "MusicianProfileLink" (
  id text primary key default (gen_random_uuid()::text),
  "musicianId" text not null,
  label text not null,
  url text not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists "Assignment" (
  id text primary key default (gen_random_uuid()::text),
  "eventId" text not null references "Event"(id) on delete cascade,
  "musicianId" text not null references "MusicianProfile"(id) on delete cascade,
  "roleName" text,
  status "AssignmentStatus" not null default 'PENDING',
  "costCents" integer,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("eventId","musicianId")
);

create table if not exists "NotificationAck" (
  id text primary key default (gen_random_uuid()::text),
  "userId" text not null references "User"(id) on delete cascade,
  "assignmentId" text not null references "Assignment"(id) on delete cascade,
  "readAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  unique ("userId","assignmentId")
);

create table if not exists "TaskReminder" (
  id text primary key default (gen_random_uuid()::text),
  "userId" text not null references "User"(id) on delete cascade,
  title text not null,
  description text,
  "startAt" timestamptz not null,
  "durationMin" integer not null default 30,
  color text not null default 'blue',
  completed boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("userId","startAt")
);

create index if not exists "TaskReminder_userId_startAt_idx" on "TaskReminder" ("userId","startAt");

create table if not exists "Payment" (
  id text primary key default (gen_random_uuid()::text),
  "eventId" text not null references "Event"(id) on delete cascade,
  type "PaymentType" not null default 'OTHER',
  direction "PaymentDirection" not null,
  "contractId" text unique references "Contract"(id) on delete set null,
  "assignmentId" text unique references "Assignment"(id) on delete set null,
  "restaurantContractId" text references "RestaurantContract"(id) on delete set null,
  amount integer not null,
  status "PaymentStatus" not null default 'PENDING',
  "dueDate" timestamptz,
  "paidAt" timestamptz,
  note text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

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

create or replace function set_updated_at() returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger trg_user_updated_at before update on "User" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_musician_updated_at before update on "MusicianProfile" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_client_updated_at before update on "Client" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_restaurant_updated_at before update on "Restaurant" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_restaurant_contract_updated_at before update on "RestaurantContract" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_event_updated_at before update on "Event" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_contract_updated_at before update on "Contract" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_assignment_updated_at before update on "Assignment" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_task_updated_at before update on "TaskReminder" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_payment_updated_at before update on "Payment" for each row execute procedure set_updated_at();
exception when duplicate_object then null;
end $$;

alter table "User" disable row level security;
alter table "MusicianProfile" disable row level security;
alter table "Client" disable row level security;
alter table "Lead" disable row level security;
alter table "Restaurant" disable row level security;
alter table "RestaurantContract" disable row level security;
alter table "Event" disable row level security;
alter table "Contract" disable row level security;
alter table "MusicianProfileLink" disable row level security;
alter table "Assignment" disable row level security;
alter table "NotificationAck" disable row level security;
alter table "TaskReminder" disable row level security;
alter table "Payment" disable row level security;
alter table "AuditLog" disable row level security;

grant all on table "User" to anon, authenticated;
grant all on table "MusicianProfile" to anon, authenticated;
grant all on table "Client" to anon, authenticated;
grant all on table "Lead" to anon, authenticated;
grant all on table "Restaurant" to anon, authenticated;
grant all on table "RestaurantContract" to anon, authenticated;
grant all on table "Event" to anon, authenticated;
grant all on table "Contract" to anon, authenticated;
grant all on table "MusicianProfileLink" to anon, authenticated;
grant all on table "Assignment" to anon, authenticated;
grant all on table "NotificationAck" to anon, authenticated;
grant all on table "TaskReminder" to anon, authenticated;
grant all on table "Payment" to anon, authenticated;
grant all on table "AuditLog" to anon, authenticated;

