#!/usr/bin/env bash
set -euo pipefail

pg_bin() {
  local v
  v="$(ls -1 /usr/lib/postgresql 2>/dev/null | head -1)"
  echo "/usr/lib/postgresql/${v}/bin"
}

PG_BIN="$(pg_bin)"
export PATH="${PG_BIN}:${PATH}"

export PGDATA="${PGDATA:-/var/lib/postgresql/data}"
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
export POSTGRES_DB="${POSTGRES_DB:-gutenberg}"

mkdir -p /var/run/postgresql
chown postgres:postgres /var/run/postgresql
mkdir -p "$PGDATA"
chown -R postgres:postgres "$PGDATA"

if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
  runuser -u postgres -- "$PG_BIN/initdb" -D "$PGDATA" --encoding=UTF8 --locale=C.UTF-8
  echo "listen_addresses = '127.0.0.1'" >>"$PGDATA/postgresql.conf"
  echo "unix_socket_directories = '/var/run/postgresql'" >>"$PGDATA/postgresql.conf"
  echo "host all all 127.0.0.1/32 trust" >>"$PGDATA/pg_hba.conf"
fi

runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$PGDATA" -l /tmp/postgres.log -w start

until runuser -u postgres -- "$PG_BIN/pg_isready" -h 127.0.0.1 -p 5432 -U "$POSTGRES_USER"; do
  sleep 0.3
done

if ! runuser -u postgres -- "$PG_BIN/psql" -h 127.0.0.1 -U "$POSTGRES_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'" | grep -q 1; then
  runuser -u postgres -- "$PG_BIN/createdb" -h 127.0.0.1 -U "$POSTGRES_USER" "$POSTGRES_DB"
fi

export GUTENBERG_INDEXER_DATABASE_URL="${GUTENBERG_INDEXER_DATABASE_URL:-postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}}"

cd /app-migrate/apps/indexer
pnpm exec drizzle-kit migrate

cd /app
export NODE_ENV=production
node dist/src/main.js &
INDEXER_PID=$!

cleanup() {
  kill "$INDEXER_PID" 2>/dev/null || true
  kill "${NGINX_PID:-}" 2>/dev/null || true
  runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$PGDATA" -m fast stop || true
}
trap cleanup SIGTERM SIGINT EXIT

nginx -g "daemon off;" &
NGINX_PID=$!
wait "$NGINX_PID"
