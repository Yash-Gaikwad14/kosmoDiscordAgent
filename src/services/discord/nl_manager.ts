import {
  DiscordAction,
  NLContext,
  NLPlanResult,
  Plan,
} from './types';
import { PermissionValidator } from './permissionValidator';
import { PlanService } from './plan';
import { policyService, IPolicyService } from './policy';

export interface LLMCompletionOptions {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

export type LLMCompletionFn = (options: LLMCompletionOptions) => Promise<string>;

export const NL_SYSTEM_PROMPT = `
You are the Kosmo Discord Infrastructure AI Planner.
Your sole job is to translate natural language administration requests into a strictly structured JSON array of Discord actions.

You MUST output ONLY valid JSON in the following schema:
{
  "planName": "Short descriptive title",
  "explanation": "Brief reasoning of what was planned",
  "actions": [
    {
      "type": "ACTION_TYPE",
      "description": "Human readable action summary",
      "payload": { ... }
    }
  ]
}

Supported Action Types & Payloads:
1. CREATE_CATEGORY: { "name": string, "position"?: number, "permissionOverwrites"?: [...] }
2. CREATE_CHANNEL: { "name": string, "type": "text" | "voice" | "announcement" | "forum", "categoryName"?: string, "topic"?: string, "permissionOverwrites"?: [...] }
3. CREATE_ROLE: { "name": string, "color"?: string, "hoist"?: boolean, "mentionable"?: boolean, "permissions"?: string[] }
4. ASSIGN_ROLE: { "userId": string, "roleName": string }
5. REMOVE_ROLE: { "userId": string, "roleName": string }
6. APPLY_PERMISSION_TEMPLATE: { "channelName": string, "template": "read_only" | "moderator_only" | "public_chat" | "announcements" | "private_staff", "roleName"?: string }
7. UPDATE_CHANNEL_PERMISSIONS: { "channelName": string, "roleName": string, "allow": string[], "deny": string[] }
8. MODIFY_ROLE_PERMISSIONS: { "roleName": string, "permissions": string[] }

STRICT SAFETY RULES:
- NEVER output DELETE_CHANNEL, DELETE_ROLE, or destructive actions.
- NEVER grant "Administrator", "ManageGuild", "KickMembers", or "BanMembers" permissions.
- NEVER create or modify protected roles ("Admin", "Administrator", "Owner", "Founder", "Moderator", "Team Kosmo", "KosmoBot").
- Output pure JSON only. Do not add markdown or conversational filler outside the JSON.
`.trim();

/**
 * Natural Language Manager translating user requests into structured, validated Discord plans.
 */
export class NLManager {
  private llmCaller: LLMCompletionFn;
  private policy: IPolicyService;

  constructor(
    llmCaller?: LLMCompletionFn,
    policy: IPolicyService = policyService
  ) {
    this.policy = policy;
    this.llmCaller = llmCaller || this.defaultLLMCaller.bind(this);
  }

  /**
   * Main entrypoint: generates and validates a structured Plan from natural language input.
   */
  public async generatePlan(
    instruction: string,
    context: NLContext
  ): Promise<NLPlanResult> {
    if (!instruction || instruction.trim().length === 0) {
      return {
        success: false,
        explanation: 'Instruction cannot be empty.',
        validation: { valid: false, errors: ['Instruction is empty'] },
        error: 'Empty instruction provided.',
      };
    }

    // 1. Policy & Authorization Check
    const isAuthorized = this.policy.canExecuteNLManagement({
      id: context.userId,
      username: context.username,
      roles: context.roles,
    });

    if (!isAuthorized) {
      return {
        success: false,
        explanation: 'User is not authorized to execute natural language management.',
        validation: {
          valid: false,
          errors: ['Unauthorized user'],
          blocked: true,
          blockedReasons: ['Caller lacks required management roles (Founder, Team Kosmo, Admin, Moderator).'],
        },
        error: 'Permission denied: Caller is not authorized to use /kosmo manage.',
      };
    }

    // 2. Call LLM for Structured Output
    let rawOutput = '';
    try {
      rawOutput = await this.llmCaller({
        messages: [
          { role: 'system', content: NL_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `User "${context.username}" requested:\n"${instruction.trim()}"\nGuild ID: ${context.guildId ?? 'unknown'}`,
          },
        ],
        temperature: 0.2,
      });
    } catch (err: any) {
      return {
        success: false,
        explanation: 'Failed to communicate with the AI planner service.',
        validation: { valid: false, errors: [err.message || 'LLM error'] },
        error: `LLM invocation failed: ${err.message}`,
      };
    }

    // 3. Parse and Validate JSON output
    let parsed: any;
    try {
      parsed = this.extractAndParseJSON(rawOutput);
    } catch (err: any) {
      return {
        success: false,
        explanation: 'The AI planner returned an unparseable response.',
        validation: { valid: false, errors: ['Invalid JSON output from AI'] },
        rawLLMOutput: rawOutput,
        error: `Failed to parse AI JSON response: ${err.message}`,
      };
    }

    if (!parsed || !Array.isArray(parsed.actions)) {
      return {
        success: false,
        explanation: 'AI response did not contain a valid actions array.',
        validation: { valid: false, errors: ['Missing actions array in AI output'] },
        rawLLMOutput: rawOutput,
        error: 'Malformed plan structure: actions array missing.',
      };
    }

    // 4. Sanitize and Validate Actions
    const rawActions: DiscordAction[] = parsed.actions;
    const validation = PermissionValidator.validateActions(rawActions);

    // 5. Create Plan
    const planName = parsed.planName || `Plan for: ${instruction.substring(0, 30)}...`;
    const explanation = parsed.explanation || 'Plan generated from natural language instruction.';

    const plan: Plan = PlanService.createPlan(
      planName,
      explanation,
      rawActions,
      context.userId
    );

    if (validation.blocked || plan.riskLevel === 'BLOCKED') {
      return {
        success: false,
        plan,
        explanation: `Plan created but BLOCKED due to safety violations: ${(validation.blockedReasons || []).join('; ')}`,
        validation,
        rawLLMOutput: rawOutput,
        error: 'Plan contains blocked or unsafe actions.',
      };
    }

    return {
      success: validation.valid,
      plan,
      explanation,
      validation,
      rawLLMOutput: rawOutput,
    };
  }

  /**
   * Safely extracts JSON from raw LLM output, stripping markdown formatting if present.
   */
  public extractAndParseJSON(raw: string): any {
    let clean = raw.trim();

    // If wrapped in markdown code fence, unwrap it
    if (clean.includes('```')) {
      const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        clean = match[1].trim();
      }
    }

    return JSON.parse(clean);
  }

  /**
   * Default LLM invoker using the configured Gemini/Grok API endpoint.
   */
  private async defaultLLMCaller(options: LLMCompletionOptions): Promise<string> {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new Error('LLM_API_KEY environment variable is not set.');
    }

    const model = options.model ?? process.env.LLM_MODEL ?? 'gemini-3.6-flash';
    const baseUrl = process.env.LLM_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(unreadable body)');
      throw new Error(`LLM API request failed [${response.status} ${response.statusText}]: ${errorText}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }
}

export const nlManager = new NLManager();
