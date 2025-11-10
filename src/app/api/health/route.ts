/**
 * Health Check Endpoint
 *
 * Used by load balancers, monitoring services, and orchestrators
 * to verify the application is running and healthy.
 *
 * Returns:
 * - 200 OK: Application is healthy
 * - 503 Service Unavailable: Application has critical issues
 *
 * Usage:
 * - Kubernetes liveness/readiness probes
 * - AWS ELB health checks
 * - Monitoring services (DataDog, New Relic)
 */

import { NextResponse } from 'next/server';
import { prisma, isDatabaseAvailable } from '@/lib/prisma';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {
      database: 'unknown',
      memory: 'unknown',
    } as Record<string, string>,
  };

  let isHealthy = true;

  // Check database connection
  try {
    const dbHealthy = await isDatabaseAvailable();
    checks.checks.database = dbHealthy ? 'healthy' : 'unhealthy';
    if (!dbHealthy) isHealthy = false;
  } catch (error) {
    checks.checks.database = 'error';
    isHealthy = false;
  }

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.checks.memory = memUsagePercent > 90 ? 'critical' : 'healthy';

    if (memUsagePercent > 90) {
      isHealthy = false;
    }
  } catch (error) {
    checks.checks.memory = 'error';
  }

  checks.status = isHealthy ? 'healthy' : 'unhealthy';

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
  });
}
