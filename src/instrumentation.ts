// src/instrumentation.ts
// Global error capturing for the whole app (runs once on startup).
// Ensures any uncaught exception / unhandled rejection is logged.

export async function register() {
  const { logger, logError } = await import('@/lib/observability');

  if (typeof process !== 'undefined' && typeof process.on === 'function') {
    process.on('uncaughtException', (error) => {
      logError('uncaught_exception', error, { phase: 'runtime' });
    });

    process.on('unhandledRejection', (reason) => {
      logError('unhandled_rejection', reason as unknown, { phase: 'runtime' });
    });
  }

  logger.info('instrumentation.registered', { service: 'hyderabad-rent' });
}
