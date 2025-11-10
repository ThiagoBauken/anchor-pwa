#!/bin/sh
set -e

echo "🔄 Starting application..."
echo "📊 Environment: NODE_ENV=$NODE_ENV"
echo ""

# Wait for database and run migrations
MAX_RETRIES=60
RETRY_COUNT=0

echo "🔄 Waiting for PostgreSQL and running migrations..."
echo ""

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))

  echo "⏳ Attempt $RETRY_COUNT/$MAX_RETRIES"

  # Try to run migrations - Prisma CLI is available in node_modules
  if ./node_modules/.bin/prisma migrate deploy 2>&1; then
    echo ""
    echo "✅ Database migrations completed successfully!"
    break
  else
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo ""
      echo "❌ Failed to connect after $MAX_RETRIES attempts"
      echo ""
      echo "🔍 Debug info:"
      echo "   DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo "YES" || echo "NO")"
      echo "   Prisma binary exists: $([ -f ./node_modules/.bin/prisma ] && echo "YES" || echo "NO")"
      echo ""
      exit 1
    fi
    echo "   Waiting 2s before retry..."
    sleep 2
  fi
done

echo ""
echo "🚀 Starting Next.js application..."
# Next.js standalone mode creates server.js in current directory
exec node server.js
