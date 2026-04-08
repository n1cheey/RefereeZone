create extension if not exists pgcrypto;

create table if not exists public.allowed_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  allowed_role text not null check (allowed_role in ('Instructor', 'TO Supervisor', 'TO', 'Table', 'Referee', 'Staff', 'Stuff')),
  license_number text not null default 'Pending',
  display_name text default '',
  created_at timestamptz not null default now()
);

alter table public.allowed_access
add column if not exists license_number text not null default 'Pending';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('Instructor', 'TO Supervisor', 'TO', 'Table', 'Referee', 'Staff', 'Stuff')),
  photo_url text not null default 'https://picsum.photos/seed/referee/300/300',
  license_number text not null,
  allowed_access_id uuid references public.allowed_access(id),
  created_at timestamptz not null default now()
);

create table if not exists public.nominations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  game_code text not null,
  teams text not null,
  match_date date not null,
  match_time time not null,
  venue text not null,
  final_score text,
  match_video_url text,
  match_protocol_url text,
  created_at timestamptz not null default now()
);

alter table public.nominations
add column if not exists final_score text;

alter table public.nominations
add column if not exists match_video_url text;

alter table public.nominations
add column if not exists match_protocol_url text;

create table if not exists public.nomination_referees (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  referee_id uuid not null references public.profiles(id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 3),
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Declined')),
  report_deadline_at timestamptz,
  responded_at timestamptz,
  unique (nomination_id, slot_number)
);

alter table public.nomination_referees
add column if not exists report_deadline_at timestamptz;

create table if not exists public.nomination_tos (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 4),
  assigned_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (nomination_id, slot_number),
  unique (nomination_id, to_id)
);

alter table public.nomination_tos
add column if not exists status text not null default 'Pending';

alter table public.nomination_tos
add column if not exists responded_at timestamptz;

alter table public.nomination_tos drop constraint if exists nomination_tos_status_check;
alter table public.nomination_tos
  add constraint nomination_tos_status_check
  check (status in ('Pending', 'Accepted', 'Declined'));

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  referee_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_role text not null check (author_role in ('Referee', 'Instructor')),
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Reviewed')),
  score integer not null default 0,
  three_po_iot text not null default '',
  criteria text not null default '',
  teamwork text not null default '',
  generally text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nomination_id, referee_id, author_id)
);

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

