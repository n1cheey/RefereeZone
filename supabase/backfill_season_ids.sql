update public.nominations
set season_id = case
  when nullif(trim(match_date::text), '')::date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null
  and nullif(trim(match_date::text), '') is not null;

update public.ranking_evaluations
set season_id = case
  when nullif(trim(evaluation_date::text), '')::date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null
  and nullif(trim(evaluation_date::text), '') is not null;

update public.ranking_match_performance
set season_id = case
  when nullif(trim(evaluation_date::text), '')::date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null
  and nullif(trim(evaluation_date::text), '') is not null;

update public.ranking_to_match_performance
set season_id = case
  when nullif(trim(evaluation_date::text), '')::date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null
  and nullif(trim(evaluation_date::text), '') is not null;

update public.test_report_tos
set season_id = case
  when nullif(trim(match_date::text), '')::date >= date '2026-09-01' then '2026-2027'
  else '2025-2026'
end
where season_id is null
  and nullif(trim(match_date::text), '') is not null;
