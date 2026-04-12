alter table public.nominations
add column if not exists referee_fee numeric(10,2);

alter table public.nominations
add column if not exists to_fee numeric(10,2);
