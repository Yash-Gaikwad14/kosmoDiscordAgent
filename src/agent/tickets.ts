/**
 * Ticket Tool Integration & AI Level-1 Support
 *
 * Scope: Handles Level-1 automated support inside Discord ticket channels,
 * with automatic escalation for human-required or sensitive topics.
 */

import { UserContext, AgentContext, AgentResponse } from '../types';
import { kosmoAgent } from './index';

// Escalation trigger keywords and patterns
const ESCALATION_PATTERNS = [
  /\b(?:talk|speak|chat)\s+to\s+(?:a\s+)?(?:human|person|staff|team|moderator|admin|representative)\b/i,
  /\b(?:need|want|request)\s+(?:a\s+)?(?:human|staff|person|real person|moderator)\b/i,
  /\b(?:escalate|escalation)\b/i,
  /\b(?:billing|refund|invoice|chargeback|payment issue|credit card|cancel subscription)\b/i,
  /\b(?:ban appeal|appeal|unban|hacked|compromised account|stolen account)\b/i,
  /\b(?:report\s+(?:a\s+)?user|harassment|abuse report)\b/i,
];

const ESCALATION_REPLY =
  "I've flagged this ticket for Team Kosmo. A human staff member will review " +
  "your request and assist you directly as soon as possible.";

/**
 * Determines if a channel name represents a Ticket Tool private channel.
 */
export function isTicketChannel(channelName: string): boolean {
  if (!channelName) return false;
  const lower = channelName.toLowerCase();
  return lower.startsWith('ticket-') || lower.startsWith('ticket_') || lower.startsWith('closed-');
}

/**
 * Checks whether the user's message warrants human escalation.
 */
export function shouldEscalateToHuman(message: string): boolean {
  if (!message) return false;
  return ESCALATION_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Processes a Level-1 support request inside a ticket channel.
 */
export async function processTicketMessage(context: AgentContext): Promise<AgentResponse> {
  // Check if message requires immediate human escalation
  if (shouldEscalateToHuman(context.currentMessage)) {
    return {
      text: ESCALATION_REPLY,
      actions: [],
      metadata: { escalated: true },
    };
  }

  // Otherwise, use KosmoBot LLM to provide Level-1 assistance
  const response = await kosmoAgent.processMessage(context);
  return {
    ...response,
    metadata: { ...response.metadata, level1Support: true },
  };
}
