# RefZone Mobile V2

New mobile application foundation for RefZone aligned with the updated web platform.

## Planned core areas

- Persistent login with app lock
- Biometric unlock and PIN fallback
- Push notifications
- Role-aware home experience
- Nominations, calendar, chat, reports, tests, availability
- Watch companion follow-up phase

## Authentication model

- Supabase session remains signed in
- App is optionally protected with local biometric/PIN unlock
- User can enable or disable biometric unlock from in-app settings later

## Login additions

- Country selector with flag + country name
- Discipline selector
- Language switcher: Azerbaijani, English, Russian

## Initial setup

1. Install dependencies with `npm install`
2. Add `.env` with:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_BASE_URL`
3. Start with `npm run start`
