/**
 * Referral Tracking & Monthly Leaderboard Module
 *
 * Scope: Tracks member referrals, maintains leaderboard statistics,
 * and implements anti-abuse protections (self-referral prevention, duplicate prevention).
 *
 * Separation of Concerns:
 *   - Referral rewards (Kosmo Compiles) are separate from Karma.
 *   - Referrals NEVER automatically award High-Karma or admin roles.
 */

export interface ReferralEntry {
  inviterId: string;
  count: number;
  invitedUsers: Set<string>;
  lastReferralAt: Date;
}

export interface ReferralRecordResult {
  success: boolean;
  totalReferrals: number;
  reason?: string;
}

export interface LeaderboardEntry {
  userId: string;
  count: number;
  rank: number;
}

// In-memory store of referrals: inviterId -> ReferralEntry
const referralStore = new Map<string, ReferralEntry>();

// Store tracking: invitedUserId -> inviterId (to prevent duplicate attribution)
const invitedUserMap = new Map<string, string>();

/**
 * Records a referral event when a new user joins with an invite code.
 */
export function recordReferral(inviterId: string, newMemberId: string): ReferralRecordResult {
  if (!inviterId || !newMemberId) {
    return { success: false, totalReferrals: 0, reason: 'Missing inviter or member ID' };
  }

  // Anti-abuse 1: Prevent self-referral
  if (inviterId === newMemberId) {
    return { success: false, totalReferrals: 0, reason: 'Self-referrals are not permitted' };
  }

  // Anti-abuse 2: Prevent duplicate counting of already registered members
  if (invitedUserMap.has(newMemberId)) {
    const existingInviter = invitedUserMap.get(newMemberId);
    const existingEntry = referralStore.get(existingInviter ?? '');
    return {
      success: false,
      totalReferrals: existingEntry?.count ?? 0,
      reason: 'Member has already been attributed to an invite',
    };
  }

  let entry = referralStore.get(inviterId);
  if (!entry) {
    entry = {
      inviterId,
      count: 0,
      invitedUsers: new Set<string>(),
      lastReferralAt: new Date(),
    };
    referralStore.set(inviterId, entry);
  }

  // Record referral
  entry.count += 1;
  entry.invitedUsers.add(newMemberId);
  entry.lastReferralAt = new Date();
  invitedUserMap.set(newMemberId, inviterId);

  return {
    success: true,
    totalReferrals: entry.count,
  };
}

/**
 * Retrieves referral count and rank for a given user.
 */
export function getReferralStats(userId: string): { referralCount: number; rank: number } {
  const allEntries = Array.from(referralStore.values()).sort((a, b) => b.count - a.count);
  const userEntry = referralStore.get(userId);
  const referralCount = userEntry?.count ?? 0;

  const rankIndex = allEntries.findIndex(e => e.inviterId === userId);
  const rank = rankIndex === -1 ? allEntries.length + 1 : rankIndex + 1;

  return { referralCount, rank };
}

/**
 * Retrieves the top referrers leaderboard.
 */
export function getReferralLeaderboard(limit: number = 10): LeaderboardEntry[] {
  const sorted = Array.from(referralStore.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return sorted.map((entry, index) => ({
    userId: entry.inviterId,
    count: entry.count,
    rank: index + 1,
  }));
}

/**
 * Resets referral store (for testing only).
 */
export function _resetReferralStore(): void {
  referralStore.clear;
  referralStore.clear();
  invitedUserMap.clear();
}
