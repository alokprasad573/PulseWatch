export class Logger {
  static info(message: string, meta?: any): void {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  static warn(message: string, meta?: any): void {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  static error(message: string, error?: any): void {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error?.stack || error || '');
  }

  static debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
}
