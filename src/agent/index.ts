import {
  IKosmoAgent,
  AgentContext,
  AgentResponse,
  AgentMessage,
  UserContext,
  RateLimitResult,
} from '../types';
import { SYSTEM_PROMPT } from './systemPrompt';
import { checkRateLimit as _checkRateLimit } from './rateLimit';

// ---------------------------------------------------------------------------
// LLM API types (OpenAI-compatible chat completions)
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LLM_MODEL    = process.env.LLM_MODEL    ?? 'gemini-3.6-flash';
const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai';

/** Maximum number of history messages sent to the LLM (oldest-first window). */
const HISTORY_WINDOW = 20;

// ---------------------------------------------------------------------------
// KosmoAgent
// ---------------------------------------------------------------------------

/**
 * Production implementation of IKosmoAgent.
 *
 * Scope: src/agent/ only.
 * - processMessage: calls Grok/xAI via OpenAI-compatible chat completions.
 * - checkRateLimit: in-memory sliding-window rate limiter (see rateLimit.ts).
 * - generateIcebreaker: stub (out of scope for this build).
 */
export class KosmoAgent implements IKosmoAgent {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.LLM_API_KEY;
    if (!key) {
      throw new Error(
        'KosmoAgent: LLM_API_KEY environment variable is not set. ' +
        'Add it to your .env file before starting the bot.'
      );
    }
    this.apiKey = key;
  }

  // -------------------------------------------------------------------------
  // processMessage
  // -------------------------------------------------------------------------

  async processMessage(context: AgentContext): Promise<AgentResponse> {
    const messages = this.buildMessages(context);

    const body: ChatCompletionRequest = {
      model: LLM_MODEL,
      messages,
      max_tokens: 512,
      temperature: 0.7,
    };

    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(unreadable body)');
      throw new Error(
        `KosmoAgent: LLM API request failed [${response.status} ${response.statusText}]: ${errorText}`
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error('KosmoAgent: LLM returned an empty response.');
    }

    return {
      text,
      actions: [],
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Builds the ordered chat-completions message array:
   *   [system] + [history window (oldest first)] + [current user message]
   *
   * Bot messages map to the `assistant` role; human messages to `user`.
   */
  private buildMessages(context: AgentContext): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Apply the rolling history window (oldest first, drop excess from the front)
    const historyWindow: AgentMessage[] = context.history.slice(-HISTORY_WINDOW);

    for (const msg of historyWindow) {
      messages.push({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.isBot
          ? msg.content
          : `${msg.authorUsername}: ${msg.content}`,
      });
    }

    // The live triggering message
    messages.push({
      role: 'user',
      content: `${context.user.username}: ${context.currentMessage}`,
    });

    return messages;
  }

  // -------------------------------------------------------------------------
  // Rate limiting (delegates to rateLimit.ts)
  // -------------------------------------------------------------------------

  checkRateLimit(user: UserContext): RateLimitResult {
    return _checkRateLimit(user);
  }

  // -------------------------------------------------------------------------
  // generateIcebreaker -- hardcoded welcome, no LLM call
  // -------------------------------------------------------------------------

  async generateIcebreaker(user: UserContext, channelName: string): Promise<AgentResponse> {
    // Icebreaker MUST operate only in #introductions.
    // All other channels (e.g. #general-chat) must produce NO icebreaker.
    const normalizedChannel = channelName.toLowerCase().replace(/^[#-]/, '');
    const isIntroductions = normalizedChannel === 'introductions' || normalizedChannel === 'introduction' || normalizedChannel === 'intro';

    if (!isIntroductions) {
      return { text: '', actions: [] };
    }

    const text = [
      `${user.username}. Welcome to the server.`,
      `Kosmo is an intent compiler, not a chatbot platform. ` +
      `So skip the pleasantries and tell us one thing: ` +
      `what problem are you actually trying to solve?`,
    ].join('\n\n');

    return { text, actions: [] };
  }
}

// ---------------------------------------------------------------------------
// Singleton export consumed by the platform layer
// ---------------------------------------------------------------------------

export const kosmoAgent = new KosmoAgent();
