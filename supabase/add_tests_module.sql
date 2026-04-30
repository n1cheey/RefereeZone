create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  audience_role text not null check (audience_role in ('Referee', 'TO', 'Both')),
  question_bank_size integer not null default 100,
  question_count integer not null default 25,
  question_time_limit_seconds integer not null default 120,
  pass_threshold integer not null default 20,
  created_by uuid not null references public.profiles (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  prompt_en text not null,
  prompt_az text,
  prompt_ru text,
  question_type text not null check (question_type in ('single', 'multiple')),
  order_index integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.test_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.test_questions (id) on delete cascade,
  label_en text not null,
  label_az text,
  label_ru text,
  is_correct boolean not null default false,
  option_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_role text not null,
  status text not null default 'InProgress' check (status in ('NotStarted', 'InProgress', 'Completed')),
  question_ids jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  current_question_index integer not null default 0,
  started_at timestamptz not null default now(),
  question_started_at timestamptz,
  question_deadline_at timestamptz,
  completed_at timestamptz,
  correct_answers integer not null default 0,
  total_questions integer not null default 25,
  total_duration_seconds integer,
  result_status text check (result_status in ('SUCCESS', 'FAILED')),
  retake_allowed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tests_created_by on public.tests (created_by, created_at desc);
create index if not exists idx_tests_audience_role on public.tests (audience_role, created_at desc);
create index if not exists idx_test_questions_test_id on public.test_questions (test_id, order_index);
create index if not exists idx_test_question_options_question_id on public.test_question_options (question_id, option_order);
create index if not exists idx_test_attempts_test_user on public.test_attempts (test_id, user_id, started_at desc);
create index if not exists idx_test_attempts_user on public.test_attempts (user_id, started_at desc);
