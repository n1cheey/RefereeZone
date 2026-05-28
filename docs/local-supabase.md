# Local Supabase workflow

This project should use a local Supabase stack as the first place for schema and data changes.

## 1. Start local Supabase

Prerequisites:

- Docker Desktop
- Supabase CLI

Commands:

```powershell
npm run db:start
npm run db:status
```

After `npm run db:status`, copy these local values into [.env.local](/D:/RefZone%202.0/RefereeZone/.env.local):

- `API URL` -> `VITE_SUPABASE_URL` and `SUPABASE_URL`
- `anon key` -> `VITE_SUPABASE_PUBLISHABLE_KEY`
- `service_role key` -> `SUPABASE_SERVICE_ROLE_KEY`

Typical local URL:

```env
http://127.0.0.1:54321
```

## 2. Move schema from hosted Supabase to local

If your hosted project is the source of truth right now, move it to local in this order:

1. Export schema from hosted Supabase.
2. Apply the schema locally.
3. Import only the data you actually need for testing.

Recommended practical options:

- Schema only:
  Use your existing [supabase/schema.sql](/D:/RefZone%202.0/RefereeZone/supabase/schema.sql) plus follow-up SQL files in `supabase/`.
- Data for testing:
  Export tables from Supabase as CSV and import only the needed ones into local.
- Full database clone:
  Use a Postgres dump from the hosted database if you want an exact copy.

For dev, I recommend not cloning production auth/users blindly. Better to import only clean test data.

## 2.1 Recommended clone flow for this project

Goal:

- keep the hosted Supabase project untouched
- copy its current app data into local Supabase
- continue testing only against local

Safe sequence:

1. Start the local stack:

```powershell
npm run db:start
npm run db:status
```

2. Link the CLI to the hosted project:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
```

3. Dump remote schema:

```powershell
npx supabase db dump --linked -f supabase\remote-schema.sql
```

4. Dump remote data:

```powershell
npx supabase db dump --linked --data-only --use-copy -f supabase\seed.sql
```

5. Reset the local database and load the dumped seed:

```powershell
npm run db:reset
```

After that, your local Supabase should contain the copied app data from the hosted project.

Important:

- Per Supabase CLI docs, `supabase db dump` ignores Supabase-managed schemas by default, including `auth` and `storage`.
- That means your app tables in `public` can be cloned this way, but `auth.users` will not be copied by the normal CLI dump.

Official references:

- [Supabase CLI reference: `supabase db dump`](https://supabase.com/docs/reference/cli/supabase-migration)
- [Supabase local development guide](https://supabase.com/docs/guides/local-development)
- [Supabase seeding guide](https://supabase.com/docs/guides/local-development/seeding-your-database)

## 2.2 Auth caveat for this app

This project uses Supabase Auth plus profile data. So there are two different layers:

- `auth.users`
- your app tables like `public.profiles`, `public.nominations`, `public.reports`, and others

Because the standard CLI dump excludes `auth`, the safest dev setup is:

1. clone the app data into local
2. create local test auth users manually
3. map those local auth user ids to local profile rows if needed

If you need a near-exact auth clone too, that becomes a more advanced Postgres/backup workflow and should be done carefully, because the standard local dump flow is not meant to migrate managed auth schemas directly.

## 3. How we should make DB changes from now on

New rule:

1. Write every database change as SQL locally first.
2. Test it against the local Supabase stack.
3. Keep the SQL file in the repo.
4. Only later apply the same SQL to hosted Supabase.

Recommended commands:

```powershell
npm run db:new-migration -- add_feature_name
npm run db:reset
```

If you are still keeping manual SQL files in `supabase/`, that is okay for now. The important part is that changes are tested locally before remote rollout.

## 4. Local reset

If the local database becomes messy:

```powershell
npm run db:reset
```

That is the safe dev loop for rebuilding local state after schema changes.

## 5. Important note for this project

The app currently has SQL files in [supabase](/D:/RefZone%202.0/RefereeZone/supabase). We should gradually move toward a proper local migration flow so new work like season separation, tests module changes, and future mobile API support all go through a reproducible local database pipeline.
