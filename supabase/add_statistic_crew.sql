alter table public.nomination_tos drop constraint if exists nomination_tos_slot_number_check;
alter table public.nomination_tos
  add constraint nomination_tos_slot_number_check
  check (slot_number between 1 and 7);
