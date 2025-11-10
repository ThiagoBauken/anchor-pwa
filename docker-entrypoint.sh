#!/bin/sh
# DO NOT exit on error - we want the app to start even if migrations fail
set +e

echo "🔄 Starting application..."
echo "📊 Environment: NODE_ENV=$NODE_ENV"
echo ""

# First, try to resolve any failed migrations
echo "🔍 Resolving any failed migrations..."
./node_modules/.bin/prisma migrate resolve --rolled-back 20250111000001_add_missing_indexes 2>&1 || true

echo ""
echo "🔄 Attempting to run migrations..."
echo ""

# Try to run migrations (maximum 3 attempts)
MAX_RETRIES=3
RETRY_COUNT=0
MIGRATION_SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Migration attempt $RETRY_COUNT/$MAX_RETRIES"

  if ./node_modules/.bin/prisma migrate deploy 2>&1; then
    echo "✅ Migrations completed successfully!"
    MIGRATION_SUCCESS=true
    break
  else
    echo "⚠️  Migration attempt $RETRY_COUNT failed"
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "   Retrying in 2s..."
      sleep 2
    fi
  fi
done

if [ "$MIGRATION_SUCCESS" = false ]; then
  echo ""
  echo "⚠️  WARNING: Migrations failed after $MAX_RETRIES attempts"
  echo "⚠️  Starting application anyway (database may be in inconsistent state)"
  echo "⚠️  Please check migrations manually with: npx prisma migrate status"
  echo ""
fi

echo ""
echo "🚀 Starting Next.js application..."
# Next.js standalone mode creates server.js in current directory
exec node server.js
