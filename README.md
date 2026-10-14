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
