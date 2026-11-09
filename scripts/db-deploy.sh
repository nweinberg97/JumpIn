#!/usr/bin/env bash
# Applies supabase/migrations to the real Supabase database, once each.
#
# Needs SUPABASE_DB_URL: the project's "Session pooler" connection string,
# with the database password filled in. It lives only in GitHub's encrypted
# Actions secrets (never in the code or a chat).
#
# Applied migrations are recorded in supabase_migrations.schema_migrations,
# the same table the Supabase CLI uses, so `supabase db push` agrees later.
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

applied=0
for file in "$ROOT"/supabase/migrations/*.sql; do
  base="$(basename "$file" .sql)"
  version="${base%%_*}"
  name="${base#*_}"
  done_already="$("${PSQL[@]}" -tA -c "select 1 from supabase_migrations.schema_migrations where version = '$version'")"
  if [ "$done_already" = "1" ]; then
    echo "  already applied: $base"
    continue
  fi
  echo "  applying: $base"
  # One transaction per file: it either fully applies or not at all.
  "${PSQL[@]}" --single-transaction \
    -f "$file" \
    -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name')"
  applied=$((applied + 1))
done
echo "Applied $applied new migration(s)."
