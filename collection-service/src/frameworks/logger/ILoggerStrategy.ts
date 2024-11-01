export interface ILoggerStrategy {
  log(level: string, message: string, context?: string, tags?: string[]): void;
}
