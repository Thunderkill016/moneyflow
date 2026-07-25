-- Inbox persistence: import_batches + inbox_candidates (TASK-024)
-- Money amounts are bigint minor units (VND đồng). RLS: own rows only.

create type public.inbox_candidate_source as enum (
  'paste',
  'csv',
  'xlsx',
  'pdf',
  'manual',
  'notification',
  'email'
);

create type public.inbox_candidate_confidence as enum ('high', 'medium', 'low');

create type public.inbox_candidate_status as enum ('pending', 'approved', 'rejected');

create type public.import_batch_source as enum ('csv', 'xlsx', 'pdf', 'paste');

create type public.import_batch_status as enum ('parsed', 'committed', 'cancelled');

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 260),
  source public.import_batch_source not null,
  status public.import_batch_status not null default 'parsed',
  row_count integer not null default 0
    check (row_count >= 0 and row_count <= 1000000),
  warning_count integer not null default 0
    check (warning_count >= 0 and warning_count <= 1000000),
  skipped_rows integer not null default 0
    check (skipped_rows >= 0 and skipped_rows <= 1000000),
  map_confidence double precision not null default 0
    check (map_confidence >= 0 and map_confidence <= 1),
  headers jsonb not null default '[]'::jsonb,
  column_map jsonb not null default '{}'::jsonb,
  local_id text check (local_id is null or char_length(local_id) between 1 and 80),
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index import_batches_user_local_id_uidx
  on public.import_batches (user_id, local_id)
  where local_id is not null;

create index import_batches_user_created_idx
  on public.import_batches (user_id, created_at desc);

create trigger import_batches_set_updated_at
  before update on public.import_batches
  for each row execute function public.set_updated_at();

create table public.inbox_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.transaction_kind not null,
  amount_minor bigint not null
    check (amount_minor > 0 and amount_minor <= 9007199254740991),
  merchant text not null check (char_length(merchant) between 1 and 200),
  note text not null default '' check (char_length(note) <= 500),
  occurred_on date not null,
  source public.inbox_candidate_source not null,
  confidence public.inbox_candidate_confidence not null,
  status public.inbox_candidate_status not null default 'pending',
  possible_duplicate boolean not null default false,
  category_id uuid,
  category_name text check (category_name is null or char_length(category_name) <= 60),
  account_id uuid,
  account_name text check (account_name is null or char_length(account_name) <= 80),
  raw_snippet text check (raw_snippet is null or char_length(raw_snippet) <= 2000),
  import_batch_id uuid,
  local_id text check (local_id is null or char_length(local_id) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (import_batch_id, user_id)
    references public.import_batches (id, user_id) on delete set null,
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete set null,
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null
);

create unique index inbox_candidates_user_local_id_uidx
  on public.inbox_candidates (user_id, local_id)
  where local_id is not null;

create index inbox_candidates_user_status_idx
  on public.inbox_candidates (user_id, status, occurred_on desc, created_at desc);

create index inbox_candidates_user_batch_idx
  on public.inbox_candidates (user_id, import_batch_id)
  where import_batch_id is not null;

create trigger inbox_candidates_set_updated_at
  before update on public.inbox_candidates
  for each row execute function public.set_updated_at();

alter table public.import_batches enable row level security;
alter table public.inbox_candidates enable row level security;

create policy "import_batches_select_own" on public.import_batches
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "import_batches_insert_own" on public.import_batches
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "import_batches_update_own" on public.import_batches
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "import_batches_delete_own" on public.import_batches
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "inbox_candidates_select_own" on public.inbox_candidates
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "inbox_candidates_insert_own" on public.inbox_candidates
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "inbox_candidates_update_own" on public.inbox_candidates
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "inbox_candidates_delete_own" on public.inbox_candidates
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.import_batches, public.inbox_candidates from anon;
grant select, insert, update, delete on public.import_batches to authenticated;
grant select, insert, update, delete on public.inbox_candidates to authenticated;
