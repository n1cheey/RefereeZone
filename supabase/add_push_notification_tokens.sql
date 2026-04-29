create table if not exists public.push_notification_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null default 'android',
  app_version text,
  device_type text,
  build_type text,
  is_active boolean not null default true,
  last_registered_at timestamptz not null default timezone('utc'::text, now()),
  last_delivery_kind text,
  last_delivery_title text,
  last_delivery_body text,
  last_delivery_at timestamptz,
  last_ticket_id text,
  last_ticket_status text,
  last_ticket_message text,
  last_ticket_error text,
  last_ticket_checked_at timestamptz,
  last_receipt_status text,
  last_receipt_message text,
  last_receipt_error text,
  last_receipt_checked_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.push_notification_tokens
  add column if not exists device_type text,
  add column if not exists build_type text,
  add column if not exists last_delivery_kind text,
  add column if not exists last_delivery_title text,
  add column if not exists last_delivery_body text,
  add column if not exists last_delivery_at timestamptz,
  add column if not exists last_ticket_id text,
  add column if not exists last_ticket_status text,
  add column if not exists last_ticket_message text,
  add column if not exists last_ticket_error text,
  add column if not exists last_ticket_checked_at timestamptz,
  add column if not exists last_receipt_status text,
  add column if not exists last_receipt_message text,
  add column if not exists last_receipt_error text,
  add column if not exists last_receipt_checked_at timestamptz;

create index if not exists push_notification_tokens_user_id_idx
  on public.push_notification_tokens (user_id);

create index if not exists push_notification_tokens_is_active_idx
  on public.push_notification_tokens (is_active);

alter table public.push_notification_tokens enable row level security;

drop policy if exists "push tokens self read" on public.push_notification_tokens;
create policy "push tokens self read"
  on public.push_notification_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "push tokens self insert" on public.push_notification_tokens;
create policy "push tokens self insert"
  on public.push_notification_tokens
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "push tokens self update" on public.push_notification_tokens;
create policy "push tokens self update"
  on public.push_notification_tokens
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push tokens self delete" on public.push_notification_tokens;
create policy "push tokens self delete"
  on public.push_notification_tokens
  for delete
  using (auth.uid() = user_id);

create table if not exists public.push_notification_delivery_history (
  id bigint generated always as identity primary key,
  token_id bigint references public.push_notification_tokens(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text,
  delivery_kind text,
  delivery_title text,
  delivery_body text,
  event_stage text not null,
  delivery_status text,
  failure_reason text,
  ticket_id text,
  ticket_status text,
  ticket_message text,
  ticket_error text,
  receipt_status text,
  receipt_message text,
  receipt_error text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists push_notification_delivery_history_user_id_idx
  on public.push_notification_delivery_history (user_id, created_at desc);

create index if not exists push_notification_delivery_history_token_id_idx
  on public.push_notification_delivery_history (token_id, created_at desc);

alter table public.push_notification_delivery_history enable row level security;

drop policy if exists "push history self read" on public.push_notification_delivery_history;
create policy "push history self read"
  on public.push_notification_delivery_history
  for select
  using (auth.uid() = user_id);
