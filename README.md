# ABL RefZone

React/Vite frontend with Cloudflare Pages Functions and Supabase for:

- auth and role-based registration
- nominations and referee responses
- reports with `Draft / Submitted / Reviewed`
- rankings
- instructor admin tools

Product roadmap:

- [docs/refzone-3-roadmap.md](/D:/RefZone%202.0/RefereeZone/docs/refzone-3-roadmap.md)

## Supabase setup

1. Open Supabase SQL Editor.
2. Run [supabase/schema.sql](/C:/Users/nikol/Documents/GitHub/RefereeZone/supabase/schema.sql).
3. In `Authentication -> Users`, there is nothing else to create manually.

## Local Supabase first

This project should now be developed database-first on local Supabase, not directly on the hosted project.

1. Install Docker Desktop.
2. Install the Supabase CLI.
3. In the project root run `npm run db:start`.
4. Run `npm run db:status` and copy the local `API URL`, `anon key`, and `service_role key`.
5. Paste those values into `.env.local`.
6. Apply your schema and SQL changes locally first.

Recommended workflow for every DB change:

1. Create a new SQL file in `supabase/` or a real CLI migration in `supabase/migrations/`.
2. Apply and test it on the local Supabase stack.
3. Only after local verification, use the same SQL on hosted Supabase later.

## Environment variables

Create `.env.local` for local build-time work:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-local-anon-key-from-supabase-status
VITE_APP_URL=http://localhost:3000
VITE_TEYINAT_API_URL=https://your-teyinat-service.example.com
VITE_DEFAULT_SEASON=2026-2027
VITE_APP_STAGE=local
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key-from-supabase-status
```

For Cloudflare Pages add these project variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_TEYINAT_API_URL=https://your-teyinat-service.example.com
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

Important:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are browser-safe build variables.
- `VITE_DEFAULT_SEASON` selects the season workspace shown by default in the new shell.
- `VITE_APP_STAGE` labels the environment as `local`, `preview`, or `production`.
- `VITE_TEYINAT_API_URL` points the frontend to the separate Word-to-PDF export service.
- `SUPABASE_SERVICE_ROLE_KEY` must be stored as a server secret.
- `SUPABASE_URL` is used by Pages Functions at runtime.

## Season architecture

- The frontend shell now has a season workspace switch for `2025-2026` and `2026-2027`.
- Database preparation for hard season separation is provided in [supabase/add_league_seasons.sql](/D:/RefZone%202.0/RefereeZone/supabase/add_league_seasons.sql).
- The next backend step is to thread `season_id` through API reads and writes so nominations, reports, rankings, news, and availability can be filtered per season end-to-end.

## Local run

Frontend only:

```powershell
npm install
npm run dev
```

Useful local database commands:

```powershell
npm run db:start
npm run db:status
npm run db:reset
npm run db:stop
```

For a full local stack, first start local Supabase, then run the frontend and any local API/service you need.

Cloudflare Pages preview after build:

```powershell
npm run build
npm run preview:cloudflare
```

If `wrangler` is not installed locally, `npx` will fetch it automatically for `preview:cloudflare`.

## Cloudflare Pages deploy

1. Push the project to GitHub.
2. In Cloudflare Dashboard open `Workers & Pages`.
3. Create a new Pages project and connect the repository.
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. In project settings open `Variables and Secrets`.
6. Add these keys for both `Production` and `Preview` as needed:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_TEYINAT_API_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
7. Redeploy after saving variables.

Recommended split:

- Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` as Variables.
- Add `VITE_TEYINAT_API_URL` as Variable.
- Add `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` as Secrets.

## Exact Teyinat PDF service

Exact `DOCX -> PDF` export for `Teyinat` is handled by a separate backend service because Cloudflare Pages Functions cannot run LibreOffice.

Files:

- [server/teyinat-service.js](/C:/Users/nikol/Documents/GitHub/RefereeZone/server/teyinat-service.js)
- [server/teyinat-template.js](/C:/Users/nikol/Documents/GitHub/RefereeZone/server/teyinat-template.js)
- [server/Dockerfile.teyinat](/C:/Users/nikol/Documents/GitHub/RefereeZone/server/Dockerfile.teyinat)

Local run:

```powershell
npm install
npm run server:teyinat
```

Required server environment variables:

```env
TEYINAT_SERVICE_PORT=3002
TEYINAT_ALLOWED_ORIGIN=https://your-cloudflare-pages-domain.pages.dev
TEYINAT_SOFFICE_BINARY=soffice
TEYINAT_TEMPLATE_PATH=/app/games/Teyinat ABL_RS_115_116_117_118_119_120.docx
```

Deployment idea:

1. Deploy [server/Dockerfile.teyinat](/C:/Users/nikol/Documents/GitHub/RefereeZone/server/Dockerfile.teyinat) to a Docker-friendly host such as Render, Railway, Fly.io or VPS.
2. Make sure LibreOffice is installed in that container.
3. Set `TEYINAT_ALLOWED_ORIGIN` to your Cloudflare Pages domain.
4. Set `VITE_TEYINAT_API_URL` in Cloudflare Pages to the public URL of that service.
5. Redeploy Cloudflare Pages after changing `VITE_TEYINAT_API_URL`.

## Notes

- Registration works only for e-mails from `allowed_access`.
- The role chosen during registration must match the role added by Instructor in `Add Access`.
- User photos and profile edits are stored in Supabase tables.
- Cloudflare routing is handled by [public/_redirects](/C:/Users/nikol/Documents/GitHub/RefereeZone/public/_redirects), [public/_headers](/C:/Users/nikol/Documents/GitHub/RefereeZone/public/_headers), and [functions/api/[[path]].js](/C:/Users/nikol/Documents/GitHub/RefereeZone/functions/api/[[path]].js).
