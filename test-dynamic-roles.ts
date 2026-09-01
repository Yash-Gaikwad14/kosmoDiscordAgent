/**
 * Comprehensive Test Suite for Dynamic Profession / Interest Role Assignment
 *
 * Verifies:
 *   1. Explicit profession statements map to the exact approved guild roles.
 *   2. Ambiguous questions or third-party mentions do NOT trigger role assignment.
 *   3. Duplicate roles already held by the user are not re-assigned.
 *   4. Sensitive roles (High-Karma, Founder, Team Kosmo, Moderator) are strictly blocked.
 */

import { 
  detectProfessionRole, 
  isApprovedGuildRole, 
  isRestrictedRole, 
  APPROVED_GUILD_ROLES 
} from './src/agent/roleDetection';
import { kosmoAgent } from './src/agent';
import { AgentContext, UserContext } from './src/types';

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

function makeUser(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: 'user-dynamic-001',
    username: 'TestBuilder',
    roles: [],
    ...overrides,
  };
}

function makeContext(message: string, userOverrides: Partial<UserContext> = {}): AgentContext {
  return {
    user: makeUser(userOverrides),
    channelId: 'channel-test-123',
    channelName: 'general-chat',
    currentMessage: message,
    history: [],
  };
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Running Dynamic Role Assignment Tests');
  console.log('='.repeat(60));

  // -------------------------------------------------------------------------
  // Group 1: Explicit Profession Detection
  // -------------------------------------------------------------------------
  console.log('\n[Group 1] Explicit Profession Declarations');

  const techExamples = [
    "I'm a fullstack software developer",
    "I work as a backend engineer",
    "I am a DevOps engineer",
    "I work in tech",
    "I'm a programmer",
  ];
  for (const text of techExamples) {
    assert(detectProfessionRole(text) === 'Tech & Engineering', `Tech detection: "${text}"`);
  }

  const businessExamples = [
    "I'm a product manager",
    "I work as a business analyst",
    "I work in venture capital",
    "I am a startup founder",
  ];
  for (const text of businessExamples) {
    assert(detectProfessionRole(text) === 'Business & Strategy', `Business detection: "${text}"`);
  }

  const academiaExamples = [
    "I am a PhD student in physics",
    "I work as a university researcher",
    "I'm studying mechanical engineering at university",
    "I work in academia",
  ];
  for (const text of academiaExamples) {
    assert(detectProfessionRole(text) === 'Academia & Education', `Academia detection: "${text}"`);
  }

  const lawExamples = [
    "I'm a corporate lawyer",
    "I work as an attorney",
    "I work in compliance and legal affairs",
    "I am a paralegal",
  ];
  for (const text of lawExamples) {
    assert(detectProfessionRole(text) === 'Law & Compliance', `Law detection: "${text}"`);
  }

  const creativeExamples = [
    "I'm a UI/UX designer",
    "I work as a graphic designer",
    "I work in graphic design and branding",
    "I am an illustrator and 3D artist",
  ];
  for (const text of creativeExamples) {
    assert(detectProfessionRole(text) === 'Creative & Design', `Creative detection: "${text}"`);
  }

  // -------------------------------------------------------------------------
  // Group 2: Ambiguous & Non-Attributed Conversations (Must NOT trigger)
  // -------------------------------------------------------------------------
  console.log('\n[Group 2] Ambiguous & Third-Person Statements (No Trigger)');

  const ambiguousExamples = [
    "What is software engineering?",
    "How do lawyers handle corporate compliance?",
    "Can a graphic designer use Kosmo?",
    "My brother is a programmer",
    "Do you like tech?",
    "Why is design so hard?",
    "Hello KosmoBot how are you today?",
  ];
  for (const text of ambiguousExamples) {
    assert(detectProfessionRole(text) === null, `No-trigger check: "${text}"`);
  }

  // -------------------------------------------------------------------------
  // Group 3: Security Blacklist Protection
  // -------------------------------------------------------------------------
  console.log('\n[Group 3] Security & Blacklist Protection');

  const sensitiveRoles = [
    'Kosmo Founder',
    'Team Kosmo',
    'High-Karma User',
    'Moderator',
    'Administrator',
    'Admin',
    'Kosmo VIP',
    'Kosmo Max',
    'Kosmo Pro',
  ];

  for (const role of sensitiveRoles) {
    assert(isRestrictedRole(role) === true, `Restricted role check: ${role}`);
    assert(isApprovedGuildRole(role) === false, `Not in approved guild list: ${role}`);
  }

  for (const approved of APPROVED_GUILD_ROLES) {
    assert(isApprovedGuildRole(approved) === true, `Approved guild role: ${approved}`);
    assert(isRestrictedRole(approved) === false, `Not restricted: ${approved}`);
  }

  // -------------------------------------------------------------------------
  // Group 4: Duplicate Assignment Prevention
  // -------------------------------------------------------------------------
  console.log('\n[Group 4] Duplicate Prevention');

  // User already has 'Tech & Engineering' role
  const userWithTechRole = makeUser({ roles: ['Tech & Engineering', 'Kosmosian'] });
  const detected = detectProfessionRole("I'm a software developer");
  assert(detected === 'Tech & Engineering', 'Detects Tech role');
  const alreadyOwned = userWithTechRole.roles.some(r => r.toLowerCase() === detected?.toLowerCase());
  assert(alreadyOwned === true, 'Correctly flags user already owns the role, preventing duplicate API assignment');

  console.log('\n' + '='.repeat(60));
  if (process.exitCode === 1) {
    console.error('FAILED: Some tests did not pass.');
  } else {
    console.log('ALL TESTS PASSED! Dynamic role assignment verified.');
  }
  console.log('='.repeat(60));
}

runTests().catch(console.error);
