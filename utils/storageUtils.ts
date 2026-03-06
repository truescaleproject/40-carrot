
/**
 * Safely retrieves an item from localStorage, handling potential errors
 * (e.g., access denied in iframes or incognito mode).
 */
export const safeLocalStorageGet = (key: string): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to read key "${key}":`, error);
    return null;
  }
};

/**
 * Safely writes an item to localStorage with a size check.
 * Returns true if successful, false otherwise.
 */
export const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    
    // Simple size check (approx 2MB safety threshold; browser limits usually ~5MB)
    // This prevents the app from crashing due to QuotaExceededError on large writes.
    if (value.length > 2_000_000) {
      console.warn(`[Storage] Payload for "${key}" is too large (${value.length} chars). Skipping save.`);
      return false;
    }
    
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Catches QuotaExceededError and SecurityError (e.g. Incognito)
    console.warn(`[Storage] Failed to write key "${key}":`, error);
    return false;
  }
};
