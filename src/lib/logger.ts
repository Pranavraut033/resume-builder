/* eslint-disable no-console */
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

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
  timestamp: string;
  environment: "development" | "production";
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

// Capture original console methods before any framework (e.g. Next.js dev overlay)
// has a chance to monkey-patch them. Using these references avoids the overlay
// intercepting logger.error calls and misreporting the call site.
const _console = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
} as const;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
  enableConsole: true,
  enableTimestamps: true,
  prettyPrint: process.env.NODE_ENV !== "production",
  customHandler: undefined,
};

// The built desktop app has no attached console, so client-side logs are
// mirrored to $APPDATA/logs/client.log for post-install debugging (see
// docs/DEBUGGING.md). Duplicated from keyStorage.ts's isTauriContext to
// avoid a circular import (keyStorage.ts imports this module for its own
// logger).
function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const internals = (window as unknown as { __TAURI_INTERNALS__?: unknown })
    .__TAURI_INTERNALS__;
  return typeof internals === "object" && internals !== null;
}

const LOG_FILE = "logs/client.log";
// ponytail: no rotation/size cap — delete the file by hand if it grows large
let fileWriteQueue: Promise<void> = Promise.resolve();

function appendToLogFile(entry: LogEntry): void {
  if (!isTauriRuntime()) return;

  const line =
    JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      tag: entry.tag,
      message: entry.message,
      ...(entry.data !== undefined && { data: entry.data }),
    }) + "\n";

  fileWriteQueue = fileWriteQueue
    .then(async () => {
      const { mkdir, writeTextFile, BaseDirectory } = await import(
        "@tauri-apps/plugin-fs"
      );
      await mkdir("logs", {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      }).catch(() => {});
      await writeTextFile(LOG_FILE, line, {
        baseDir: BaseDirectory.AppData,
        append: true,
      });
    })
    .catch((error) => {
      // Use the raw console to avoid recursing back into the logger.
      _console.warn("Failed to write log file", error);
    });
}

/**
 * Logger class for structured, environment-aware logging
 */
export class Logger {
  private config: LoggerConfig;
  private environment: "development" | "production";

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.environment =
      process.env.NODE_ENV === "production" ? "production" : "development";
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

  /** Map each log level to the appropriate native console method */
  private static readonly CONSOLE_METHODS: Record<
    LogLevel,
    "debug" | "info" | "warn" | "error"
  > = {
    debug: "debug",
    info: "info",
    warn: "warn",
    error: "error",
    fatal: "error",
  };

  /** CSS styles used when running in a browser context */
  private static readonly BROWSER_STYLES: Record<LogLevel, string> = {
    debug: "color:#06b6d4;font-weight:bold",
    info: "color:#3b82f6;font-weight:bold",
    warn: "color:#f59e0b;font-weight:bold",
    error: "color:#ef4444;font-weight:bold",
    fatal: "color:#a855f7;font-weight:bold",
  };

  /** ANSI colour codes used in Node / Tauri backend context */
  private static readonly ANSI_COLORS: Record<LogLevel, string> = {
    debug: "\x1b[36m",
    info: "\x1b[34m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
    fatal: "\x1b[35m",
  };

  /**
   * Write a log entry to the console using the correct method and formatting
   * for the current runtime (browser vs Node.js).
   */
  private writeToConsole(entry: LogEntry): void {
    const method = Logger.CONSOLE_METHODS[entry.level];
    // Use the pre-patched reference so framework overlays don't intercept us.
    const consoleFn = _console[method];

    if (!this.config.prettyPrint) {
      // Production: single-line JSON — safe for log aggregators
      consoleFn(
        JSON.stringify({
          timestamp: entry.timestamp,
          level: entry.level,
          tag: entry.tag,
          message: entry.message,
          ...(entry.data !== undefined && { data: entry.data }),
          environment: entry.environment,
        })
      );
      return;
    }

    const ts = this.config.enableTimestamps ? `[${entry.timestamp}] ` : "";
    const levelLabel = entry.level.toUpperCase();

    const isBrowser =
      typeof window !== "undefined" && typeof window.document !== "undefined";

    if (isBrowser) {
      // Browser DevTools: use %c CSS directives so colours render correctly
      // and pass data as a raw value so DevTools can expand objects/errors.
      const style = Logger.BROWSER_STYLES[entry.level];
      const args: unknown[] = [
        `%c${ts}${levelLabel} %c[${entry.tag}]%c ${entry.message}`,
        style,
        "color:gray;font-style:italic",
        "color:inherit",
      ];
      if (entry.data !== undefined) {
        args.push(entry.data);
      }
      consoleFn(...args);
    } else {
      // Node.js / Tauri native: ANSI escape codes
      const color = Logger.ANSI_COLORS[entry.level];
      const reset = "\x1b[0m";
      const header = `${color}${ts}${levelLabel}${reset} [${entry.tag}] ${entry.message}`;

      if (entry.data !== undefined) {
        consoleFn(header, entry.data);
      } else {
        consoleFn(header);
      }
    }
  }

  /**
   * Capture a trimmed call-stack string, stripping logger-internal frames
   * so the top frame points to the actual call site.
   */
  private static captureStack(): string {
    const raw = new Error().stack ?? "";
    const lines = raw.split("\n");
    // Drop the Error line and any frames that originate inside Logger/ScopedLogger
    const external = lines.filter(
      (l) => l && !l.includes("logger.ts") && l !== "Error"
    );
    return external.slice(0, 5).join("\n");
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    tag: string,
    message: string,
    data?: unknown
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // For error/fatal levels attach a call-stack so the origin is visible
    // even when `data` is not an Error object.
    let resolvedData = data;
    if (level === "error" || level === "fatal") {
      const stack = Logger.captureStack();
      if (data instanceof Error) {
        // Keep the original Error; the stack is already on it
        resolvedData = data;
      } else if (data !== undefined) {
        resolvedData = { data, stack };
      } else {
        resolvedData = { stack };
      }
    }

    const entry: LogEntry = {
      level,
      tag,
      message,
      data: resolvedData,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };

    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    appendToLogFile(entry);

    if (this.config.customHandler) {
      this.config.customHandler(entry);
    }
  }

  /**
   * Log debug message (development only by default)
   */
  debug(tag: string, message: string, data?: unknown): void {
    this.log("debug", tag, message, data);
  }

  /**
   * Log info message
   */
  info(tag: string, message: string, data?: unknown): void {
    this.log("info", tag, message, data);
  }

  /**
   * Log warning message
   */
  warn(tag: string, message: string, data?: unknown): void {
    this.log("warn", tag, message, data);
  }

  /**
   * Log error message
   */
  error(tag: string, message: string, data?: unknown): void {
    this.log("error", tag, message, data);
  }

  /**
   * Log fatal error message
   */
  fatal(tag: string, message: string, data?: unknown): void {
    this.log("fatal", tag, message, data);
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
  ) {}

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

// Uncaught errors and rejected promises never go through logger.*() calls,
// so a silent crash (e.g. a click handler throwing before its try/catch)
// would otherwise leave no trace in client.log. Install global catch-alls
// once per page load.
if (typeof window !== "undefined") {
  const flag = window as unknown as { __loggerGlobalHandlersInstalled?: boolean };
  if (!flag.__loggerGlobalHandlersInstalled) {
    flag.__loggerGlobalHandlersInstalled = true;
    window.addEventListener("error", (event) => {
      defaultLogger.error("window", event.message || "Uncaught error", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });
    window.addEventListener("unhandledrejection", (event) => {
      defaultLogger.error("window", "Unhandled promise rejection", {
        reason: event.reason,
      });
    });
  }
}

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
