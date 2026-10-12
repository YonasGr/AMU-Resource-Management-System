#!/bin/sh
set -e

echo "==> [AMU Store] Production Entrypoint Initializing..."

if [ -z "$DATABASE_URL" ]; then
  echo "==> [AMU Store] ERROR: DATABASE_URL is required."
  exit 1
fi

echo "==> [AMU Store] Applying Prisma database migrations..."
npx prisma migrate deploy

if [ "$AUTO_SEED" = "true" ]; then
  echo "==> [AMU Store] AUTO_SEED is enabled. Seeding initial database records..."
  if [ -f "dist/prisma/seed.js" ]; then
    node dist/prisma/seed.js
  elif [ -f "dist/seed.js" ]; then
    node dist/seed.js
  else
    pnpm prisma:seed
  fi
  echo "==> [AMU Store] Production seed completed successfully."
fi

if [ "$SEED_CATALOG" = "true" ]; then
  echo "==> [AMU Store] SEED_CATALOG is enabled. Seeding catalog master data..."
  if [ -f "dist/prisma/seed-catalog.js" ]; then
    node dist/prisma/seed-catalog.js
  else
    pnpm prisma:seed:catalog
  fi
  echo "==> [AMU Store] Catalog seed completed successfully."
fi

echo "==> [AMU Store] Starting NestJS production application..."
if [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
elif [ -f "dist/main.js" ]; then
  exec node dist/main.js
else
  exec node dist/main
fi
