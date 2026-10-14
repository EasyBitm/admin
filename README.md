# easyBITM Admin

Separate admin app for managing semester visibility and subjects.

1. Copy `.env.example` to `.env.local` and add the same Supabase public values used by the student app.
2. Run `npm install`.
3. Run `npm run dev`.

## Admin login

Every page requires signing in with a Supabase email/password account that is listed in `public.admins`.
Writes are enforced by RLS (`bitm-app/supabase/migrations/20261014000000_admin_auth.sql`), not just the UI.

1. Apply the migration above to the Supabase project.
2. Create the user in Supabase → Authentication → Users (tick "Auto Confirm User").
3. Grant admin access in the SQL editor:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'admin@example.com';
   ```

## Formatted syllabus (Gemini)

When a Syllabus (PDF) resource is added on a subject page, the admin sends it to Gemini, shows the extracted
description, objectives, units and references for review, and saves them to `subjects.syllabus_content`.
The site then shows that formatted syllabus instead of the embedded PDF.

1. Apply `bitm-app/supabase/migrations/20261014000001_add_syllabus_content.sql`.
2. Create a free API key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY` (server-only, no `NEXT_PUBLIC_`)
   in `.env.local` and in the admin's Vercel project.
3. Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`). Free-tier limits are shown in AI Studio.

The extraction endpoint only works for signed-in admins (it checks `public.is_admin()`).
