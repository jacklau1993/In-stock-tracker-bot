export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  setLevel(lvl: LogLevel) {
    this.level = lvl;
  }

  private shouldLog(lvl: LogLevel) {
    return levelOrder[lvl] >= levelOrder[this.level];
  }

  private format(msg: string, fields?: Record<string, unknown>) {
    if (!fields || Object.keys(fields).length === 0) {
      return msg;
    }
    return `${msg} ${JSON.stringify(fields)}`;
  }

  debug(msg: string, fields?: Record<string, unknown>) {
    if (this.shouldLog('debug')) console.debug(this.format(msg, fields));
  }

  info(msg: string, fields?: Record<string, unknown>) {
    if (this.shouldLog('info')) console.info(this.format(msg, fields));
  }

  warn(msg: string, fields?: Record<string, unknown>) {
    if (this.shouldLog('warn')) console.warn(this.format(msg, fields));
  }

  error(msg: string, fields?: Record<string, unknown>) {
    if (this.shouldLog('error')) console.error(this.format(msg, fields));
  }
}

export const logger = new Logger('info');
