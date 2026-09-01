/**
 * Manual smoke-test script for src/agent logic.
 *
 * Run: npx ts-node test-agent.ts
 * Requires: LLM_API_KEY set in .env
 * Does NOT require: DISCORD_BOT_TOKEN or a live Discord connection.
 *
 * What to look for in the output:
 *   - No em dashes in any reply
 *   - actions is always []
 *   - Off-topic requests get roasted and redirected to askkosmo.com
 *   - On-topic Kosmo questions get real answers
 *   - #introductions generateIcebreaker reply is the two-paragraph welcome
 *   - Other-channel generateIcebreaker reply is the short challenger line
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { kosmoAgent } from './src/agent';
import { AgentContext, UserContext } from './src/types';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: 'user-001',
    username: 'TestUser',
    roles: [],
    ...overrides,
  };
}

function makeContext(
  currentMessage: string,
  channelName: string,
  userOverrides: Partial<UserContext> = {}
): AgentContext {
  return {
    user: makeUser(userOverrides),
    channelId: 'channel-999',
    channelName,
    guildId: 'guild-123',
    currentMessage,
    history: [],
  };
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const tests: Array<{ label: string; run: () => Promise<void> }> = [

  // ── 1. Normal on-topic Kosmo question ────────────────────────────────────
  {
    label: 'On-topic: What is Kosmo?',
    run: async () => {
      const ctx = makeContext(
        '@KosmoBot what exactly is Kosmo and how is it different from ChatGPT?',
        'general-chat'
      );
      const res = await kosmoAgent.processMessage(ctx);
      console.log('Response:', res.text);
      console.log('Actions: ', res.actions);
    },
  },

  // ── 2. Off-topic: Homework request ───────────────────────────────────────
  {
    label: 'Off-topic: Homework help',
    run: async () => {
      const ctx = makeContext(
        '@KosmoBot can you write my assignment on binary search trees?',
        'general-chat'
      );
      const res = await kosmoAgent.processMessage(ctx);
      console.log('Response:', res.text);
      console.log('Actions: ', res.actions);
    },
  },

  // ── 3. Off-topic: Generic code request ───────────────────────────────────
  {
    label: 'Off-topic: Generic code request',
    run: async () => {
      const ctx = makeContext(
        '@KosmoBot write me a full REST API in Express.js with auth and a database layer',
        'general-chat'
      );
      const res = await kosmoAgent.processMessage(ctx);
      console.log('Response:', res.text);
      console.log('Actions: ', res.actions);
    },
  },

  // ── 4. Off-topic: Translation request ────────────────────────────────────
  {
    label: 'Off-topic: Translation request',
    run: async () => {
      const ctx = makeContext(
        '@KosmoBot please translate my entire product README into Japanese',
        'general-chat'
      );
      const res = await kosmoAgent.processMessage(ctx);
      console.log('Response:', res.text);
      console.log('Actions: ', res.actions);
    },
  },

  // ── 5. generateIcebreaker -- #introductions ───────────────────────────────
  {
    label: 'Icebreaker: #introductions channel',
    run: async () => {
      const user = makeUser({ username: 'NewBuilder' });
      const res = await kosmoAgent.generateIcebreaker(user, 'introductions');
      console.log('Response:', res.text);
      console.log('Actions: ', res.actions);
    },
  },

  // ── 6. generateIcebreaker -- other channel ────────────────────────────────
  {
    label: 'Icebreaker: #general-chat channel',
    run: async () => {
      const user = makeUser({ username: 'NewBuilder' });
      const res = await kosmoAgent.generateIcebreaker(user, 'general-chat');
      console.log('Response:', res.text);
      console.log('Actions: ', res.actions);
    },
  },

];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('KosmoAgent smoke test');
  console.log('='.repeat(60));

  for (const test of tests) {
    console.log('\n' + '-'.repeat(60));
    console.log(`TEST: ${test.label}`);
    console.log('-'.repeat(60));
    try {
      await test.run();
    } catch (err) {
      console.error('ERROR:', err instanceof Error ? err.message : err);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done.');
  console.log('='.repeat(60));
}

main().catch(console.error);
