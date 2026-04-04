create table if not exists public.test_report_tos (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  referee_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Reviewed')),
  score integer not null default 0,
  three_po_iot text not null default '',
  criteria text not null default '',
  teamwork text not null default '',
  generally text not null default '',
  google_drive_url text not null default '',
  visible_to_referee_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nomination_id, referee_id, author_id)
);

create index if not exists test_report_tos_nomination_referee_author_idx
  on public.test_report_tos (nomination_id, referee_id, author_id);

alter table public.test_report_tos enable row level security;
