#!/usr/bin/env bash
# Apply Town Therapy schema + seed to a Supabase Postgres database.
# Usage:
#   export DATABASE_URL='postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres'
#   ./scripts/apply-supabase-schema.sh
#
# Get DATABASE_URL from: Supabase Dashboard → Project Settings → Database → Connection string (URI)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL first (Dashboard → Settings → Database → URI)."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install Postgres client tools, or paste supabase/schema.sql + seed.sql in the SQL Editor."
  exit 1
fi

echo "Applying schema.sql…"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/schema.sql"
echo "Applying sticky-notes.sql…"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/sticky-notes.sql"
echo "Applying seed.sql…"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed.sql"
echo "Done."
