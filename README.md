# ABL RefZone

React/Vite frontend with Cloudflare Pages Functions and Supabase for:

- auth and role-based registration
- nominations and referee responses
- reports with `Draft / Submitted / Reviewed`
- rankings
- instructor admin tools

## Supabase setup

1. Open Supabase SQL Editor.
2. Run [supabase/schema.sql](/C:/Users/nikol/Documents/GitHub/RefereeZone/supabase/schema.sql).
3. In `Authentication -> Users`, there is nothing else to create manually.

## Environment variables

Create `.env.local` for local build-time work:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

For Cloudflare Pages add these project variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

Important:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are browser-safe build variables.
- `SUPABASE_SERVICE_ROLE_KEY` must be stored as a server secret.
- `SUPABASE_URL` is used by Pages Functions at runtime.

## Local run

Frontend only:

```powershell
npm install
npm run dev
```

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
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
7. Redeploy after saving variables.

Recommended split:

- Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` as Variables.
- Add `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` as Secrets.

## Notes

- Registration works only for e-mails from `allowed_access`.
- The role chosen during registration must match the role added by Instructor in `Add Access`.
- User photos and profile edits are stored in Supabase tables.
- Cloudflare routing is handled by [public/_redirects](/C:/Users/nikol/Documents/GitHub/RefereeZone/public/_redirects), [public/_headers](/C:/Users/nikol/Documents/GitHub/RefereeZone/public/_headers), and [functions/api/[[path]].js](/C:/Users/nikol/Documents/GitHub/RefereeZone/functions/api/[[path]].js).
