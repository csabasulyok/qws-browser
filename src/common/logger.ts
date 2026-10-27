import autoBind from 'auto-bind';

/**
 * Pluggable logger interface
 */
export type QwsLogger = {
  debug(...data: unknown[]): void;
  info(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
};

export class QwsLoggerWrapper implements QwsLogger {
  backend: QwsLogger;

  constructor(logger: QwsLogger = console) {
    this.backend = logger;
    autoBind(this);
  }

  debug(...data: unknown[]): void {
    this.backend.debug(...data);
  }

  info(...data: unknown[]): void {
    this.backend.info(...data);
  }

  warn(...data: unknown[]): void {
    this.backend.warn(...data);
  }

  error(...data: unknown[]): void {
    this.backend.error(...data);
  }

  /**
   * Overwrite default logger used by qws, which is the console.
   * Allows plugging of external tools, such as yall2
   */
  setBackend(newBackend: QwsLogger): void {
    this.backend = newBackend;
  }
}

/**
 * Export default instance
 */
const logger = new QwsLoggerWrapper();
export default logger;

/**
 * Export setBackend method for easy external setup
 */
export const setQwsLoggingBackend = (newBackend: QwsLogger): void => {
  logger.setBackend(newBackend);
};