create table if not exists public.ranking_evaluations (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references public.profiles(id) on delete cascade,
  game_code text not null,
  evaluation_date date not null,
  score integer not null check (score in (-1, 0, 1)),
  note text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ranking_performance (
  referee_id uuid primary key references public.profiles(id) on delete cascade,
  physical_fitness integer not null default 0 check (physical_fitness in (-1, 0, 1)),
  mechanics integer not null default 0 check (mechanics in (-1, 0, 1)),
  iot integer not null default 0 check (iot in (-1, 0, 1)),
  criteria_score integer not null default 0 check (criteria_score in (-1, 0, 1)),
  teamwork_score integer not null default 0 check (teamwork_score in (-1, 0, 1)),
  game_control integer not null default 0 check (game_control in (-1, 0, 1)),
  new_philosophy integer not null default 0 check (new_philosophy in (-1, 0, 1)),
  communication integer not null default 0 check (communication in (-1, 0, 1)),
  external_evaluation integer not null default 0 check (external_evaluation in (-1, 0, 1)),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.ranking_performance
add column if not exists external_evaluation integer not null default 0;

create table if not exists public.ranking_match_performance (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references public.profiles(id) on delete cascade,
  game_code text not null,
  evaluation_date date not null,
  note text not null default '',
  physical_fitness integer not null default 0 check (physical_fitness in (-1, 0, 1)),
  mechanics integer not null default 0 check (mechanics in (-1, 0, 1)),
  iot integer not null default 0 check (iot in (-1, 0, 1)),
  criteria_score integer not null default 0 check (criteria_score in (-1, 0, 1)),
  teamwork_score integer not null default 0 check (teamwork_score in (-1, 0, 1)),
  game_control integer not null default 0 check (game_control in (-1, 0, 1)),
  new_philosophy integer not null default 0 check (new_philosophy in (-1, 0, 1)),
  communication integer not null default 0 check (communication in (-1, 0, 1)),
  external_evaluation integer not null default 0 check (external_evaluation in (-1, 0, 1)),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referee_id, game_code, evaluation_date)
);

alter table public.ranking_match_performance
add column if not exists note text not null default '';

create table if not exists public.ranking_to_match_performance (
  id uuid primary key default gen_random_uuid(),
  to_id uuid not null references public.profiles(id) on delete cascade,
  game_code text not null,
  evaluation_date date not null,
  note text not null default '',
  physical_fitness integer not null default 0 check (physical_fitness in (-1, 0, 1)),
  mechanics integer not null default 0 check (mechanics in (-1, 0, 1)),
  iot integer not null default 0 check (iot in (-1, 0, 1)),
  criteria_score integer not null default 0 check (criteria_score in (-1, 0, 1)),
  teamwork_score integer not null default 0 check (teamwork_score in (-1, 0, 1)),
  game_control integer not null default 0 check (game_control in (-1, 0, 1)),
  new_philosophy integer not null default 0 check (new_philosophy in (-1, 0, 1)),
  communication integer not null default 0 check (communication in (-1, 0, 1)),
  external_evaluation integer not null default 0 check (external_evaluation in (-1, 0, 1)),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (to_id, game_code, evaluation_date)
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null,
  commentary text not null default '',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  audience_role text not null check (audience_role in ('Referee', 'TO')),
  message text not null default '',
  message_az text not null default '',
  message_en text not null default '',
  message_ru text not null default '',
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements add column if not exists message_az text not null default '';
alter table public.announcements add column if not exists message_en text not null default '';
alter table public.announcements add column if not exists message_ru text not null default '';

create table if not exists public.user_activity (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  user_agent text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.replacement_notices (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  replaced_referee_id uuid not null references public.profiles(id) on delete cascade,
  new_referee_id uuid not null references public.profiles(id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 3),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_full_name_idx
  on public.profiles (role, full_name);

create index if not exists nominations_created_by_match_idx
  on public.nominations (created_by, match_date, match_time);

create index if not exists nomination_referees_nomination_slot_idx
  on public.nomination_referees (nomination_id, slot_number);

create index if not exists nomination_tos_nomination_slot_idx
  on public.nomination_tos (nomination_id, slot_number);

create index if not exists nomination_tos_to_created_idx
  on public.nomination_tos (to_id, created_at desc);

create index if not exists nomination_referees_referee_status_idx
  on public.nomination_referees (referee_id, status);

create index if not exists reports_nomination_referee_author_idx
  on public.reports (nomination_id, referee_id, author_id);

create index if not exists test_report_tos_author_referee_idx
  on public.test_report_tos (author_id, referee_id, status, updated_at desc);

create index if not exists ranking_match_performance_referee_match_idx
  on public.ranking_match_performance (referee_id, evaluation_date, game_code);

create index if not exists ranking_to_match_performance_to_match_idx
  on public.ranking_to_match_performance (to_id, evaluation_date, game_code);

create index if not exists user_activity_last_seen_idx
  on public.user_activity (last_seen_at desc);

create index if not exists replacement_notices_referee_created_idx
  on public.replacement_notices (replaced_referee_id, created_at desc);

alter table public.allowed_access enable row level security;
alter table public.profiles enable row level security;
alter table public.nominations enable row level security;
alter table public.nomination_referees enable row level security;
alter table public.nomination_tos enable row level security;
alter table public.reports enable row level security;
alter table public.test_report_tos enable row level security;
alter table public.ranking_evaluations enable row level security;
alter table public.ranking_performance enable row level security;
alter table public.ranking_match_performance enable row level security;
alter table public.ranking_to_match_performance enable row level security;
alter table public.news_posts enable row level security;
alter table public.announcements enable row level security;
alter table public.user_activity enable row level security;
alter table public.replacement_notices enable row level security;

alter table public.allowed_access drop constraint if exists allowed_access_allowed_role_check;
alter table public.allowed_access
  add constraint allowed_access_allowed_role_check
  check (allowed_role in ('Instructor', 'TO Supervisor', 'TO', 'Table', 'Referee', 'Staff', 'Stuff'));

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('Instructor', 'TO Supervisor', 'TO', 'Table', 'Referee', 'Staff', 'Stuff'));

update public.allowed_access
set allowed_role = 'TO'
where allowed_role = 'Table';

update public.profiles
set role = 'TO'
where role = 'Table';

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select
    case role
      when 'Table' then 'TO'
      when 'Stuff' then 'Staff'
      else role
    end
  from public.profiles
  where id = auth.uid()
$$;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
for select using (id = auth.uid() or public.current_user_role() in ('Instructor', 'Staff', 'Stuff'));

drop policy if exists "nominations role read" on public.nominations;
create policy "nominations role read" on public.nominations
for select using (
  public.current_user_role() in ('Instructor', 'Staff', 'Stuff')
  or exists (
    select 1 from public.nomination_referees nr
    where nr.nomination_id = nominations.id and nr.referee_id = auth.uid()
  )
  or exists (
    select 1 from public.nomination_tos nt
    where nt.nomination_id = nominations.id and nt.to_id = auth.uid()
  )
);

drop policy if exists "nomination_referees role read" on public.nomination_referees;
create policy "nomination_referees role read" on public.nomination_referees
for select using (
  public.current_user_role() in ('Instructor', 'Staff', 'Stuff')
  or referee_id = auth.uid()
);

drop policy if exists "nomination_tos role read" on public.nomination_tos;
create policy "nomination_tos role read" on public.nomination_tos
for select using (
  public.current_user_role() in ('Instructor', 'Staff', 'Stuff')
  or to_id = auth.uid()
);

drop policy if exists "reports role read" on public.reports;
create policy "reports role read" on public.reports
for select using (
  public.current_user_role() in ('Instructor', 'Staff', 'Stuff')
  or (author_id = auth.uid())
  or (
    referee_id = auth.uid()
    and author_role = 'Instructor'
    and status = 'Reviewed'
  )
);

drop policy if exists "ranking referee read" on public.ranking_evaluations;
create policy "ranking referee read" on public.ranking_evaluations
for select using (public.current_user_role() in ('Instructor', 'Staff', 'Stuff') or referee_id = auth.uid());

drop policy if exists "ranking performance read" on public.ranking_performance;
create policy "ranking performance read" on public.ranking_performance
for select using (public.current_user_role() in ('Instructor', 'Staff', 'Stuff') or referee_id = auth.uid());

drop policy if exists "ranking match performance read" on public.ranking_match_performance;
create policy "ranking match performance read" on public.ranking_match_performance
for select using (public.current_user_role() in ('Instructor', 'Staff', 'Stuff') or referee_id = auth.uid());

drop policy if exists "ranking TO match performance read" on public.ranking_to_match_performance;
create policy "ranking TO match performance read" on public.ranking_to_match_performance
for select using (public.current_user_role() in ('TO Supervisor', 'Staff', 'Stuff') or to_id = auth.uid());

drop policy if exists "news read" on public.news_posts;
create policy "news read" on public.news_posts
for select using (public.current_user_role() in ('Instructor', 'Referee', 'TO', 'TO Supervisor', 'Table', 'Staff', 'Stuff'));

drop policy if exists "announcements read" on public.announcements;
create policy "announcements read" on public.announcements
for select using (public.current_user_role() in ('Instructor', 'Referee', 'TO', 'TO Supervisor', 'Table', 'Staff', 'Stuff'));

drop policy if exists "activity instructor read" on public.user_activity;
create policy "activity instructor read" on public.user_activity
for select using (public.current_user_role() in ('Instructor', 'Staff', 'Stuff'));

drop policy if exists "replacement notices owner read" on public.replacement_notices;
create policy "replacement notices owner read" on public.replacement_notices
for select using (replaced_referee_id = auth.uid());
