/**
 * Conditional Logger
 *
 * Only logs in development mode
 * In production, logs are suppressed for performance and security
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  error: (...args: any[]) => {
    // Always log errors even in production
    console.error(...args)
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  // Special method for critical system events (always logged)
  system: (...args: any[]) => {
    console.log('[SYSTEM]', ...args)
  }
}

export default logger
