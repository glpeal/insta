import { dbHelpers } from '../database/db.js';

/**
 * Logger utility for both console and database logging
 */
class Logger {
  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Console logging with colors
    switch (level) {
      case 'error':
        console.error('❌', logMessage, details || '');
        break;
      case 'warning':
        console.warn('⚠️', logMessage, details || '');
        break;
      case 'info':
      default:
        console.log('ℹ️', logMessage, details || '');
        break;
    }

    // Database logging (non-blocking)
    try {
      dbHelpers.addSystemLog(level, message, details ? JSON.stringify(details) : null);
    } catch (error) {
      console.error('Failed to write to system logs:', error.message);
    }
  }

  info(message, details) {
    this.log('info', message, details);
  }

  warning(message, details) {
    this.log('warning', message, details);
  }

  error(message, details) {
    this.log('error', message, details);
  }
}

export const logger = new Logger();
