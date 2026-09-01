/**
 * Test Suite for Rate Limiting, Ticket Tool Level-1 Support & Referral Tracking
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { checkRateLimit, _resetRateLimit, LIMIT_DEFAULT, LIMIT_HIGH_KARMA } from './src/agent/rateLimit';
import { isTicketChannel, shouldEscalateToHuman, processTicketMessage } from './src/agent/tickets';
import { recordReferral, getReferralStats, getReferralLeaderboard, _resetReferralStore } from './src/agent/referrals';
import { UserContext, AgentContext } from './src/types';

process.env.HIGH_KARMA_ROLE_ID = 'role-high-karma-777';

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Running Rate Limiting, Tickets & Referrals Tests');
  console.log('='.repeat(60));

  // -------------------------------------------------------------------------
  // Section 1: LLM Rate Limiting Tests
  // -------------------------------------------------------------------------
  console.log('\n[Section 1] LLM Rate Limiting Tiers & Resets');
  _resetRateLimit();

  const normalUser: UserContext = {
    id: 'user-ratelimit-std',
    username: 'StdUser',
    roles: ['regular-role'],
  };

  const highKarmaUser: UserContext = {
    id: 'user-ratelimit-hk',
    username: 'HighKarmaUser',
    roles: ['role-high-karma-777'],
  };

  // Standard user limit test (5 requests)
  for (let i = 1; i <= LIMIT_DEFAULT; i++) {
    const res = checkRateLimit(normalUser);
    assert(res.allowed === true, `Standard user request ${i}/${LIMIT_DEFAULT} allowed`);
  }
  const blockedStd = checkRateLimit(normalUser);
  assert(blockedStd.allowed === false, 'Standard user 6th request is blocked');
  assert(typeof blockedStd.rejectionMessage === 'string', 'Rejection message provided');

  // High-Karma user limit test (20 requests)
  for (let i = 1; i <= LIMIT_HIGH_KARMA; i++) {
    const res = checkRateLimit(highKarmaUser);
    assert(res.allowed === true, `High-Karma user request ${i}/${LIMIT_HIGH_KARMA} allowed`);
  }
  const blockedHk = checkRateLimit(highKarmaUser);
  assert(blockedHk.allowed === false, 'High-Karma user 21st request is blocked');

  // Independent buckets & reset check
  _resetRateLimit(normalUser.id);
  const afterReset = checkRateLimit(normalUser);
  assert(afterReset.allowed === true, 'Standard user allowed after reset');
  const hkStillBlocked = checkRateLimit(highKarmaUser);
  assert(hkStillBlocked.allowed === false, 'High-Karma user remains blocked independently');

  // -------------------------------------------------------------------------
  // Section 2: Ticket Tool Integration & AI Support
  // -------------------------------------------------------------------------
  console.log('\n[Section 2] Ticket Tool Channel Detection & Human Escalation');

  assert(isTicketChannel('ticket-alice') === true, 'Identifies ticket-alice as ticket channel');
  assert(isTicketChannel('ticket_0042') === true, 'Identifies ticket_0042 as ticket channel');
  assert(isTicketChannel('general-chat') === false, 'general-chat is NOT a ticket channel');
  assert(isTicketChannel('introductions') === false, 'introductions is NOT a ticket channel');

  // Escalation detection
  const escalationQueries = [
    'I want to speak to a human staff member',
    'I need to talk to a moderator',
    'Please escalate this ticket',
    'I have a billing issue and need a refund',
    'I want to submit a ban appeal for my account',
  ];
  for (const q of escalationQueries) {
    assert(shouldEscalateToHuman(q) === true, `Escalates: "${q}"`);
  }

  const standardHelpQueries = [
    'How do I compile an intent with Kosmo?',
    'What are Sparks used for in the server?',
    'Where can I find Kosmo recipes?',
  ];
  for (const q of standardHelpQueries) {
    assert(shouldEscalateToHuman(q) === false, `Level-1 AI handling: "${q}"`);
  }

  // Escalation execution
  const ticketContext: AgentContext = {
    user: normalUser,
    channelId: 'ticket-chan-001',
    channelName: 'ticket-alice',
    currentMessage: 'I need to speak to human staff regarding a billing refund',
    history: [],
  };
  const ticketRes = await processTicketMessage(ticketContext);
  assert(ticketRes.metadata?.escalated === true, 'Ticket escalation flagged in metadata');
  assert(ticketRes.text.includes('flagged this ticket for Team Kosmo'), 'Escalation response returned');

  // -------------------------------------------------------------------------
  // Section 3: InviteTracker Referral Tracking & Leaderboard
  // -------------------------------------------------------------------------
  console.log('\n[Section 3] Referral Attribution, Anti-Abuse & Leaderboards');
  _resetReferralStore();

  const inviterA = 'inviter-alice-100';
  const inviterB = 'inviter-bob-200';
  const member1 = 'new-member-001';
  const member2 = 'new-member-002';
  const member3 = 'new-member-003';

  // Valid referrals
  const ref1 = recordReferral(inviterA, member1);
  assert(ref1.success === true && ref1.totalReferrals === 1, 'Inviter A records 1st referral');

  const ref2 = recordReferral(inviterA, member2);
  assert(ref2.success === true && ref2.totalReferrals === 2, 'Inviter A records 2nd referral');

  const ref3 = recordReferral(inviterB, member3);
  assert(ref3.success === true && ref3.totalReferrals === 1, 'Inviter B records 1st referral');

  // Anti-abuse: Self-referral
  const selfRef = recordReferral(inviterA, inviterA);
  assert(selfRef.success === false, 'Self-referral is blocked');

  // Anti-abuse: Duplicate referral of same member
  const dupRef = recordReferral(inviterB, member1);
  assert(dupRef.success === false, 'Duplicate referral attribution is blocked');

  // Leaderboard ranking
  const statsA = getReferralStats(inviterA);
  assert(statsA.referralCount === 2 && statsA.rank === 1, 'Inviter A is ranked #1 with 2 referrals');

  const statsB = getReferralStats(inviterB);
  assert(statsB.referralCount === 1 && statsB.rank === 2, 'Inviter B is ranked #2 with 1 referral');

  const leaderboard = getReferralLeaderboard(10);
  assert(leaderboard.length === 2, 'Leaderboard contains 2 ranked referrers');
  assert(leaderboard[0].userId === inviterA && leaderboard[0].count === 2, 'Leaderboard #1 is Inviter A');
  assert(leaderboard[1].userId === inviterB && leaderboard[1].count === 1, 'Leaderboard #2 is Inviter B');

  console.log('\n' + '='.repeat(60));
  if (process.exitCode === 1) {
    console.error('FAILED: Some tests did not pass.');
  } else {
    console.log('ALL TESTS PASSED! Rate Limiting, Tickets & Referrals verified.');
  }
  console.log('='.repeat(60));
}

runTests().catch(console.error);
