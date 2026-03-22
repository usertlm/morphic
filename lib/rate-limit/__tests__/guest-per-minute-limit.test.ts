import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkAndEnforceGuestPerMinuteLimit } from '../guest-per-minute-limit'

// Mock environment variables
const originalEnv = process.env

describe('checkAndEnforceGuestPerMinuteLimit', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  it('should return null (allow) when IP is null', async () => {
    const result = await checkAndEnforceGuestPerMinuteLimit(null)
    expect(result).toBeNull()
  })

  it('should return null (allow) when MORPHIC_CLOUD_DEPLOYMENT is not true', async () => {
    process.env.MORPHIC_CLOUD_DEPLOYMENT = 'false'
    const result = await checkAndEnforceGuestPerMinuteLimit('127.0.0.1')
    expect(result).toBeNull()
  })

  it('should return null (allow) when Redis is not configured', async () => {
    process.env.MORPHIC_CLOUD_DEPLOYMENT = 'true'
    process.env.UPSTASH_REDIS_REST_URL = ''
    process.env.UPSTASH_REDIS_REST_TOKEN = ''
    const result = await checkAndEnforceGuestPerMinuteLimit('127.0.0.1')
    expect(result).toBeNull()
  })
})
