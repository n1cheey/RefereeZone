with target_profiles as (
  select id, email, full_name
  from public.profiles
  where email in (
    'nikolas.osadchey@gmail.com',
    'staff@abl.az',
    'tosup@to.com',
    'finance@abl.az'
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
    tp.id,
    'authenticated',
    'authenticated',
    tp.email,
    crypt('RefZone123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', tp.full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  from target_profiles tp
  on conflict (id) do nothing
  returning id, email
)
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
  tp.id,
  jsonb_build_object('sub', tp.id::text, 'email', tp.email),
  'email',
  tp.email,
  now(),
  now(),
  now()
from target_profiles tp
where not exists (
  select 1
  from auth.identities ai
  where ai.provider = 'email'
    and ai.provider_id = tp.email
);
