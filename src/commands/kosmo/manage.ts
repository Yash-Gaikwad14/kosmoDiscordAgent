import { NLContext, NLPlanResult } from '../../services/discord/types';
import { nlManager } from '../../services/discord/nl_manager';
import { PlanService } from '../../services/discord/plan';

export interface KosmoManageCommandInteraction {
  user: {
    id: string;
    username: string;
  };
  member?: {
    roles: {
      cache: {
        map: (fn: (role: any) => string) => string[];
      };
    };
    permissions?: {
      has: (perm: any) => boolean;
    };
  };
  guildId: string | null;
  channelId: string;
  options: {
    getString: (name: string, required?: boolean) => string | null;
  };
  reply: (options: any) => Promise<any>;
  editReply: (options: any) => Promise<any>;
  deferReply: (options?: any) => Promise<any>;
}

/**
 * Slash command handler for `/kosmo manage <instruction>`
 */
export async function handleKosmoManageCommand(
  interaction: KosmoManageCommandInteraction
): Promise<NLPlanResult> {
  const instruction = interaction.options.getString('instruction', true);

  if (!instruction) {
    await interaction.reply({
      content: '❌ Please provide a natural language instruction to manage Discord.',
      ephemeral: true,
    });
    return {
      success: false,
      explanation: 'No instruction provided.',
      validation: { valid: false, errors: ['No instruction'] },
    };
  }

  // Extract roles
  const roles: string[] = [];
  if (interaction.member?.roles?.cache) {
    try {
      roles.push(...interaction.member.roles.cache.map((r: any) => r.name || r.id));
    } catch {
      // Fallback
    }
  }

  const context: NLContext = {
    userId: interaction.user.id,
    username: interaction.user.username,
    roles,
    guildId: interaction.guildId ?? undefined,
    channelId: interaction.channelId,
  };

  const result = await nlManager.generatePlan(instruction, context);

  if (!result.success || !result.plan) {
    const errorMsg = result.error || result.explanation || 'Failed to generate plan.';
    await interaction.reply({
      content: `❌ **NL Management Request Rejected**\n\n${errorMsg}`,
      ephemeral: true,
    });
    return result;
  }

  // Plan generated successfully (requires human confirmation)
  const formattedSummary = PlanService.formatPlanSummary(result.plan);

  await interaction.reply({
    content: `${formattedSummary}\n\n⚠️ **Human Confirmation Required**: Use \`/kosmo confirm ${result.plan.id}\` to execute, or \`/kosmo cancel ${result.plan.id}\` to abort.`,
    ephemeral: false,
  });

  return result;
}
