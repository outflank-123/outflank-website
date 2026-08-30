/**
 * Lightweight, zero-dependency in-memory sliding window rate limiter
 * for Next.js Route Handlers.
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

const tracker = new Map<string, RateLimitRecord>()

// Periodic garbage collection every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of tracker.entries()) {
      if (record.resetAt <= now) {
        tracker.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  /** Maximum allowed requests within the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetInSeconds: number
}

/**
 * Checks if an identifier (e.g., client IP) has exceeded the rate limit.
 * @param identifier Unique identifier per client (typically client IP)
 * @param options Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now()
  const key = `${identifier}`
  const existing = tracker.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowSeconds * 1000
    tracker.set(key, { count: 1, resetAt })
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetInSeconds: options.windowSeconds,
    }
  }

  if (existing.count >= options.limit) {
    const resetInSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetInSeconds,
    }
  }

  existing.count += 1
  const resetInSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))

  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - existing.count,
    resetInSeconds,
  }
}

/**
 * Helper to extract client IP from NextRequest headers.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}
