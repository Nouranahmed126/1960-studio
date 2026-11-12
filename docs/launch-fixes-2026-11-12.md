# Launch fixes — 12 November 2026

This supersedes the historical build/CI findings in `launch-audit-2026-11-04.md` for this revision. It is not a release authorization.

## Fixed

- Invalid, double-escaped regular expressions in team submission grouping broke TypeScript (`TS1005`) and the Vercel webpack build. Extracted normalization into `lib/assignment-label.ts`, fixed whitespace, extension and duplicate suffix matching, and added regression tests for Arabic, Persian and English assignment numbers.
- Committed an npm lockfile and restored `npm ci` and npm caching in Actions. CI also runs grouping tests and a high-severity dependency audit.
- Overrode Next.js's vulnerable transitive PostCSS dependency with 8.5.32, preserving Next.js 15. Local npm audit reports zero vulnerabilities.
- Fixed two flex alignment compatibility warnings.
- AI review API now requires both the supervisor role and approved status, matching the database supervisor helper.

## Validation

- Clean `npm ci --no-audit --no-fund`: passed.
- `npm test`: three regression tests passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all 25 static pages generated.
- `npm audit --audit-level=high`: zero vulnerabilities.
- Browser smoke test attempted, but local Chromium was blocked by the executor's socket permissions (`Operation not permitted`). Local HTTP probing across execution sessions was also unavailable; no browser or deployed end-to-end pass is claimed.

## Live Supabase inspection (read-only)

Project identity confirmed as 1960-studio. Health advisor returned no findings. `studio-files` is private, with a 50 MiB limit.

Read-only SQL transactions switched to the `authenticated` role and supplied JWT claims for existing accounts. No user records, files or policies were changed.

- Pending student: not a supervisor; zero visible memberships, contributions, attachment records and studio-files objects.
- One approved student: own profile visible; 18 visible membership records; zero visible memberships/contributions/attachments outside accessible teams and zero studio-files objects rejected by the file access helper.

These are limited SQL authorization probes, not sign-in/token verification, upload/download, mutation-denial or exhaustive two-account end-to-end tests. Empty result sets alone do not prove every policy safe.

Remaining security advisor warnings: eight SECURITY DEFINER functions callable by anon, sixteen callable by authenticated (some intentionally needed by guarded RPCs/RLS), and disabled leaked-password protection. Review each function's grants and guards before any blanket revocation. `signup_attempts` has no RLS but client roles currently have no table grants. These findings were not silently changed on the live database.

## Release gates

Confirm remote CI and a Vercel preview on the new commit. Then run real test-account registration/login/logout, pending/rejected denial, team A/B mutation isolation, storage upload/download/direct-request rejection and expiry/cleanup checks. Password-protection configuration and intentional RPC exposure need an explicit security disposition before final sign-off.

PR stays Draft. No merge, production deployment or live SQL migration is authorized by this report.
