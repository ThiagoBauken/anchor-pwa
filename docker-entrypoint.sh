#!/bin/sh
set -e

echo "🔄 Starting database initialization..."
echo "📊 Environment check:"
echo "   DATABASE_URL: ${DATABASE_URL:0:50}..." # Show first 50 chars only (hide password)
echo "   NODE_ENV: $NODE_ENV"
echo ""

# Wait for PostgreSQL with better diagnostics
MAX_RETRIES=60
RETRY_COUNT=0
WAIT_TIME=3

echo "🔄 Waiting for PostgreSQL to be ready (up to $((MAX_RETRIES * WAIT_TIME))s)..."

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))

  echo "⏳ Attempt $RETRY_COUNT/$MAX_RETRIES - Testing database connection..."

  # Try to connect and show actual error
  if npx prisma migrate deploy 2>&1; then
    echo "✅ PostgreSQL is ready!"
    echo "✅ Migrations completed successfully!"
    break
  else
    echo "⚠️  Connection failed. Waiting ${WAIT_TIME}s before retry..."

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo ""
      echo "❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts ($((MAX_RETRIES * WAIT_TIME))s total)"
      echo ""
      echo "🔍 Troubleshooting steps:"
      echo "   1. Check if PostgreSQL server is running"
      echo "   2. Verify DATABASE_URL is correct"
      echo "   3. Check network connectivity between containers"
      echo "   4. Verify database credentials"
      echo ""
      exit 1
    fi

    sleep $WAIT_TIME
  fi
done

echo ""
echo "🚀 Starting Next.js application..."
exec node server.js
