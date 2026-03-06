import { UnitCardData } from '../types/dataCards';

const CACHE_PREFIX = 'gd_cache_v1_';

interface CacheEntry {
  url: string;
  data: UnitCardData;
  hash: string;
  timestamp: number;
}

export const cacheService = {
  get: (url: string): CacheEntry | null => {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + url);
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },

  set: (url: string, data: UnitCardData, hash: string = '') => {
    try {
      const entry: CacheEntry = { url, data, hash, timestamp: Date.now() };
      localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(entry));
    } catch (e) {
      console.warn("Cache write failed (likely full):", e);
    }
  },

  has: (url: string): boolean => {
    return !!localStorage.getItem(CACHE_PREFIX + url);
  },

  clear: () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    });
  }
};
