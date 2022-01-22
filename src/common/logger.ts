/* eslint-disable @typescript-eslint/no-explicit-any */
import autoBind from 'auto-bind';

/**
 * Pluggable logger interface
 */
export interface QwsLogger {
  debug(...data: any[]): void;
  info(...data: any[]): void;
  warn(...data: any[]): void;
  error(...data: any[]): void;
}

export class QwsLoggerWrapper implements QwsLogger {
  backend: QwsLogger;

  constructor(logger: QwsLogger = console) {
    this.backend = logger;
    autoBind(this);
  }

  debug(...data: any[]): void {
    this.backend.debug(...data);
  }

  info(...data: any[]): void {
    this.backend.info(...data);
  }

  warn(...data: any[]): void {
    this.backend.warn(...data);
  }

  error(...data: any[]): void {
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
export const setQwsLoggingBackend = logger.setBackend;
