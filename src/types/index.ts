/**
 * Core interface definitions and contracts for Kosmo Discord Agent.
 * Shared between feature/platform (Discord Bot Gateway & Actions) 
 * and feature/agent-logic (LLM Orchestration, Persona & Rate Limiting).
 */

export interface AgentMessage {
  id: string;
  authorId: string;
  authorUsername: string;
  isBot: boolean;
  content: string;
  createdAt: Date;
}

export interface UserContext {
  id: string;
  username: string;
  roles: string[];
  isFounder?: boolean;
}

export interface AgentContext {
  user: UserContext;
  channelId: string;
  channelName: string;
  guildId?: string;
  currentMessage: string;
  history: AgentMessage[];
}

export type ActionType = 'ASSIGN_ROLE' | 'REMOVE_ROLE' | 'SEND_DM' | 'DELETE_MESSAGE' | 'CREATE_THREAD';

export interface AgentAction {
  type: ActionType;
  targetUserId?: string;
  payload: Record<string, any>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  rejectionMessage?: string;
}

export interface AgentResponse {
  text: string;
  actions?: AgentAction[];
  rateLimited?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Contract implemented by the Agent Logic module (feature/agent-logic)
 * and consumed by the Platform module (feature/platform).
 */
export interface IKosmoAgent {
  /**
   * Evaluates whether a user is allowed to send a message based on tier & role quota.
   */
  checkRateLimit(user: UserContext): RateLimitResult;

  /**
   * Main LLM execution entry point: Processes context, history, generates persona reply,
   * and parses dynamic role actions.
   */
  processMessage(context: AgentContext): Promise<AgentResponse>;

  /**
   * Optional hook for proactive greetings or channel icebreakers (e.g. #introductions).
   */
  generateIcebreaker(user: UserContext, channelName: string): Promise<AgentResponse>;
}

/**
 * Contract implemented by the Platform module (feature/platform)
 * to interact with Discord Gateway and Guild APIs.
 */
export interface IKosmoPlatform {
  /**
   * Starts the Discord bot client.
   */
  start(): Promise<void>;

  /**
   * Stops the Discord bot client.
   */
  stop(): Promise<void>;

  /**
   * Executes the /build_infrastructure routine (roles, categories, channels, permissions).
   */
  buildInfrastructure(guildId: string): Promise<InfrastructureBuildReport>;

  /**
   * Assigns a role to a guild member.
   */
  assignRole(guildId: string, userId: string, roleName: string): Promise<boolean>;

  /**
   * Fetches recent message history from a channel for LLM context.
   */
  fetchChannelHistory(channelId: string, limit?: number): Promise<AgentMessage[]>;
}

export interface InfrastructureBuildReport {
  success: boolean;
  rolesCreated: string[];
  categoriesCreated: string[];
  channelsCreated: string[];
  errors: string[];
}
