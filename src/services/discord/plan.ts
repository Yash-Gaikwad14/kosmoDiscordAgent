import { DiscordAction, Plan, RiskLevel, PlanStatus } from './types';
import { PermissionValidator } from './permissionValidator';

/**
 * Utility functions for creating, evaluating, and formatting Discord management plans.
 */
export class PlanService {
  /**
   * Calculates overall risk level for an array of Discord actions.
   */
  public static calculateRiskLevel(actions: DiscordAction[]): {
    riskLevel: RiskLevel;
    blockedReasons: string[];
  } {
    const validation = PermissionValidator.validateActions(actions);
    if (validation.blocked) {
      return {
        riskLevel: 'BLOCKED',
        blockedReasons: validation.blockedReasons || ['Action is blocked by safety policy.'],
      };
    }

    let highestRisk: RiskLevel = 'LOW';

    for (const action of actions) {
      switch (action.type) {
        case 'DELETE_CHANNEL':
        case 'DELETE_ROLE':
          return {
            riskLevel: 'BLOCKED',
            blockedReasons: ['Destructive deletion actions are not permitted via Natural Language management.'],
          };

        case 'MODIFY_ROLE_PERMISSIONS':
        case 'APPLY_PERMISSION_TEMPLATE':
          if (highestRisk === 'LOW') highestRisk = 'MEDIUM';
          break;

        case 'UPDATE_CHANNEL_PERMISSIONS':
          if (action.payload.deny && action.payload.deny.includes('ViewChannel')) {
            highestRisk = 'HIGH';
          } else if (highestRisk === 'LOW') {
            highestRisk = 'MEDIUM';
          }
          break;

        case 'ASSIGN_ROLE':
        case 'REMOVE_ROLE':
          if (action.payload.roleName.toLowerCase().includes('mod') || action.payload.roleName.toLowerCase().includes('staff')) {
            highestRisk = 'HIGH';
          } else if (highestRisk === 'LOW') {
            highestRisk = 'MEDIUM';
          }
          break;

        case 'CREATE_ROLE':
        case 'CREATE_CATEGORY':
        case 'CREATE_CHANNEL':
        default:
          break;
      }
    }

    return {
      riskLevel: highestRisk,
      blockedReasons: [],
    };
  }

  /**
   * Builds a Plan object from a list of actions and metadata.
   */
  public static createPlan(
    name: string,
    description: string,
    actions: DiscordAction[],
    createdBy?: string
  ): Plan {
    const { riskLevel, blockedReasons } = this.calculateRiskLevel(actions);

    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      description,
      actions,
      riskLevel,
      blockedReasons: blockedReasons.length > 0 ? blockedReasons : undefined,
      status: (riskLevel === 'BLOCKED' ? 'REJECTED' : 'PROPOSED') as PlanStatus,
      createdAt: new Date(),
      createdBy,
    };
  }

  /**
   * Formats a plan into human-readable text for Discord Embeds or markdown preview.
   */
  public static formatPlanSummary(plan: Plan): string {
    const lines: string[] = [];
    lines.push(`📋 **Plan: ${plan.name}** (ID: \`${plan.id}\`)`);
    lines.push(`*${plan.description}*`);
    lines.push(`\n**Risk Level:** \`${plan.riskLevel}\` | **Status:** \`${plan.status}\``);

    if (plan.blockedReasons && plan.blockedReasons.length > 0) {
      lines.push(`\n⚠️ **BLOCKED REASONS:**`);
      plan.blockedReasons.forEach((r) => lines.push(`- 🚫 ${r}`));
    }

    lines.push(`\n**Proposed Actions (${plan.actions.length}):**`);
    plan.actions.forEach((act, idx) => {
      lines.push(`${idx + 1}. **[${act.type}]** ${act.description || JSON.stringify(act.payload)}`);
    });

    return lines.join('\n');
  }
}
