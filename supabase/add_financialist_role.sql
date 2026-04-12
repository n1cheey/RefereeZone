alter table public.allowed_access drop constraint if exists allowed_access_allowed_role_check;
alter table public.allowed_access
  add constraint allowed_access_allowed_role_check
  check (allowed_role in ('Instructor', 'TO Supervisor', 'TO', 'Table', 'Referee', 'Staff', 'Stuff', 'Financialist'));

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('Instructor', 'TO Supervisor', 'TO', 'Table', 'Referee', 'Staff', 'Stuff', 'Financialist'));
