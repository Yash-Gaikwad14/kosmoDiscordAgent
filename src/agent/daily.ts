/**
 * /daily Sparks Economy & Cooldown Handler
 *
 * Scope: Handles 24-hour claim window, Sparks calculation based on High-Karma role,
 * and integration with UnbelievaBoat economy API.
 *
 * Rules:
 *   - Normal user       -> 500 Sparks / 24h
 *   - High-Karma user   -> 2,000 Sparks / 24h
 *   - Cooldown          -> 24 hours
 *   - High-Karma role is EARNED through Arcane leveling, never purchased.
 */

import { UserContext } from '../types';

export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SPARKS_NORMAL = 500;
export const SPARKS_HIGH_KARMA = 2000;

export interface DailyClaimResult {
  success: boolean;
  sparksAwarded: number;
  isHighKarma: boolean;
  message: string;
  nextClaimAt?: Date;
  cooldownRemainingFormatted?: string;
}

interface CooldownEntry {
  lastClaimedAt: Date;
  totalClaims: number;
}

// In-memory cooldown store keyed by userId
const dailyCooldowns = new Map<string, CooldownEntry>();

function formatRemainingTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

function hasHighKarmaRole(roles: string[] | undefined | null): boolean {
  const highKarmaRoleId = process.env.HIGH_KARMA_ROLE_ID;
  if (!highKarmaRoleId || !Array.isArray(roles) || roles.length === 0) return false;
  return roles.includes(highKarmaRoleId);
}

/**
 * Executes the daily claim for a user.
 */
export async function processDailyClaim(
  user: UserContext,
  guildId?: string
): Promise<DailyClaimResult> {
  const now = new Date();
  const entry = dailyCooldowns.get(user.id);

  if (entry) {
    const elapsed = now.getTime() - entry.lastClaimedAt.getTime();
    if (elapsed < DAILY_COOLDOWN_MS) {
      const remainingMs = DAILY_COOLDOWN_MS - elapsed;
      const nextClaimAt = new Date(entry.lastClaimedAt.getTime() + DAILY_COOLDOWN_MS);
      const remainingFormatted = formatRemainingTime(remainingMs);

      return {
        success: false,
        sparksAwarded: 0,
        isHighKarma: hasHighKarmaRole(user.roles),
        message: `You've already claimed your daily Sparks today. Come back in **${remainingFormatted}** (available at <t:${Math.floor(nextClaimAt.getTime() / 1000)}:t>).`,
        nextClaimAt,
        cooldownRemainingFormatted: remainingFormatted,
      };
    }
  }

  const isHighKarma = hasHighKarmaRole(user.roles);
  const sparksAwarded = isHighKarma ? SPARKS_HIGH_KARMA : SPARKS_NORMAL;

  // Award via UnbelievaBoat API if token is configured
  const unbelievaBoatToken = process.env.UNBELIEVABOAT_API_KEY;
  if (unbelievaBoatToken && guildId) {
    try {
      const response = await fetch(
        `https://unbelievaboat.com/api/v1/guilds/${guildId}/users/${user.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: unbelievaBoatToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cash: sparksAwarded,
            reason: `Kosmo daily Sparks allowance (${isHighKarma ? 'High-Karma Tier' : 'Standard Tier'})`,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[DailySparks] UnbelievaBoat API error:', response.status, errorBody);
        return {
          success: false,
          sparksAwarded: 0,
          isHighKarma,
          message: `Encountered an issue crediting Sparks to UnbelievaBoat (Status: ${response.status}). Please inform Team Kosmo.`,
        };
      }
    } catch (apiError) {
      console.error('[DailySparks] UnbelievaBoat fetch failed:', apiError);
      return {
        success: false,
        sparksAwarded: 0,
        isHighKarma,
        message: `Failed to connect to the economy server. Please try again shortly.`,
      };
    }
  }

  // Update in-memory cooldown
  dailyCooldowns.set(user.id, {
    lastClaimedAt: now,
    totalClaims: (entry?.totalClaims ?? 0) + 1,
  });

  const tierLabel = isHighKarma ? '⚡ **High-Karma Tier** (+2,000 Sparks)' : '🪙 **Standard Tier** (+500 Sparks)';
  const message = [
    `**Daily Sparks Claimed!**`,
    `${tierLabel}`,
    `Awarded **+${sparksAwarded.toLocaleString()} Sparks** to <@${user.id}>.`,
    isHighKarma
      ? `Thanks for your active community contributions!`
      : `Tip: Level up your Karma in the server to unlock the **2,000 Sparks/day** High-Karma tier.`,
  ].join('\n\n');

  return {
    success: true,
    sparksAwarded,
    isHighKarma,
    message,
    nextClaimAt: new Date(now.getTime() + DAILY_COOLDOWN_MS),
  };
}

/**
 * For test resets only.
 */
export function _resetDailyCooldown(userId: string): void {
  dailyCooldowns.delete(userId);
}
