#!/usr/bin/env bash
# R6 round-trip evidence against a running local Supabase database:
#
#   real tenant state -> export_user_archive() -> parsed JSON -> R5 validator
#
# The archive is piped straight from psql into the validator. Nothing reshapes it
# in between, so a producer that only validates after a fix-up cannot pass.
#
# Requires `supabase db start` (and a `db reset`) to have run first.
set -euo pipefail

DB_URL="${ARCHIVE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
OUT_DIR="${ARCHIVE_OUT_DIR:-.tmp}"
OUT_FILE="${OUT_DIR}/archive-producer.json"

mkdir -p "${OUT_DIR}"

# -t -A -q so stdout carries only the final SELECT: the archive JSON itself.
# ON_ERROR_STOP makes a broken fixture fail loudly instead of emitting nothing.
psql "${DB_URL}" \
  --no-psqlrc -t -A -q \
  -v ON_ERROR_STOP=1 \
  -f supabase/tests/archive/export_archive_fixture.sql \
  > "${OUT_FILE}"

node --experimental-strip-types scripts/verify-archive-producer.mjs "${OUT_FILE}"
