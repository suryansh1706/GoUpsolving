/**
 * API Cache Management
 * Handles caching of API responses to minimize redundant calls
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class APICache {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new APICache();
