/**
 * Rate Limiter for API Protection
 * Prevents abuse by limiting requests per IP address
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  suspiciousActivity: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   * @param identifier - Usually IP address or user ID
   * @param limit - Max requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Whether request is allowed and remaining count
   */
  check(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60 * 1000 // 1 minute default
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No entry or expired - create new
    if (!entry || entry.resetAt < now) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
        suspiciousActivity: 0,
      });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
      };
    }

    // Entry exists and not expired
    if (entry.count >= limit) {
      // Mark suspicious if they keep trying after limit
      entry.suspiciousActivity++;
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment and allow
    entry.count++;
    this.store.set(identifier, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Check if IP shows suspicious patterns
   */
  isSuspicious(identifier: string): boolean {
    const entry = this.store.get(identifier);
    return entry ? entry.suspiciousActivity > 5 : false;
  }

  /**
   * Block an IP temporarily
   */
  block(identifier: string, durationMs: number = 60 * 60 * 1000) {
    this.store.set(identifier, {
      count: 999999,
      resetAt: Date.now() + durationMs,
      suspiciousActivity: 999,
    });
  }

  /**
   * Get stats for monitoring
   */
  getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let blockedIPs = 0;
    let suspiciousIPs = 0;

    for (const [, entry] of this.store.entries()) {
      if (entry.resetAt >= now) {
        activeEntries++;
        if (entry.count > 100) blockedIPs++;
        if (entry.suspiciousActivity > 3) suspiciousIPs++;
      }
    }

    return {
      activeEntries,
      blockedIPs,
      suspiciousIPs,
      totalTracked: this.store.size,
    };
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
export const rateLimiter = new InMemoryRateLimiter();

// Different rate limits for different use cases
export const RATE_LIMITS = {
  // AI Search: 10 requests per minute per IP (expensive)
  AI_SEARCH: {
    limit: 10,
    windowMs: 60 * 1000,
  },
  // Regular search: 60 requests per minute
  REGULAR_SEARCH: {
    limit: 60,
    windowMs: 60 * 1000,
  },
  // API: 100 requests per minute
  API: {
    limit: 100,
    windowMs: 60 * 1000,
  },
};

/**
 * Extract IP address from request
 */
export function getClientIP(request: Request): string {
  // Try various headers in order of preference
  const headers = request.headers;

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP;

  const cfConnectingIP = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIP) return cfConnectingIP;

  // Fallback - in dev this might be undefined
  return 'unknown';
}
