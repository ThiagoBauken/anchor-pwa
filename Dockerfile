# Install dependencies only when needed
FROM node:20-alpine3.19 AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files and prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install dependencies (skip postinstall to avoid migration during build)
RUN npm ci --ignore-scripts

# Generate Prisma Client manually (without running migrations)
RUN npx prisma generate

# Rebuild the source code only when needed
FROM node:20-alpine3.19 AS builder
WORKDIR /app

# Copy dependencies from deps stage (includes Prisma Client)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PHASE=phase-production-build
ENV SKIP_ENV_VALIDATION=1
# Set dummy NEXTAUTH_SECRET for build (will be overridden at runtime)
ENV NEXTAUTH_SECRET=dummy_build_secret_replace_at_runtime
RUN npm run build

# Production image, copy all the files and run next
FROM node:20-alpine3.19 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder with ownership set during copy (much faster than chown -R)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy ALL node_modules for Prisma to work (includes all transitive dependencies)
# This is more robust than copying module by module
# Using --chown during copy is 10x faster than chown -R afterwards
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy entrypoint script for database migrations
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 9002

ENV PORT=9002
ENV HOSTNAME="0.0.0.0"

# Start the application with migration script
CMD ["./docker-entrypoint.sh"]
