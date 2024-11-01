import { ILogger } from './ILogger';
import { ILoggerStrategy } from './ILoggerStrategy';

enum LogLevel {
  DEBUG = 'DEBUG',
  ERROR = 'ERROR',
  INFO = 'INFO',
  WARN = 'WARN',
}

export class Logger implements ILogger {
  private strategy: ILoggerStrategy;
  private context: string;

  constructor(strategy: ILoggerStrategy, context: string) {
    this.strategy = strategy;
    this.context = context;
  }

  getStrategy() {
    return this.strategy;
  }

  setStrategy(strategy: ILoggerStrategy) {
    this.strategy = strategy;
  }

  private log(level: LogLevel, message: string, tags?: string[]) {
    this.strategy.log(level, message, this.context, tags);
  }

  debug(message: string, tags?: string[]) {
    this.log(LogLevel.DEBUG, message, tags);
  }

  info(message: string, tags?: string[]) {
    this.log(LogLevel.INFO, message, tags);
  }

  warn(message: string, tags?: string[]) {
    this.log(LogLevel.WARN, message, tags);
  }

  error(message: string, tags?: string[]) {
    this.log(LogLevel.ERROR, message, tags);
  }
}
