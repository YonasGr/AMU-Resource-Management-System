#!/bin/sh
set -e

echo "==> [AMU Store] Production Entrypoint Initializing..."

if [ -n "$DATABASE_URL" ]; then
  echo "==> [AMU Store] Applying Prisma database migrations..."
  npx prisma migrate deploy
else
  echo "==> [AMU Store] WARNING: DATABASE_URL is not set!"
fi

if [ "$AUTO_SEED" = "true" ]; then
  echo "==> [AMU Store] AUTO_SEED is enabled. Seeding initial database records..."
  pnpm prisma:seed || echo "==> [AMU Store] Seeding completed or records already existed."
fi

echo "==> [AMU Store] Starting NestJS production application..."
exec node dist/main.js
