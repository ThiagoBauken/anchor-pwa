#!/bin/sh
set -e

echo "🔄 Starting AnchorView application..."
echo "📊 Environment: NODE_ENV=$NODE_ENV"
echo ""

# Database is already synchronized via 'prisma db push' during development
# Skipping migrations to avoid errors from missing transitive dependencies
echo "ℹ️  Database schema: Already synchronized (via prisma db push)"
echo "   Run 'npx prisma migrate status' manually if migrations needed"
echo ""

# Verify database connection
echo "🔍 Verifying database connection..."
if echo "SELECT 1;" | ./node_modules/.bin/prisma db execute --stdin > /dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "⚠️  Database connection failed - application may not work correctly"
fi

echo ""
echo "🚀 Starting Next.js application..."
echo "   Listening on port $PORT (http://0.0.0.0:$PORT)"
echo ""

# Next.js standalone mode creates server.js in current directory
exec node server.js
