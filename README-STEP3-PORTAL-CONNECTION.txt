LEARNIX STEP 3 — CONNECT STUDENT AND TEACHER PORTALS
===================================================

WHAT THIS UPDATE CONNECTS (when Supabase is configured)
- Student and teacher accounts use the same Supabase Auth project.
- Teacher can create a course in the shared database from My classes.
- Teacher can enrol a registered student by email into a course.
- Teacher can publish an assignment to a selected database course.
- Student sees assignments published to courses in which they are enrolled.
- Student's My courses view shows their live enrolled courses.
- Momentum/check-in API methods are available in backend-client.js for the next UI integration pass.
- Database Row Level Security still limits which rows each role can read or change.

IMPORTANT: This project cannot be live-connected until you add your own Supabase URL/key.

SETUP
1. Open supabase-config.js and replace the placeholder URL and anon/publishable key.
2. Open Supabase > SQL Editor.
3. Run the full supabase-schema.sql from this ZIP. If you already ran the previous schema, run it again so the new learnix_enroll_student function is created. Existing tables are guarded with IF NOT EXISTS and policies may already exist; if Supabase reports that a policy already exists, keep the existing policy and run the new function block at the end separately.
4. In Supabase Auth URL Configuration, add your Live Server URL (for example http://127.0.0.1:5500/**) and deployed site URL.
5. Open index.html through VS Code Live Server.
6. Create a teacher account and a separate student account.
7. Sign in as the teacher. Open My classes > Add course to shared workspace.
8. Use Enrol student by email and enter the student's registered Learnix email. If you have multiple courses, enter the exact course title when prompted.
9. Open Assignments and create an assignment for that course.
10. Sign in as the enrolled student and open My courses or Assignments. Refresh if the portal was already open.

IMPORTANT SECURITY / DATA NOTES
- Never put a Supabase service_role key in browser code. Only use the public anon/publishable key.
- This is a frontend prototype. Do not use real sensitive student records until policies have been reviewed and tested with separate accounts.
- Existing unrelated dashboard sections (sample marks, analytics, demo student directory, attendance screen and some settings) may still show demo/localStorage data. This update specifically connects course creation/enrolment and assignments across student/teacher portals.
- A shared database does not mean every feature is migrated. Marks, attendance, submissions/grading, profiles/photos and AI insights still need their own integration pass.
- If SQL setup reports duplicate policies when rerunning the entire schema, do not delete tables. Run only the new learnix_enroll_student function block from the end of supabase-schema.sql; keep existing policies intact.
