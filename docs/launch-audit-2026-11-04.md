# 1960 Studio — Launch readiness review (2026-11-04)

**Decision: DO NOT SHARE WITH STUDENTS. This is not a production security sign-off.**

## Verified via connected GitHub
- Repository: Nouranahmed126/1960-studio, main, public.
- GitHub Actions run #12 (41818968791) failed at actions/setup-node because the repository has no npm dependency lockfile. It never reached npm install, TypeScript or Next.js build.
- The repository contains Next.js pages for registration, login/logout, dashboard, assignments, contributions and file handling.
- The repository contains `supabase/team-approval.sql`, `supabase/attachments.sql`, and `supabase/check-setup.sql`.
- The base schema/migration for profiles, teams, team_members, team_join_requests, assignments, assignment_teams, contributions and the helper functions is NOT committed in this repository.
- `.env.example` declares only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` and does not contain values.
- No `package-lock.json` or `.gitignore` existed on main as checked.
- The existing scripts assume Supabase tables/RLS already exist. Code inspection cannot establish actual Supabase permissions.

## Changes proposed in this PR (NOT released)
- Add `.gitignore` so local secret files cannot be added accidentally by normal git add. This does not remove any already committed secrets or rotate credentials.
- Temporarily remove npm caching and use `npm install` to restore a runnable CI build, plus explicit `tsc --noEmit` check. This is **not a substitute for committing a reviewed package-lock.json**; dependency resolution remains non-reproducible until a lockfile is added.
- Add `supabase/security-audit-readonly.sql` for inspecting schema, RLS, all policies, RPC privileges, table grants and private bucket settings. SQL is read-only and needs to be executed by an authorized operator in Supabase.

## Manual review and blockers before release
1. Connect access to Supabase project **1960-studio**, inspect actual existing schema, functions, auth settings, RLS and storage policies. Back up the existing schema/data before any migrations. Compare `team-approval.sql` and `attachments.sql` against the live environment; these scripts use `CREATE OR REPLACE FUNCTION`, `DROP POLICY`, and changes to bucket configuration. Do **not** run blindly.
2. Ensure no broad anonymous or authenticated policy grants cross-team access. RLS policies combine permissively; checking only the named policies in `attachments.sql` is insufficient.
3. Verify `is_supervisor()` and `is_my_team(team_id)` are implemented correctly, including role escalation and pending memberships.
4. Protect attachments against orphaned uploads (file stored but attachment metadata insert failed); test cleanup/rollback strategy. Check upload, download, signed URL expiration, oversized files and unauthorized direct storage requests.
5. Test authentication with isolated accounts (pending student, approved student in team A, approved student in team B, supervisor) and confirm the server refuses cross-team and unauthorized requests even when API calls are made directly. UI restrictions alone do not prove authorization.
6. Verify assignments and contributions cannot be created, edited, listed or deleted by unauthorized users; verify team assignment scoping and supervisor actions.
7. Configure the two NEXT_PUBLIC Supabase values as deployment environment variables. `NEXT_PUBLIC_*` values are exposed to browser code; **never** place a `service_role` key, database password or other secret under that prefix.
8. Produce and commit `package-lock.json` with trusted tooling, review it and then restore `npm ci` and npm caching for reproducible builds.
9. Only after CI checks and live Supabase tests pass, connect Vercel, create a protected preview deployment, test the deployed preview (auth, RLS, storage, navigation), then promote to production.
10. Validate production URL with real test accounts and test negative authorization cases. Do not send URL to students until sign-off.

## Test record as of 2026-11-04
| Test | Status | Evidence |
|---|---|---|
| GitHub repository accessible | PASS | Connected GitHub get_repo/fetch |
| Public client configuration template present | PASS | .env.example, no values |
| Previous main CI build | FAIL | Actions #12: missing dependency lockfile |
| This PR's CI build | NOT YET VERIFIED | Check PR Actions |
| Supabase live schema and data | NOT TESTED | No confirmed Supabase connection |
| Account registration and confirmation | NOT TESTED | Live auth connection required |
| Login/logout | NOT TESTED | Live auth connection required |
| Pending/approved and cross-team RLS | NOT TESTED | Multiple authenticated test roles required |
| File upload/read and storage isolation | NOT TESTED | Live private bucket and test roles required |
| Vercel deployment and production smoke tests | NOT TESTED | No confirmed Vercel connection |

No SQL was applied, data was not changed, and no deployment was performed as part of this review.
