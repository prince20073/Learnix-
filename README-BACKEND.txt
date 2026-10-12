LEARNIX BACKEND SETUP (SUPABASE)
================================

WHAT IS INCLUDED
- supabase-schema.sql: database tables, indexes, profile creation trigger and row-level security policies.
- supabase-config.js: public project URL and anon-key placeholders.
- backend-client.js: Supabase auth/database adapter.
- Login/signup uses Supabase when configured; otherwise it stays in browser-demo mode.
- Existing HTML/CSS/JS portals and logo are preserved.

IMPORTANT
This ZIP is backend-ready, but it is NOT connected to a live Supabase project yet. You must create the project and add your own project URL/key. Never put a Supabase service_role key in frontend code.

SETUP STEPS
1. Go to https://supabase.com and create a project.
2. In Project Settings > API, copy the Project URL and the public anon/publishable key.
3. Open supabase-config.js and replace:
   https://YOUR-PROJECT-ID.supabase.co
   YOUR_SUPABASE_ANON_KEY
   with your own Project URL and public anon key.
4. In Supabase Dashboard > SQL Editor, open supabase-schema.sql, paste its contents and run it.
5. In Authentication > URL Configuration, set the Site URL to your local development origin or deployed site URL. Add your local and deployed URLs to Redirect URLs.
6. For easier local testing, run the project through VS Code Live Server (do not open index.html directly as a file). Example: http://127.0.0.1:5500/index.html
7. Create a new test student account and test sign-in. Then test a teacher account using a different email. If email confirmation is enabled, confirm the email before signing in.

DATABASE TABLES
- profiles: student/teacher profile data linked to Supabase Auth.
- courses and course_memberships: classes and enrolments.
- assignments and submissions: assignment lifecycle.
- attendance_records: attendance by class/date.
- study_sessions and student_checkins: study planner and Momentum Radar data.

SECURITY NOTES
- Row Level Security (RLS) is enabled in the SQL schema.
- Public signup allows student/teacher roles only. Admin accounts must be provisioned manually by a trusted project owner after creating the user.
- Do not store plaintext passwords in localStorage. Supabase Auth manages passwords in backend auth storage.
- The existing dashboards still contain demo/localStorage data and are not yet fully migrated to the database. This step wires real signup/sign-in and provides the database foundation; next, migrate course, assignment, attendance, marks and profile screens to read/write Supabase data.
- Before production, review SQL policies with a security-minded reviewer, configure email confirmation/password recovery, test RLS using separate student and teacher accounts, and add file storage policies if profile-photo uploads are moved to cloud storage.

CURRENT LIMITATION
The code only switches to real backend authentication after valid Supabase credentials are configured. Until then it deliberately keeps the existing browser-only demo behavior. A live backend cannot be provisioned from this ZIP alone; the Supabase project must be created under your account.
