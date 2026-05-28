alter table public.profiles
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id),
  add column if not exists archived_original_email text;

create index if not exists profiles_active_role_full_name_idx
  on public.profiles (role, full_name)
  where archived_at is null;
