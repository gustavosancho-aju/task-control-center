type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
  error?: Error
}

function formatEntry(entry: LogEntry): string {
  const { level, message, context, timestamp } = entry
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  return `${prefix} ${message}${ctx}`
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    error,
  }

  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate error tracking service in production
    // Example: Sentry.captureException(error, { extra: context })
    // Example: Datadog.logger.log(entry)
    const formatted = formatEntry(entry)
    if (level === 'error') console.error(formatted, error ?? '')
    else if (level === 'warn') console.warn(formatted)
    else console.log(formatted)
  } else {
    // Dev: colorful, verbose
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[90m',
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    }
    const reset = '\x1b[0m'
    const formatted = `${colors[level]}${formatEntry(entry)}${reset}`
    if (level === 'error') console.error(formatted, error ?? '')
    else if (level === 'warn') console.warn(formatted)
    else console.log(formatted)
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, error?: Error, context?: Record<string, unknown>) =>
    log('error', message, context, error),
}
