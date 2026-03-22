import { Redis } from '@upstash/redis'

const DEFAULT_GUEST_PER_MINUTE_LIMIT = 5

function getGuestPerMinuteLimit(): number {
  const raw = process.env.GUEST_CHAT_PER_MINUTE_LIMIT
  const parsed = raw ? Number(raw) : DEFAULT_GUEST_PER_MINUTE_LIMIT
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_GUEST_PER_MINUTE_LIMIT
  }
  return Math.floor(parsed)
}

async function checkGuestPerMinuteLimit(ip: string): Promise<{
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}> {
  if (process.env.MORPHIC_CLOUD_DEPLOYMENT !== 'true') {
    return { allowed: true, remaining: Infinity, resetAt: 0, limit: 0 }
  }

  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return { allowed: true, remaining: Infinity, resetAt: 0, limit: 0 }
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })

    const minuteKey = new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
    const key = `rl:guest:minute:${ip}:${minuteKey}`

    const count = await Promise.race([
      redis.incr(key),
      new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      )
    ])

    // Set expiry to 60 seconds (TTL of 1 minute)
    if (count === 1) {
      await redis.expire(key, 60)
    }

    const limit = getGuestPerMinuteLimit()
    const remaining = Math.max(0, limit - count)
    const now = new Date()
    const nextMinute = new Date(now)
    nextMinute.setSeconds(nextMinute.getSeconds() + 60)
    nextMinute.setMilliseconds(0)
    const resetAt = nextMinute.getTime()

    return {
      allowed: count <= limit,
      remaining,
      resetAt,
      limit
    }
  } catch (error) {
    console.error('Guest per-minute rate limit check failed:', error)
    return { allowed: true, remaining: Infinity, resetAt: 0, limit: 0 }
  }
}

export async function checkAndEnforceGuestPerMinuteLimit(
  ip: string | null
): Promise<Response | null> {
  if (!ip) return null

  const result = await checkGuestPerMinuteLimit(ip)
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Please sign in to continue. (Trial limit: 5 requests per minute)',
        remaining: 0,
        resetAt: result.resetAt,
        limit: result.limit
      }),
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt)
        }
      }
    )
  }

  return null
}
