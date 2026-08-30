import { 
  IKosmoAgent, 
  AgentContext, 
  AgentResponse, 
  UserContext, 
  RateLimitResult 
} from '../types';

/**
 * Stub implementation of IKosmoAgent.
 * feature/agent-logic will implement the full LLM client, rate limiter,
 * system prompt injection, and response parsing.
 */
export class KosmoAgentStub implements IKosmoAgent {
  checkRateLimit(user: UserContext): RateLimitResult {
    // Stub default: allow with default limit
    return {
      allowed: true,
      remaining: 5,
      limit: 5,
      resetAt: new Date(Date.now() + 3600000)
    };
  }

  async processMessage(context: AgentContext): Promise<AgentResponse> {
    return {
      text: `[KosmoBot Stub] Echoing intent from @${context.user.username}: ${context.currentMessage}`,
      actions: []
    };
  }

  async generateIcebreaker(user: UserContext, channelName: string): Promise<AgentResponse> {
    return {
      text: `Welcome @${user.username} to #${channelName}. What are you currently trying to compile?`,
      actions: []
    };
  }
}

export const agentStub = new KosmoAgentStub();
