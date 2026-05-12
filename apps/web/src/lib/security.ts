/**
 * SkillHive Marketplace — Security utilities
 *
 * Centralizes: SSRF prevention, wallet signature verification, rate limiting.
 * Import from API routes only — never from client components.
 */

import { URL } from 'url'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { PublicKey } from '@solana/web3.js'
import { Redis } from '@upstash/redis'

// ── Redis (lazy singleton) ─────────────────────────────────────────────────

let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('[security] UPSTASH_REDIS_REST_URL / TOKEN not configured')
    }
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

// ── SSRF Prevention ────────────────────────────────────────────────────────

const SSRF_BLOCKED = [
  /^127\./,              // loopback
  /^10\./,               // RFC-1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC-1918
  /^192\.168\./,         // RFC-1918
  /^169\.254\./,         // link-local / AWS instance metadata
  /^100\.64\./,          // CGNAT (RFC-6598)
  /^::1$/,               // IPv6 loopback
  /^fc00:/i,             // IPv6 unique local
  /^fe80:/i,             // IPv6 link-local
  /^localhost$/i,
  /^0\.0\.0\.0$/,
]

/**
 * Validates that a user-supplied URL is a safe public HTTPS endpoint.
 * Throws a descriptive error if the URL is invalid, non-HTTPS, or points
 * to a private/internal network address (SSRF prevention).
 *
 * Use before storing or fetching any provider-supplied webhook URL.
 */
export function validateWebhookUrl(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Webhook URL is required')
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('Invalid webhook URL format')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Webhook URL must use HTTPS (http:// is not allowed)')
  }

  const host = parsed.hostname

  for (const pattern of SSRF_BLOCKED) {
    if (pattern.test(host)) {
      throw new Error(
        'Webhook URL must be a public HTTPS endpoint — private/internal addresses are not allowed'
      )
    }
  }

  // Block numeric IP addresses that aren't already caught (belt-and-suspenders)
  // A hostname with only digits and dots that resolves to a private range
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    throw new Error('Webhook URL must use a public domain name, not a raw IP address')
  }

  return parsed.toString()
}

// ── Wallet Signature Verification ─────────────────────────────────────────

/**
 * Cryptographically verifies that `walletAddress` signed `message`.
 * Throws if the signature is invalid or inputs are malformed.
 *
 * Use instead of trusting `callerWallet` from request bodies.
 */
export function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signatureB58: string,
): void {
  if (!walletAddress || !message || !signatureB58) {
    throw new Error('walletAddress, message, and signature are all required')
  }

  let pubkeyBytes: Uint8Array
  try {
    pubkeyBytes = new PublicKey(walletAddress).toBytes()
  } catch {
    throw new Error('Invalid wallet address')
  }

  let sigBytes: Uint8Array
  try {
    sigBytes = bs58.decode(signatureB58)
  } catch {
    throw new Error('Invalid signature encoding')
  }

  const messageBytes = new TextEncoder().encode(message)
  const valid = nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes)

  if (!valid) {
    throw new Error('Wallet signature verification failed')
  }
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

export class RateLimitError extends Error {
  constructor(public readonly limit: number, public readonly windowSec: number) {
    super(`Rate limit exceeded — max ${limit} requests per ${windowSec}s. Try again later.`)
    this.name = 'RateLimitError'
  }
}

/**
 * Increments a Redis counter for `key` and throws `RateLimitError` if `limit`
 * is exceeded within `windowSec` seconds. If Upstash Redis is not configured
 * or is unreachable, rate limiting is silently skipped (fail-open) so transient
 * Redis outages or dev/preview environments don't break the call path.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[security] Redis not configured — rate limiting disabled for', key)
    return
  }
  let count: number
  try {
    const redis = getRedis()
    count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSec)
    }
  } catch (err) {
    console.warn('[security] Redis unreachable — rate limiting skipped for', key, err)
    return
  }
  if (count > limit) {
    throw new RateLimitError(limit, windowSec)
  }
}

// ── Nonce / Replay Prevention ──────────────────────────────────────────────

const NONCE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Validates that a timestamp-based nonce is within the acceptable window.
 * Prevents replay attacks on signed registration/completion messages.
 */
export function validateNonce(nonce: number): void {
  const now = Date.now()
  const age = now - nonce
  if (age < 0 || age > NONCE_WINDOW_MS) {
    throw new Error('Request expired — nonce is outside the 5-minute window. Please retry.')
  }
}
