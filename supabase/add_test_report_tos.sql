create table if not exists public.test_report_tos (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_role text not null default 'Instructor' check (author_role in ('Instructor')),
  referee_id uuid not null references public.profiles(id) on delete cascade,
  game_code text not null default '',
  teams text not null default '',
  match_date text not null default '',
  match_time text not null default '',
  venue text not null default '',
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Reviewed')),
  score integer not null default 0,
  three_po_iot text not null default '',
  criteria text not null default '',
  teamwork text not null default '',
  generally text not null default '',
  google_drive_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists test_report_tos_author_referee_idx
  on public.test_report_tos (author_id, referee_id, status, updated_at desc);

alter table public.test_report_tos enable row level security;
