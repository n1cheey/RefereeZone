<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5ab9acb1-0006-43be-8ad6-5b5bc876fe7e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Add the e-mails that are allowed to register in `server/data/allowed-emails.seed.json`
4. Run the app and auth server:
   `npm run dev:full`

## Auth and Database

- The auth API runs on `http://localhost:3001`
- User accounts are stored in SQLite in `server/data/auth.sqlite`
- Registration checks a separate `allowed_emails` table before creating a user
- Login uses the `users` table with hashed passwords and the selected role (`Instructor`, `Table`, `Referee`, `Stuff`)
- Each allowed e-mail is now bound to one specific role, so registration fails if the user selects another role
- Instructor can manage allowed access from the UI via `Add Access`, or manually in the seed file using objects like `{ "email": "referee2@abl.com", "role": "Referee" }`
