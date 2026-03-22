# ABL RefZone

React/Vite frontend with Netlify Functions and Supabase for:

- auth and role-based registration
- nominations and referee responses
- reports with `Draft / Submitted / Reviewed`
- rankings
- instructor admin tools

## Supabase setup

1. Open Supabase SQL Editor
2. Run [supabase/schema.sql](/Users/nikol/Downloads/ABL/supabase/schema.sql)
3. In `Authentication -> Users`, there is nothing else to create manually

## Environment variables

Create `.env.local` for local work:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

For Netlify add the same variables in `Site configuration -> Environment variables`.

Important:

- `VITE_SUPABASE_PUBLISHABLE_KEY` is safe for the browser
- `SUPABASE_SERVICE_ROLE_KEY` must be added only to the server environment

## Local run

For the Supabase version use Netlify local dev, because `/api/*` is served by Netlify Functions:

```powershell
npm install
netlify dev
```

If the `netlify` command is not installed:

```powershell
npm install -g netlify-cli
```

Then open [http://localhost:8888](http://localhost:8888).

## Netlify deploy

1. Push the project to GitHub
2. In Netlify choose `Add new project -> Import from Git`
3. Build settings are already in [netlify.toml](/Users/nikol/Downloads/ABL/netlify.toml)
4. Add env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
5. Deploy

## Notes

- Registration works only for e-mails from `allowed_access`
- The role chosen during registration must match the role added by Instructor in `Add Access`
- User photos and profile edits are stored in Supabase tables
- The old local `server/` folder is no longer needed for Netlify deploys, but it is left in the repo as the previous local backend
