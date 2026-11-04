-- 1960 STUDIO: READ-ONLY SECURITY AUDIT
-- This file does not change data, policies, roles, tables or storage.
-- Run in the 1960-studio Supabase SQL Editor and review every result.
-- A passing metadata audit alone does NOT prove that RLS is safe.
BEGIN READ ONLY;

-- 1. Expected application tables must exist and have RLS enabled.
WITH expected(name) AS (
  VALUES ('profiles'),('teams'),('team_members'),('team_join_requests'),
         ('assignments'),('assignment_teams'),('contributions'),('attachments')
)
SELECT e.name AS table_name,
       to_regclass(format('public.%I', e.name)) IS NOT NULL AS exists,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM expected e
LEFT JOIN pg_class c ON c.oid = to_regclass(format('public.%I', e.name))
ORDER BY e.name;

-- 2. Inspect ALL policies, including permissive policies that may widen access.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname='public' AND tablename IN
       ('profiles','teams','team_members','team_join_requests',
        'assignments','assignment_teams','contributions','attachments'))
   OR (schemaname='storage' AND tablename='objects')
ORDER BY schemaname,tablename,policyname;

-- 3. Check that sensitive RPC definitions exist; inspect execution roles.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('request_my_teams','approve_student','is_supervisor',
                   'is_my_team','validate_studio_attachment')
ORDER BY p.proname;

-- 4. Confirm private bucket and upload constraints.
SELECT id,name,public,file_size_limit,allowed_mime_types
FROM storage.buckets
WHERE id='studio-files';

-- 5. Identify table-level grants for client roles (RLS still controls rows).
SELECT table_name,grantee,privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('profiles','teams','team_members','team_join_requests',
                     'assignments','assignment_teams','contributions','attachments')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name,grantee,privilege_type;

COMMIT;
