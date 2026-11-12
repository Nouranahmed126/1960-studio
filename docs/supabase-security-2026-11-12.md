# Supabase security hardening — 12 November 2026

## Applied live changes

- Removed anonymous execution of eight SECURITY DEFINER functions; removed client execution of the two trigger-only functions. Authenticated RPCs needed by RLS and the application remain available with their existing guards.
- Unified approved-supervisor/member/team checks, restricted the published scoreboard and crew directory to approved accounts, and pinned helper search paths.
- Enabled RLS on backend-only signup_attempts. No client grants or policies are added: only the backend service and its owner-definer rate limiter should access this table.
- Added a restrictive submission policy to prevent authors from writing/reassigning work to teams outside their memberships.
- Added a restrictive attachment policy that ties storage path to the uploader and team/contribution. The forged uploader-path request returned 201 before the fix and 403 / 42501 afterward.
- Added a narrowly scoped DELETE policy for the uploader's unreferenced studio-files objects. Files referenced by saved attachment records remain protected.
- Updated the submission upload flow to attempt orphan cleanup after metadata failure and to distinguish confirmed cleanup from uncertain outcomes.

Migration filenames match the versions recorded by the hosted database. The rollback SQL restores pre-change definitions/grants and removes these policies; it is for an intentional rollback, not routine setup.

## Verification

Three disposable accounts were registered through the live student-signup endpoint and signed in through Supabase Auth. No emails or passwords belonging to existing users were used.

Passed checks include pending defaults, pending scoreboard/membership/write denial, anonymous RPC denial, approved own-team access, cross-team membership denial, denied student approval/role escalation, own-team written submission creation, cross-team read/write/reassignment denial, own-team storage upload/download, denied public and cross-team file access/upload, signed URL download and expiry, denied cross-team deletion, attachment insertion/read isolation, preservation of a saved file during orphan cleanup, and successful orphan removal.

The first signed URL test used an expiry too short for the network round trip; the download/expiry checks passed with a 30-second URL. A test fixture initially violated the 20-character body constraint; subsequent write-denial checks used valid bodies and asserted the RLS error code 42501.

Local checks: six regression tests, TypeScript and Next.js production build passed.

## Remaining scope and disposition

- Cleanup of the three disposable accounts and their remaining test records/file requires the additional destructive-action confirmation requested by the Supabase tool. Cleanup is not yet claimed complete.
- Browser UI tests, a real supervisor password sign-in, and an actual oversized upload are not claimed. Supervisor approval was exercised through an authenticated SQL role with the existing supervisor identity.
- Fourteen authenticated SECURITY DEFINER execution advisories remain: intentional RLS lookup helpers and guarded RPCs, not anonymous endpoints. is_supervisor/is_my_team and the studio helpers check current approved profiles; approve_student/set_crew_visibility/update_assignment_admin require the approved supervisor; request_my_teams only permits the caller's pending account; personal feedback/awards filter by caller ID; crew and published scoreboard require approval. The scoreboard intentionally shares published progress among approved members, unlike private team submissions/files.
- signup_attempts with RLS and no client policy is intentional backend-only isolation.
- Leaked-password protection remains disabled. Supabase documents it as a Pro-or-higher feature; no subscription or paid-plan change was made. https://supabase.com/docs/guides/auth/password-security

The reusable live smoke script requires explicit paths to disposable QA state and public connection settings. Never commit its credential/state files or run it against ordinary user accounts.
