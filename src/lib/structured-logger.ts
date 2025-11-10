/**
 * Structured Logger
 *
 * Provides structured, JSON-formatted logging with context support.
 * Can be easily replaced with Pino or Winston in production.
 *
 * Features:
 * - Structured JSON logs
 * - Log levels (debug, info, warn, error)
 * - Contextual information (userId, companyId, requestId)
 * - Performance tracking
 * - Environment-aware (verbose in dev, quiet in prod)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  companyId?: string;
  requestId?: string;
  projectId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
}

class StructuredLogger {
  private static instance: StructuredLogger;
  private isDevelopment: boolean;
  private logLevel: LogLevel;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty print in development
      return JSON.stringify(entry, null, 2);
    }
    // Single line JSON in production
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext, metadata?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        message: error.message,
        name: error.name,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }

    if (metadata) {
      entry.metadata = metadata;
    }

    const formatted = this.formatLog(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log('debug', message, context, metadata);
  }

  info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log('info', message, context, metadata);
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log('warn', message, context, metadata);
  }

  error(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>): void {
    this.log('error', message, context, metadata, error);
  }

  /**
   * Performance tracking helper
   * Returns a function to end the timer and log duration
   */
  time(label: string, context?: LogContext): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, context, { duration });
    };
  }

  /**
   * Async operation tracking
   * Wraps an async function and logs its execution time
   */
  async trackAsync<T>(
    label: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const endTimer = this.time(label, context);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      this.error(`${label} failed`, error as Error, context);
      throw error;
    }
  }
}

// Export singleton instance
export const logger = StructuredLogger.getInstance();

/**
 * Helper to create a logger with default context
 * Useful for server actions and API routes
 */
export function createContextLogger(defaultContext: LogContext) {
  return {
    debug: (message: string, metadata?: Record<string, any>) =>
      logger.debug(message, defaultContext, metadata),
    info: (message: string, metadata?: Record<string, any>) =>
      logger.info(message, defaultContext, metadata),
    warn: (message: string, metadata?: Record<string, any>) =>
      logger.warn(message, defaultContext, metadata),
    error: (message: string, error?: Error, metadata?: Record<string, any>) =>
      logger.error(message, error, defaultContext, metadata),
    time: (label: string) => logger.time(label, defaultContext),
    trackAsync: <T>(label: string, fn: () => Promise<T>) =>
      logger.trackAsync(label, fn, defaultContext),
  };
}

/**
 * Express/Next.js middleware to add requestId to logs
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
