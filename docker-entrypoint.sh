#!/bin/sh
set -e

# Ensure the application user can write to the persistent data directory
mkdir -p /app/data
chown -R app:app /app/data

# Default database path if none is provided
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/chatbi.db"
fi

# Run Prisma migrations if Prisma CLI is available; fall back to db push when migrations are missing
if command -v pnpm >/dev/null 2>&1 && [ -d "/app/prisma" ]; then
  export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
  echo "Applying Prisma migrations (if any)..."
  if pnpm prisma migrate deploy 2>/tmp/prisma-migrate.log; then
    echo "Prisma migrations applied."
  else
    echo "Prisma migrate deploy failed; attempting prisma db push..."
    cat /tmp/prisma-migrate.log || true
    pnpm prisma db push --skip-generate
  fi
fi

exec su-exec app:app "$@"
