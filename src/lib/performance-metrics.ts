/**
 * Performance Metrics System
 *
 * Tracks application performance metrics including:
 * - Operation durations
 * - Error rates
 * - Slow operations
 * - Resource usage
 *
 * In production, these metrics can be sent to monitoring services like:
 * - DataDog
 * - New Relic
 * - Prometheus
 * - CloudWatch
 */

import { logger } from './structured-logger';

export interface PerformanceMetric {
  name: string;
  duration: number; // milliseconds
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  operation: string;
  error: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorMetric[] = [];
  private slowThreshold = 1000; // milliseconds
  private maxMetricsInMemory = 1000;

  private constructor() {
    // Configurar threshold baseado no ambiente
    this.slowThreshold = parseInt(process.env.SLOW_THRESHOLD_MS || '1000');
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Track the duration of an operation
   */
  trackOperation(name: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      success,
      metadata
    };

    // Add to in-memory storage
    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > this.slowThreshold) {
      logger.warn(`Slow operation detected: ${name}`, undefined, {
        duration,
        threshold: this.slowThreshold,
        ...metadata
      });
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to monitoring service (DataDog, New Relic, etc)
      // this.sendToMonitoringService(metric);
    }
  }

  /**
   * Track an error
   */
  trackError(operation: string, error: Error, metadata?: Record<string, any>): void {
    const errorMetric: ErrorMetric = {
      operation,
      error: error.message,
      timestamp: new Date(),
      metadata
    };

    this.errors.push(errorMetric);

    // Keep only last N errors
    if (this.errors.length > this.maxMetricsInMemory) {
      this.errors.shift();
    }

    logger.error(`Operation failed: ${operation}`, error, undefined, metadata);

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, Rollbar, etc)
      // this.sendErrorToTrackingService(errorMetric);
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    slowOperations: number;
    errorRate: number;
  } {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total
      : 0;
    const slow = this.metrics.filter(m => m.duration > this.slowThreshold).length;

    return {
      totalOperations: total,
      successfulOperations: successful,
      failedOperations: failed,
      averageDuration: Math.round(avgDuration),
      slowOperations: slow,
      errorRate: total > 0 ? (failed / total) * 100 : 0
    };
  }

  /**
   * Get slow operations
   */
  getSlowOperations(limit = 10): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration > this.slowThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): ErrorMetric[] {
    return this.errors
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
    this.errors = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Decorator/wrapper to track async function performance
 */
export async function trackPerformance<T>(
  operationName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = Date.now();
  let success = false;

  try {
    const result = await fn();
    success = true;
    return result;
  } catch (error) {
    performanceMonitor.trackError(operationName, error as Error, metadata);
    throw error;
  } finally {
    const duration = Date.now() - start;
    performanceMonitor.trackOperation(operationName, duration, success, metadata);
  }
}

/**
 * React Hook para tracking de performance de components
 */
export function usePerformanceTracking(componentName: string) {
  if (typeof window === 'undefined') return;

  const start = Date.now();

  // Track component mount/unmount
  return () => {
    const duration = Date.now() - start;
    if (duration > 100) { // Track only components that take > 100ms
      performanceMonitor.trackOperation(`Component:${componentName}`, duration, true);
    }
  };
}

/**
 * Get performance metrics for dashboard/monitoring
 */
export function getPerformanceMetrics() {
  return {
    summary: performanceMonitor.getMetricsSummary(),
    slowOperations: performanceMonitor.getSlowOperations(20),
    recentErrors: performanceMonitor.getRecentErrors(20)
  };
}
