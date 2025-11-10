#!/bin/sh
set -e

echo "🔄 Waiting for PostgreSQL to be ready..."

# Simple wait with retries
MAX_RETRIES=30
RETRY_COUNT=0

until npx prisma migrate deploy 2>/dev/null || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ PostgreSQL not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES), waiting..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts"
  exit 1
fi

echo "✅ PostgreSQL is ready"
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

echo "🚀 Starting Next.js application..."
exec node server.js
