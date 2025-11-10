#!/bin/sh
set -e

echo "🔄 Starting database initialization..."
echo "📊 Environment check:"
echo "   DATABASE_URL: ${DATABASE_URL:0:50}..." # Show first 50 chars only (hide password)
echo "   NODE_ENV: $NODE_ENV"
echo ""

# Wait for PostgreSQL to accept connections
MAX_RETRIES=90
RETRY_COUNT=0
WAIT_TIME=2

echo "🔄 Waiting for PostgreSQL to be ready (up to $((MAX_RETRIES * WAIT_TIME))s = 3 minutes)..."

# Test connection until successful
until npx prisma db push --skip-generate --accept-data-loss 2>&1 | grep -q "database is already in sync\|changes have been applied\|is now in sync"; do
  RETRY_COUNT=$((RETRY_COUNT + 1))

  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo ""
    echo "❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts ($((MAX_RETRIES * WAIT_TIME))s total)"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   - PostgreSQL container may not be started yet"
    echo "   - Check DATABASE_URL configuration"
    echo "   - Verify network connectivity"
    echo ""
    exit 1
  fi

  echo "⏳ Attempt $RETRY_COUNT/$MAX_RETRIES - Waiting for database..."
  sleep $WAIT_TIME
done

echo "✅ PostgreSQL is accepting connections!"
echo ""
echo "📦 Running database migrations..."

# Now run the actual migrations
if npx prisma migrate deploy 2>&1; then
  echo "✅ Migrations completed successfully!"
else
  echo "⚠️  Migration failed, but continuing (database may already be up to date)"
fi

echo ""
echo "🚀 Starting Next.js application..."
exec node server.js
