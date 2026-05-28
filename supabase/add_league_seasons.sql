create table if not exists public.league_seasons (
  id text primary key check (id in ('2025-2026', '2026-2027')),
  title text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.league_seasons (id, title, starts_on, ends_on, is_active)
values
  ('2025-2026', 'ABL Season 2025-2026', date '2025-09-01', date '2026-08-31', false),
  ('2026-2027', 'ABL Season 2026-2027', date '2026-09-01', date '2027-08-31', true)
on conflict (id) do update
set
  title = excluded.title,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active;

alter table public.nominations
add column if not exists season_id text references public.league_seasons(id);

alter table public.ranking_evaluations
add column if not exists season_id text references public.league_seasons(id);

alter table public.ranking_match_performance
add column if not exists season_id text references public.league_seasons(id);

alter table public.ranking_to_match_performance
add column if not exists season_id text references public.league_seasons(id);

alter table public.news_posts
add column if not exists season_id text references public.league_seasons(id);

alter table public.announcements
add column if not exists season_id text references public.league_seasons(id);

alter table public.availability_requests
add column if not exists season_id text references public.league_seasons(id);

alter table public.test_report_tos
add column if not exists season_id text references public.league_seasons(id);

update public.nominations
set season_id = case
  when match_date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null;

update public.ranking_evaluations
set season_id = case
  when evaluation_date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null;

update public.ranking_match_performance
set season_id = case
  when evaluation_date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null;

update public.ranking_to_match_performance
set season_id = case
  when evaluation_date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null;

update public.news_posts
set season_id = '2026-2027'
where season_id is null;

update public.announcements
set season_id = '2026-2027'
where season_id is null;

update public.availability_requests
set season_id = case
  when start_date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null;

update public.test_report_tos
set season_id = case
  when nullif(trim(match_date), '')::date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null
  and nullif(trim(match_date), '') is not null;

create index if not exists nominations_season_id_match_idx
  on public.nominations (season_id, match_date desc, match_time desc);

create index if not exists ranking_evaluations_season_id_eval_idx
  on public.ranking_evaluations (season_id, evaluation_date desc);

create index if not exists ranking_match_performance_season_id_eval_idx
  on public.ranking_match_performance (season_id, evaluation_date desc);

create index if not exists ranking_to_match_performance_season_id_eval_idx
  on public.ranking_to_match_performance (season_id, evaluation_date desc);

create index if not exists news_posts_season_id_created_idx
  on public.news_posts (season_id, created_at desc);

create index if not exists announcements_season_id_created_idx
  on public.announcements (season_id, created_at desc);

create index if not exists availability_requests_season_id_range_idx
  on public.availability_requests (season_id, start_date desc, end_date desc);

create index if not exists test_report_tos_season_id_match_idx
  on public.test_report_tos (season_id, match_date desc);
