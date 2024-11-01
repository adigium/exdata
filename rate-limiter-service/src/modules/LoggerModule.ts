export interface LoggerModule {
  debug: (message: string, tags?: string[]) => void;
  info: (message: string, tags?: string[]) => void;
  warn: (message: string, tags?: string[]) => void;
  error: (message: string, tags?: string[]) => void;
}
