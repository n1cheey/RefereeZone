with wanted_users as (
  select *
  from (
    values
      ('to@to.com', 'Local TO', 'TO', 'LOCAL-TO'),
      ('referee@abl.az', 'Local Referee', 'Referee', 'LOCAL-REF')
  ) as v(email, full_name, role, license_number)
),
missing_users as (
  select wu.*
  from wanted_users wu
  where not exists (
    select 1
    from auth.users au
    where au.email = wu.email
  )
),
inserted_users as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  select
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    mu.email,
    crypt('RefZone123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', mu.full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  from missing_users mu
  returning id, email
),
all_target_users as (
  select au.id, wu.email, wu.full_name, wu.role, wu.license_number
  from wanted_users wu
  join auth.users au on au.email = wu.email
)
insert into public.profiles (
  id,
  email,
  full_name,
  role,
  photo_url,
  license_number,
  allowed_access_id,
  created_at
)
select
  atu.id,
  atu.email,
  atu.full_name,
  atu.role,
  '',
  atu.license_number,
  null,
  now()
from all_target_users atu
where not exists (
  select 1
  from public.profiles p
  where p.email = atu.email
);

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  au.id,
  jsonb_build_object('sub', au.id::text, 'email', au.email),
  'email',
  au.email,
  now(),
  now(),
  now()
from auth.users au
where au.email in ('to@to.com', 'referee@abl.az')
and not exists (
  select 1
  from auth.identities ai
  where ai.provider = 'email'
    and ai.provider_id = au.email
);
