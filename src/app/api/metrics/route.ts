/**
 * Metrics Endpoint
 *
 * Provides application performance metrics for monitoring and observability.
 *
 * ⚠️ SECURITY: This endpoint should be protected in production
 * - Add authentication/authorization
 * - Restrict to internal network only
 * - Use API keys
 *
 * Usage:
 * - Prometheus scraping
 * - Custom monitoring dashboards
 * - Performance analysis
 */

import { NextResponse } from 'next/server';
import { getPerformanceMetrics } from '@/lib/performance-metrics';

export async function GET(request: Request) {
  // ⚠️ TODO: Add authentication in production
  // const authHeader = request.headers.get('authorization');
  // if (!isAuthorized(authHeader)) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const metrics = getPerformanceMetrics();

    // Add system metrics
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
        heapUsagePercent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      },
      environment: process.env.NODE_ENV,
    };

    return NextResponse.json({
      system: systemMetrics,
      performance: metrics,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

/**
 * For Prometheus-compatible format (optional)
 * Uncomment and customize if using Prometheus
 */
/*
export async function GET() {
  const metrics = getPerformanceMetrics();

  // Convert to Prometheus format
  const prometheusMetrics = `
# HELP app_operations_total Total number of operations
# TYPE app_operations_total counter
app_operations_total ${metrics.summary.totalOperations}

# HELP app_operations_success_total Successful operations
# TYPE app_operations_success_total counter
app_operations_success_total ${metrics.summary.successfulOperations}

# HELP app_operations_failed_total Failed operations
# TYPE app_operations_failed_total counter
app_operations_failed_total ${metrics.summary.failedOperations}

# HELP app_operation_duration_avg Average operation duration in ms
# TYPE app_operation_duration_avg gauge
app_operation_duration_avg ${metrics.summary.averageDuration}

# HELP app_error_rate Error rate percentage
# TYPE app_error_rate gauge
app_error_rate ${metrics.summary.errorRate}
`.trim();

  return new Response(prometheusMetrics, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
*/
