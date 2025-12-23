/**
 * Logger Library
 * 
 * A comprehensive logging utility with:
 * - Tag-based categorization
 * - Structured data support
 * - Environment-aware behavior (dev/prod)
 * - Multiple log levels
 * - Formatting and metadata
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
  timestamp: string;
  environment: 'development' | 'production';
}

export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Enable console output */
  enableConsole: boolean;
  /** Enable timestamps */
  enableTimestamps: boolean;
  /** Pretty print in development */
  prettyPrint: boolean;
  /** Custom log handler */
  customHandler?: (entry: LogEntry) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableTimestamps: true,
  prettyPrint: process.env.NODE_ENV !== 'production',
  customHandler: undefined,
};

/**
 * Logger class for structured, environment-aware logging
 */
export class Logger {
  private config: LoggerConfig;
  private environment: 'development' | 'production';

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Format log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const timestamp = this.config.enableTimestamps ? `[${entry.timestamp}] ` : '';
    const tag = `[${entry.tag}]`;
    const level = entry.level.toUpperCase();

    if (this.config.prettyPrint) {
      // Development: colorful, detailed output
      const colors: Record<LogLevel, string> = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[34m',  // Blue
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m', // Red
        fatal: '\x1b[35m', // Magenta
      };
      const reset = '\x1b[0m';
      const color = colors[entry.level];

      let output = `${color}${timestamp}${level}${reset} ${tag} ${entry.message}`;

      if (entry.data !== undefined) {
        output += `\n${color}Data:${reset} ${JSON.stringify(entry.data, null, 2)}`;
      }

      return output;
    } else {
      // Production: compact JSON output
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        tag: entry.tag,
        message: entry.message,
        ...(entry.data !== undefined && { data: entry.data }),
        environment: entry.environment,
      });
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, tag: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      tag,
      message,
      data,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    // Console output
    if (this.config.enableConsole) {
      const formatted = this.formatForConsole(entry);

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
        case 'fatal':
          console.error(formatted);
          break;
      }
    }

    // Custom handler
    if (this.config.customHandler) {
      this.config.customHandler(entry);
    }
  }

  /**
   * Log debug message (development only by default)
   */
  debug(tag: string, message: string, data?: unknown): void {
    this.log('debug', tag, message, data);
  }

  /**
   * Log info message
   */
  info(tag: string, message: string, data?: unknown): void {
    this.log('info', tag, message, data);
  }

  /**
   * Log warning message
   */
  warn(tag: string, message: string, data?: unknown): void {
    this.log('warn', tag, message, data);
  }

  /**
   * Log error message
   */
  error(tag: string, message: string, data?: unknown): void {
    this.log('error', tag, message, data);
  }

  /**
   * Log fatal error message
   */
  fatal(tag: string, message: string, data?: unknown): void {
    this.log('fatal', tag, message, data);
  }

  /**
   * Create a scoped logger with a fixed tag
   */
  scope(tag: string): ScopedLogger {
    return new ScopedLogger(this, tag);
  }
}

/**
 * Scoped logger with a fixed tag
 */
export class ScopedLogger {
  constructor(
    private logger: Logger,
    private tag: string
  ) { }

  debug(message: string, data?: unknown): void {
    this.logger.debug(this.tag, message, data);
  }

  info(message: string, data?: unknown): void {
    this.logger.info(this.tag, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(this.tag, message, data);
  }

  error(message: string, data?: unknown): void {
    this.logger.error(this.tag, message, data);
  }

  fatal(message: string, data?: unknown): void {
    this.logger.fatal(this.tag, message, data);
  }
}

// Singleton instance
const defaultLogger = new Logger();

/**
 * Get the default logger instance
 */
export function getLogger(): Logger {
  return defaultLogger;
}

/**
 * Create a scoped logger with a fixed tag
 */
export function createLogger(tag: string): ScopedLogger {
  return defaultLogger.scope(tag);
}

// Convenience exports
export const logger = defaultLogger;
export default logger;
