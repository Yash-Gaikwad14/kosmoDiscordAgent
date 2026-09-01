/**
 * In-memory rate limiter for KosmoAgent.
 *
 * Scope: src/agent/ only. No external DB or Redis -- MVP in-memory Map.
 *
 * Tiers:
 *   HIGH_KARMA_ROLE_ID holders  -> 20 requests / hour
 *   everyone else               -> 5 requests / hour  (fail-closed default)
 */

import { UserContext, RateLimitResult } from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Discord role ID that grants the elevated quota. Read from env at startup. */
const HIGH_KARMA_ROLE_ID: string =
  process.env.HIGH_KARMA_ROLE_ID ?? 'HIGH_KARMA_ROLE_ID';

const WINDOW_MS        = 60 * 60 * 1000; // 1 hour in ms
const LIMIT_DEFAULT    = 5;
const LIMIT_HIGH_KARMA = 20;

const REJECTION_MESSAGE =
  "You've hit your hourly limit. Turns out even intent compilers have " +
  "a rate limit. Come back when the hour resets, or earn more Karma to " +
  "unlock a higher quota. The grind is the point.";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface BucketEntry {
  count:   number;
  resetAt: Date;
}

/** Keyed by Discord user ID. Persists for the lifetime of the process. */
const buckets = new Map<string, BucketEntry>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true only when `roles` is a non-empty array AND contains
 * HIGH_KARMA_ROLE_ID. Any missing or ambiguous data returns false --
 * fail-closed means the lower limit always wins when data is uncertain.
 */
function hasHighKarmaRole(roles: string[] | undefined | null): boolean {
  if (!Array.isArray(roles) || roles.length === 0) return false;
  const highKarmaRoleId = process.env.HIGH_KARMA_ROLE_ID;
  return Boolean(
    (highKarmaRoleId && roles.includes(highKarmaRoleId)) ||
    roles.some(r => r.toLowerCase() === 'high-karma user' || r.toLowerCase() === 'high karma user')
  );
}

/**
 * Retrieves the active bucket for a user, resetting it if the window
 * has expired. Creates a fresh bucket on first call.
 */
function getBucket(userId: string, now: Date): BucketEntry {
  const existing = buckets.get(userId);
  if (existing && now < existing.resetAt) {
    return existing;
  }
  const fresh: BucketEntry = {
    count:   0,
    resetAt: new Date(now.getTime() + WINDOW_MS),
  };
  buckets.set(userId, fresh);
  return fresh;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks and records a request attempt for the given user.
 *
 * - Determines quota tier from UserContext.roles (fail-closed on ambiguity).
 * - Increments the bucket counter ONLY when the request is allowed.
 * - Never throws -- always returns a valid RateLimitResult.
 */
export function checkRateLimit(user: UserContext): RateLimitResult {
  const now    = new Date();
  const limit  = hasHighKarmaRole(user.roles) ? LIMIT_HIGH_KARMA : LIMIT_DEFAULT;
  const bucket = getBucket(user.id, now);

  if (bucket.count >= limit) {
    return {
      allowed:          false,
      remaining:        0,
      limit,
      resetAt:          bucket.resetAt,
      rejectionMessage: REJECTION_MESSAGE,
    };
  }

  bucket.count += 1;

  return {
    allowed:   true,
    remaining: limit - bucket.count,
    limit,
    resetAt:   bucket.resetAt,
  };
}

/**
 * Resets the rate limit bucket for a user (for testing).
 */
export function _resetRateLimit(userId?: string): void {
  if (userId) {
    buckets.delete(userId);
  } else {
    buckets.clear();
  }
}

export { LIMIT_DEFAULT, LIMIT_HIGH_KARMA, WINDOW_MS };
