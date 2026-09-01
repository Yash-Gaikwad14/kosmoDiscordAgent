/**
 * Unit & Integration Tests for /daily Sparks Command
 *
 * Checks:
 *   1. Normal user receives exactly 500 Sparks.
 *   2. High-Karma user receives exactly 2,000 Sparks.
 *   3. Repeated claim within 24h is rejected with cooldown feedback.
 *   4. Cooldown time remaining is properly calculated and formatted.
 *   5. Missing/ambiguous role data safely defaults to 500 Sparks (fail-closed).
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { 
  processDailyClaim, 
  _resetDailyCooldown, 
  SPARKS_NORMAL, 
  SPARKS_HIGH_KARMA, 
  DAILY_COOLDOWN_MS 
} from './src/agent/daily';
import { UserContext } from './src/types';

// Set HIGH_KARMA_ROLE_ID for testing
process.env.HIGH_KARMA_ROLE_ID = 'role-high-karma-999';

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
  console.log('Running /daily Sparks Unit & Cooldown Tests');
  console.log('='.repeat(60));

  const normalUser: UserContext = {
    id: 'test-user-normal-001',
    username: 'NormalBuilder',
    roles: ['role-regular-1', 'role-regular-2'],
  };

  const highKarmaUser: UserContext = {
    id: 'test-user-highkarma-002',
    username: 'KarmaMaster',
    roles: ['role-regular-1', 'role-high-karma-999'],
  };

  const ambiguousUser: UserContext = {
    id: 'test-user-ambiguous-003',
    username: 'AmbiguousUser',
    roles: [],
  };

  // Reset test cooldowns
  _resetDailyCooldown(normalUser.id);
  _resetDailyCooldown(highKarmaUser.id);
  _resetDailyCooldown(ambiguousUser.id);

  // -------------------------------------------------------------------------
  // Test 1: Normal user receives 500 Sparks
  // -------------------------------------------------------------------------
  console.log('\n[Test 1] Normal user first claim');
  const res1 = await processDailyClaim(normalUser);
  assert(res1.success === true, 'Claim should succeed on first attempt');
  assert(res1.sparksAwarded === SPARKS_NORMAL, `Should award exactly ${SPARKS_NORMAL} Sparks`);
  assert(res1.isHighKarma === false, 'Should be flagged as standard tier');
  assert(res1.message.includes('500 Sparks'), 'Confirmation message must mention 500 Sparks');

  // -------------------------------------------------------------------------
  // Test 2: Normal user repeated claim is blocked by cooldown
  // -------------------------------------------------------------------------
  console.log('\n[Test 2] Normal user immediate second claim');
  const res2 = await processDailyClaim(normalUser);
  assert(res2.success === false, 'Immediate second claim should be rejected');
  assert(res2.sparksAwarded === 0, 'No Sparks should be awarded on failed claim');
  assert(res2.message.includes('already claimed'), 'Message should indicate daily limit hit');
  assert(typeof res2.cooldownRemainingFormatted === 'string' && res2.cooldownRemainingFormatted.length > 0, 'Should return remaining cooldown time');

  // -------------------------------------------------------------------------
  // Test 3: High-Karma user receives 2,000 Sparks
  // -------------------------------------------------------------------------
  console.log('\n[Test 3] High-Karma user first claim');
  const res3 = await processDailyClaim(highKarmaUser);
  assert(res3.success === true, 'High-Karma claim should succeed');
  assert(res3.sparksAwarded === SPARKS_HIGH_KARMA, `Should award exactly ${SPARKS_HIGH_KARMA} Sparks`);
  assert(res3.isHighKarma === true, 'Should be flagged as High-Karma tier');
  assert(res3.message.includes('2,000 Sparks'), 'Confirmation message must mention 2,000 Sparks');

  // -------------------------------------------------------------------------
  // Test 4: High-Karma user repeated claim is blocked
  // -------------------------------------------------------------------------
  console.log('\n[Test 4] High-Karma user immediate second claim');
  const res4 = await processDailyClaim(highKarmaUser);
  assert(res4.success === false, 'High-Karma immediate second claim should be rejected');
  assert(res4.sparksAwarded === 0, 'Zero sparks awarded on rejected claim');

  // -------------------------------------------------------------------------
  // Test 5: Ambiguous/Empty roles fail-closed to 500 Sparks
  // -------------------------------------------------------------------------
  console.log('\n[Test 5] Ambiguous user claim (fail-closed check)');
  const res5 = await processDailyClaim(ambiguousUser);
  assert(res5.success === true, 'Claim should succeed');
  assert(res5.sparksAwarded === SPARKS_NORMAL, 'Ambiguous roles must safely default to 500 Sparks (fail-closed)');
  assert(res5.isHighKarma === false, 'Should not grant High-Karma tier');

  // -------------------------------------------------------------------------
  // Test 6: Resetting cooldown allows new claim
  // -------------------------------------------------------------------------
  console.log('\n[Test 6] Cooldown reset simulation');
  _resetDailyCooldown(normalUser.id);
  const res6 = await processDailyClaim(normalUser);
  assert(res6.success === true, 'Claim after cooldown expiration must succeed');
  assert(res6.sparksAwarded === SPARKS_NORMAL, 'Should award 500 Sparks');

  console.log('\n' + '='.repeat(60));
  if (process.exitCode === 1) {
    console.error('FAILED: Some tests did not pass.');
  } else {
    console.log('ALL TESTS PASSED! /daily logic verified.');
  }
  console.log('='.repeat(60));
}

runTests().catch(console.error);
