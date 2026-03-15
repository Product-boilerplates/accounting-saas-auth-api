#!/bin/sh
set -e

echo "=== Loading environment variables ==="
# Load environment variables from .env.production if Docker env vars aren't set
if [ -z "$DATABASE_URL" ] && [ -f .env.production ]; then
    echo "Loading from .env.production..."
    export $(cat .env.production | grep -v '^#' | xargs)
fi

echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'YES' || echo 'NO')"
echo "NODE_ENV: $NODE_ENV"

echo "Verifying database connection and migrations..."
tsx run-migrations.js

echo "Seeding database..."
tsx prisma/seed.ts

echo "Starting application..."
pnpm start
