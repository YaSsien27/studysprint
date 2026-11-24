-- StudySprint database schema.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run again: it only creates what doesn't exist yet and
-- replaces the security policies.
--
-- Three tables, one per data type in src/types.ts:
--   modules         → Module
--   availability    → AvailabilitySlot
--   study_sessions  → StudySession
--
-- Every row has a user_id that is filled in automatically with the logged-in
-- user (auth.uid()). Row level security (RLS) then makes the database itself
-- refuse to show or change anyone else's rows.
--
-- Ids are text made by the app (random UUIDs for modules and slots,
-- "<module>-<date>-<time>" for sessions). They only need to be unique per
-- user, so each primary key is (user_id, id).

-- ── modules ────────────────────────────────────────────────────────────────
create table if not exists public.modules (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id              text not null check (length(id) between 1 and 100),
  name            text not null check (length(trim(name)) between 1 and 100),
  exam_date       date not null,
  difficulty      smallint not null check (difficulty between 1 and 5),
  estimated_hours numeric(6, 2) not null check (estimated_hours > 0 and estimated_hours <= 1000),
  created_at      timestamptz not null default now(),
  primary key (user_id, id)
);

-- ── availability (weekly free time) ────────────────────────────────────────
create table if not exists public.availability (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          text not null check (length(id) between 1 and 100),
  -- 0 = Sunday … 6 = Saturday, like JavaScript's Date.getDay()
  day_of_week smallint not null check (day_of_week between 0 and 6),
  -- "HH:MM", 24-hour. Same-length text compares in time order.
  start_time  text not null check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time    text not null check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at  timestamptz not null default now(),
  primary key (user_id, id),
  check (end_time > start_time)
);

-- ── study_sessions (the generated plan) ────────────────────────────────────
create table if not exists public.study_sessions (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (length(id) between 1 and 200),
  module_id  text not null,
  date       date not null,
  start_time text not null check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time   text not null check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  status     text not null default 'planned' check (status in ('planned', 'done', 'missed')),
  -- When a missed session is moved, the new session remembers which one it
  -- replaces, so the same missed session is never moved twice.
  moved_from text,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (end_time > start_time),
  -- The module must belong to the same user. Deleting a module removes its sessions.
  foreign key (user_id, module_id) references public.modules (user_id, id) on delete cascade
);

create index if not exists study_sessions_user_date on public.study_sessions (user_id, date);

-- ── Table permissions ──────────────────────────────────────────────────────
-- Newer Supabase projects don't let anyone use a new table until it is
-- granted. Logged-in users ("authenticated") may read and write the tables;
-- the policies below still limit them to their own rows. Logged-out visitors
-- ("anon") get no access at all.
grant select, insert, update, delete
  on public.modules, public.availability, public.study_sessions
  to authenticated;
revoke all
  on public.modules, public.availability, public.study_sessions
  from anon;

-- ── Row level security ─────────────────────────────────────────────────────
-- With RLS on and these policies, every query only ever sees rows where
-- user_id is the logged-in user. Logged-out visitors see nothing.
alter table public.modules        enable row level security;
alter table public.availability   enable row level security;
alter table public.study_sessions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['modules', 'availability', 'study_sessions'] loop
    execute format('drop policy if exists "Own rows: select" on public.%I', t);
    execute format('drop policy if exists "Own rows: insert" on public.%I', t);
    execute format('drop policy if exists "Own rows: update" on public.%I', t);
    execute format('drop policy if exists "Own rows: delete" on public.%I', t);

    -- (select auth.uid()) is evaluated once per query, which Supabase recommends for speed.
    execute format('create policy "Own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "Own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end
$$;
