/**
 * CacheManager
 *
 * Manages in-memory caching of API responses to reduce load and improve performance.
 * Implements TTL (Time To Live) expiration for cache entries.
 */

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  value: T;
  expiry: number; // Timestamp when the entry expires
  key: string;
}

/**
 * Cache manager class for storing and retrieving cached data
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Set a value in the cache with optional TTL
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, value: T, ttl: number = 300000): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiry,
      key
    });
  }

  /**
   * Get a value from the cache
   *
   * @param key - Cache key
   * @returns Cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    // Return null if entry doesn't exist
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Check if a key exists in the cache and is not expired
   *
   * @param key - Cache key
   * @returns true if key exists and is not expired, false otherwise
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific cache entry
   *
   * @param key - Cache key to delete
   * @returns true if entry was deleted, false if it didn't exist
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   *
   * Uses simple pattern matching:
   * - Exact match: "assignedIssues"
   * - Prefix match: "issue:*" matches "issue:PROJ-123", "issue:PROJ-456", etc.
   * - Suffix match: "*:details" matches "issue:PROJ-123:details", etc.
   * - Contains match: "*metadata*" matches anything containing "metadata"
   *
   * @param pattern - Pattern to match cache keys against
   * @returns Number of entries invalidated
   */
  invalidate(pattern: string): number {
    let count = 0;

    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')  // Replace * with .*
      .replace(/\?/g, '.');   // Replace ? with .

    const regex = new RegExp(`^${regexPattern}$`);

    // Find all matching keys
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    // Delete matching entries
    keysToDelete.forEach(key => {
      if (this.cache.delete(key)) {
        count++;
      }
    });

    return count;
  }

  /**
   * Clear all cache entries
   *
   * @returns Number of entries cleared
   */
  clear(): number {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Get the number of entries in the cache (including expired ones)
   *
   * @returns Number of cache entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   *
   * This method should be called periodically to remove expired entries
   * and free up memory.
   *
   * @returns Number of expired entries removed
   */
  cleanup(): number {
    let count = 0;
    const now = Date.now();

    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      if (this.cache.delete(key)) {
        count++;
      }
    });

    return count;
  }

  /**
   * Get cache statistics
   *
   * @returns Object with cache statistics
   */
  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
    keys: string[];
  } {
    const now = Date.now();
    let expiredCount = 0;
    const keys: string[] = [];

    for (const [key, entry] of this.cache) {
      keys.push(key);
      if (now > entry.expiry) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      validEntries: this.cache.size - expiredCount,
      keys
    };
  }
}

/**
 * Default cache TTL values (in milliseconds)
 */
export const CacheTTL = {
  /** Projects rarely change - 1 hour */
  PROJECTS: 3600000,

  /** Issue types rarely change - 1 hour */
  ISSUE_TYPES: 3600000,

  /** Create metadata rarely changes - 1 hour */
  CREATE_METADATA: 3600000,

  /** Issue details change frequently - 5 minutes */
  ISSUE_DETAILS: 300000,

  /** Assigned issues list changes frequently - 2 minutes */
  ASSIGNED_ISSUES: 120000,

  /** Transitions depend on current state - 5 minutes */
  TRANSITIONS: 300000,

  /** Default TTL - 5 minutes */
  DEFAULT: 300000
};
