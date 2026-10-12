LEARNIX — PROFILE ISOLATION FIX (BROWSER DEMO MODE)

This version does not require a Supabase URL or key. The backend adapter remains optional and is disabled while supabase-config.js contains placeholders.

FIXES
- Student dashboard data is stored under an account-specific localStorage key derived from the signed-in email.
- Student name and email come from the current demo login session instead of a hardcoded Prince Sharma profile.
- Teacher assignments, settings, and profile are also separated by signed-in email.
- The demo auth stores accounts in this browser only.

HOW TO USE
1. Extract the ZIP into a new folder.
2. Open the folder in VS Code.
3. Run with your existing local server (or Live Server).
4. Register/login with each demo account using its own email and password.
5. Log out before switching accounts.

LIMITATIONS
- Demo accounts and data exist only in this browser profile; they do not sync between devices.
- This is not secure production authentication. Do not use real/reused passwords.
- Existing shared demo data is intentionally not imported into each account to prevent showing one user's data to another.
