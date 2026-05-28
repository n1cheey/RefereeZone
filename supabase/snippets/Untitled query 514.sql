create table if not exists public.client_telemetry_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_role text,
  client_event_id text not null,
  event_name text not null,
  level text not null default 'info',
  happened_at timestamptz not null default timezone('utc'::text, now()),
  payload jsonb not null default '{}'::jsonb,
  platform text,
  app_version text,
  build_type text,
  device_type text,
  release_version text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists client_telemetry_events_user_event_uidx
  on public.client_telemetry_events (user_id, client_event_id);

create index if not exists client_telemetry_events_user_happened_idx
  on public.client_telemetry_events (user_id, happened_at desc);

create index if not exists client_telemetry_events_level_happened_idx
  on public.client_telemetry_events (level, happened_at desc);

alter table public.client_telemetry_events enable row level security;

drop policy if exists "client telemetry self read" on public.client_telemetry_events;
create policy "client telemetry self read"
  on public.client_telemetry_events
  for select
  using (auth.uid() = user_id);

create index if not exists nominations_match_date_created_idx
  on public.nominations (match_date desc, created_at desc);

create index if not exists nominations_created_by_idx
  on public.nominations (created_by, created_at desc);

create index if not exists nomination_referees_referee_status_nomination_idx
  on public.nomination_referees (referee_id, status, nomination_id);

create index if not exists nomination_referees_nomination_slot_idx
  on public.nomination_referees (nomination_id, slot_number);

create index if not exists nomination_referees_nomination_referee_idx
  on public.nomination_referees (nomination_id, referee_id);

create index if not exists reports_nomination_referee_idx
  on public.reports (nomination_id, referee_id);

create index if not exists reports_author_updated_idx
  on public.reports (author_id, updated_at desc);

create index if not exists reports_status_updated_idx
  on public.reports (status, updated_at desc);

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at desc);

create index if not exists chat_conversations_user_a_updated_idx
  on public.chat_conversations (user_a_id, updated_at desc);

create index if not exists chat_conversations_user_b_updated_idx
  on public.chat_conversations (user_b_id, updated_at desc);

do $$
begin
  if to_regclass('public.push_notification_tokens') is not null then
    create index if not exists push_notification_tokens_user_active_registered_idx
      on public.push_notification_tokens (user_id, is_active, last_registered_at desc);

    create index if not exists push_notification_tokens_receipt_pending_idx
      on public.push_notification_tokens (is_active, last_receipt_status, last_ticket_checked_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.push_notification_delivery_history') is not null then
    create index if not exists push_notification_delivery_history_stage_created_idx
      on public.push_notification_delivery_history (user_id, event_stage, created_at desc);
  end if;
end $$;
