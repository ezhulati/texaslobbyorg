/**
 * Query Cache for AI Search
 * Caches search results to prevent redundant API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

class QueryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number = 1000, ttlMs: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Generate cache key from query
   */
  private generateKey(query: string): string {
    // Normalize query: lowercase, trim, remove extra spaces
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return normalized;
  }

  /**
   * Get cached result if exists and not expired
   */
  get(query: string): T | null {
    const key = this.generateKey(query);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count for analytics
    entry.hits++;
    return entry.data;
  }

  /**
   * Set cache entry
   */
  set(query: string, data: T): void {
    const key = this.generateKey(query);

    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Find oldest entry for eviction
   */
  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let totalHits = 0;
    let expiredEntries = 0;

    for (const [, entry] of this.cache.entries()) {
      if (now - entry.timestamp <= this.ttlMs) {
        validEntries++;
        totalHits += entry.hits;
      } else {
        expiredEntries++;
      }
    }

    return {
      size: this.cache.size,
      validEntries,
      expiredEntries,
      totalHits,
      hitRate: validEntries > 0 ? (totalHits / validEntries).toFixed(2) : 0,
      maxSize: this.maxSize,
      ttlMinutes: this.ttlMs / (60 * 1000),
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance for AI search queries
export const aiSearchCache = new QueryCache(1000, 5 * 60 * 1000); // 1000 entries, 5 min TTL

// Periodic cleanup every 10 minutes
setInterval(() => {
  aiSearchCache.cleanup();
}, 10 * 60 * 1000);
