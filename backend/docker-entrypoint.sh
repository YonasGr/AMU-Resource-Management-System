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
  if [ -f "dist/prisma/seed.js" ]; then
    node dist/prisma/seed.js || echo "==> [AMU Store] Seeding completed or skipped."
  elif [ -f "dist/seed.js" ]; then
    node dist/seed.js || echo "==> [AMU Store] Seeding completed or skipped."
  else
    pnpm prisma:seed || echo "==> [AMU Store] Seeding completed or skipped."
  fi
fi

echo "==> [AMU Store] Starting NestJS production application..."
if [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
elif [ -f "dist/main.js" ]; then
  exec node dist/main.js
else
  exec node dist/main
fi
