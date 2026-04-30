alter table public.tests
  add column if not exists status text not null default 'Draft'
    check (status in ('Draft', 'Published'));

alter table public.tests
  add column if not exists assignment_mode text not null default 'AllEligible'
    check (assignment_mode in ('AllEligible', 'SelectedUsers'));

alter table public.tests
  add column if not exists deadline_at timestamptz;

create table if not exists public.test_assignments (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_role text not null,
  assigned_by uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_test_assignments_active_unique
  on public.test_assignments (test_id, user_id, is_active);

create index if not exists idx_test_assignments_test on public.test_assignments (test_id, assigned_at desc);
create index if not exists idx_test_assignments_user on public.test_assignments (user_id, assigned_at desc);
