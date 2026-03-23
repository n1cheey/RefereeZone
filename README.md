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
VITE_TEYINAT_API_URL=https://your-teyinat-service.example.com
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
- `VITE_TEYINAT_API_URL` points the frontend to the separate Word-to-PDF export service.
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
