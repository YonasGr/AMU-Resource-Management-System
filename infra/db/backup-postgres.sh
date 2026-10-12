#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIR/amu-${timestamp}.dump"

umask 077
pg_dump "$DATABASE_URL" --format=custom --file="$output"
printf '%s\n' "$output"
