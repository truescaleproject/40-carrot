
import { APP_VERSION } from '../constants';

export interface ErrorContext {
  [key: string]: string | number | boolean | undefined | null;
}

/**
 * Centralized error logging utility.
 * Captures error details along with application context (version, state summaries)
 * for debugging and potential future remote diagnostics.
 * 
 * @param error The error object or message caught.
 * @param context Key-value pairs describing the state when the error occurred.
 */
export const logError = (error: unknown, context: ErrorContext = {}) => {
  const timestamp = new Date().toISOString();
  const errorObj = error instanceof Error ? error : new Error(String(error));

  const diagnosticData = {
    timestamp,
    appVersion: APP_VERSION,
    errorName: errorObj.name,
    errorMessage: errorObj.message,
    stack: errorObj.stack,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    ...context
  };

  // Structure the console output for clarity during development
  console.groupCollapsed(`[40 Carrot Error] ${errorObj.message || 'Unknown Error'}`);
  console.error(errorObj);
  console.table(diagnosticData);
  console.groupEnd();

  // TODO: Integration point for remote logging services (e.g. Sentry)
  // if (process.env.ENABLE_REMOTE_LOGGING) { ... }
};
