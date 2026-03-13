
import { APP_VERSION } from '../constants';

/**
 * Checks the version of the loaded data and performs necessary migrations
 * to match the current application structure.
 * 
 * @param data The raw JSON object loaded from a save file
 * @returns The migrated data object safe for use in the current app version
 */
export const migrateSaveData = (data: Record<string, unknown>): Record<string, unknown> => {
  if (!data) return data;

  const dataVersion = data.appVersion as string | undefined;

  // Placeholder for future migration logic
  if (dataVersion !== APP_VERSION) {
    console.info(`[Data Migration] Detected data version: ${dataVersion || 'Unknown'}. Current App Version: ${APP_VERSION}.`);
    
    // Example future logic:
    // if (!dataVersion || versionCompare(dataVersion, '0.9.7') < 0) {
    //    // transform data structure
    // }
  }

  // Ensure the returned data object is effectively "up to date" even if we didn't change anything yet.
  return data;
};
