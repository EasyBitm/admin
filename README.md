# easyBITM Admin

Separate admin app for managing semester visibility and subjects.

1. Copy `.env.example` to `.env.local` and add the same Supabase public values used by the student app.
2. Run `npm install`.
3. Run `npm run dev`.

This app is intentionally separate from the student app. Authentication and database RLS should be configured in Supabase before exposing it publicly.
