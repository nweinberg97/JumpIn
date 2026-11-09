-- Read-only check of the live database after a deploy. Prints no personal
-- data: only which tables exist, whether row-level security is on, and the
-- background job.
\pset footer off

\echo '== Migrations applied'
select version, name from supabase_migrations.schema_migrations order by version;

\echo '== Tables and row-level security (every row should say true)'
select c.relname as table, c.relrowsecurity as rls_on
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

\echo '== Tables WITHOUT row-level security (should be empty)'
select c.relname as table
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

\echo '== Background cleanup job (pg_cron)'
select to_regclass('cron.job') is not null as has_cron \gset
\if :has_cron
select jobname, schedule from cron.job;
\else
\echo 'pg_cron is not enabled: turn it on under Database > Extensions'
\endif

\echo '== Launch settings row exists'
select count(*) as launch_settings_rows from public.launch_settings;

\echo '== Sign-up trigger on auth.users'
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

\echo '== Avatars storage bucket'
select to_regclass('storage.buckets') is not null as has_storage \gset
\if :has_storage
select id, public from storage.buckets where id = 'avatars';
\else
\echo 'no storage schema'
\endif
