import { DiscordAction, ValidationResult } from './types';

/**
 * Protected role names that cannot be created, modified, or deleted via NL management.
 */
export const PROTECTED_ROLES = [
  'admin',
  'administrator',
  'owner',
  'founder',
  'moderator',
  'team kosmo',
  'kosmobot',
  'everyone',
  '@everyone',
];

/**
 * Dangerous permissions that must NEVER be granted via NL management.
 */
export const FORBIDDEN_PERMISSIONS = [
  'Administrator',
  'ADMINISTRATOR',
  'ManageGuild',
  'MANAGE_GUILD',
  'KickMembers',
  'KICK_MEMBERS',
  'BanMembers',
  'BAN_MEMBERS',
];

/**
 * Permission validator enforcing Phase 2 and Phase 3 safety constraints.
 */
export class PermissionValidator {
  /**
   * Validates a single action against safety and security policies.
   */
  public static validateAction(action: DiscordAction): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const blockedReasons: string[] = [];
    let blocked = false;

    switch (action.type) {
      case 'DELETE_CHANNEL':
      case 'DELETE_ROLE': {
        blocked = true;
        blockedReasons.push(`Destructive action [${action.type}] is strictly forbidden via Natural Language management.`);
        break;
      }

      case 'CREATE_ROLE': {
        const roleName = action.payload.name.trim().toLowerCase();
        if (PROTECTED_ROLES.includes(roleName)) {
          blocked = true;
          blockedReasons.push(`Creation of privileged/protected role '${action.payload.name}' is strictly blocked.`);
        }

        const permissions = action.payload.permissions || [];
        for (const perm of permissions) {
          if (FORBIDDEN_PERMISSIONS.includes(perm)) {
            blocked = true;
            blockedReasons.push(`Granting forbidden permission '${perm}' in role '${action.payload.name}' is blocked.`);
          }
        }
        break;
      }

      case 'MODIFY_ROLE_PERMISSIONS': {
        const roleName = action.payload.roleName.trim().toLowerCase();
        if (PROTECTED_ROLES.includes(roleName)) {
          blocked = true;
          blockedReasons.push(`Modifying permissions for protected role '${action.payload.roleName}' is strictly blocked.`);
        }

        const permissions = action.payload.permissions || [];
        for (const perm of permissions) {
          if (FORBIDDEN_PERMISSIONS.includes(perm)) {
            blocked = true;
            blockedReasons.push(`Granting forbidden permission '${perm}' in role '${action.payload.roleName}' is blocked.`);
          }
        }
        break;
      }

      case 'APPLY_PERMISSION_TEMPLATE': {
        if (!['read_only', 'moderator_only', 'public_chat', 'announcements', 'private_staff'].includes(action.payload.template)) {
          errors.push(`Invalid permission template: ${action.payload.template}`);
        }
        break;
      }

      case 'UPDATE_CHANNEL_PERMISSIONS': {
        const allows = action.payload.allow || [];
        for (const perm of allows) {
          if (FORBIDDEN_PERMISSIONS.includes(perm)) {
            blocked = true;
            blockedReasons.push(`Granting forbidden permission '${perm}' in channel '${action.payload.channelName}' is blocked.`);
          }
        }
        break;
      }

      case 'ASSIGN_ROLE':
      case 'REMOVE_ROLE': {
        const roleName = action.payload.roleName.trim().toLowerCase();
        if (['admin', 'administrator', 'owner', 'founder'].includes(roleName)) {
          blocked = true;
          blockedReasons.push(`Modifying assignment for ultra-privileged role '${action.payload.roleName}' via NL is blocked.`);
        }
        break;
      }

      case 'CREATE_CATEGORY':
      case 'CREATE_CHANNEL': {
        const overwrites = action.payload.permissionOverwrites || [];
        for (const ow of overwrites) {
          for (const perm of ow.allow || []) {
            if (FORBIDDEN_PERMISSIONS.includes(perm)) {
              blocked = true;
              blockedReasons.push(`Granting forbidden permission '${perm}' in overwrite for '${action.payload.name}' is blocked.`);
            }
          }
        }
        break;
      }

      default:
        warnings.push(`Unrecognized action type: ${(action as any).type}`);
    }

    return {
      valid: errors.length === 0 && !blocked,
      errors,
      warnings,
      blocked,
      blockedReasons: blocked ? blockedReasons : undefined,
    };
  }

  /**
   * Validates an entire list of actions.
   */
  public static validateActions(actions: DiscordAction[]): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allBlockedReasons: string[] = [];
    let isBlocked = false;

    if (!actions || actions.length === 0) {
      return {
        valid: false,
        errors: ['Plan contains no actions.'],
        warnings: [],
        blocked: false,
      };
    }

    for (const action of actions) {
      const res = this.validateAction(action);
      if (res.errors.length > 0) {
        allErrors.push(...res.errors);
      }
      if (res.warnings && res.warnings.length > 0) {
        allWarnings.push(...res.warnings);
      }
      if (res.blocked) {
        isBlocked = true;
        if (res.blockedReasons) {
          allBlockedReasons.push(...res.blockedReasons);
        }
      }
    }

    return {
      valid: allErrors.length === 0 && !isBlocked,
      errors: allErrors,
      warnings: allWarnings,
      blocked: isBlocked,
      blockedReasons: isBlocked ? allBlockedReasons : undefined,
    };
  }
}
